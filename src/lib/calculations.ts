
import type { RevenueEntry, DailyTotal, AggregatedTotal, LocationRevenue, DeductionsDetail, GroupId, GroupRevenue } from '@/types';
import { 
  LOCAL_STORAGE_SETTINGS_KEY,
  LOCATION_IDS, 
  LocationId,
  DEFAULT_NUMBER_OF_MEMBERS, 
  DEFAULT_DEDUCTION_ZONA_SEGURA_PER_MEMBER,
  DEFAULT_DEDUCTION_ARRIENDO_PER_MEMBER,
  DEFAULT_DEDUCTION_APORTE_COOPERATIVA_PER_MEMBER,
  ROTATION_START_DATE,
  INITIAL_ROTATION_ASSIGNMENT,
} from './constants';
import {
  startOfWeek,
  startOfMonth,
  parseISO,
  format,
  add,
  differenceInCalendarDays,
} from 'date-fns';
import { es } from 'date-fns/locale';


interface AppSettings {
  numberOfMembers: number;
  zonaSeguraDeduction: number;
  arriendoDeduction: number;
  cooperativaDeduction: number;
}

function getAppSettings(): AppSettings {
  const defaults = {
    numberOfMembers: DEFAULT_NUMBER_OF_MEMBERS,
    zonaSeguraDeduction: DEFAULT_DEDUCTION_ZONA_SEGURA_PER_MEMBER,
    arriendoDeduction: DEFAULT_DEDUCTION_ARRIENDO_PER_MEMBER,
    cooperativaDeduction: DEFAULT_DEDUCTION_APORTE_COOPERATIVA_PER_MEMBER,
  };

  if (typeof window === 'undefined') {
    return defaults;
  }

  const storedSettings = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
  if (storedSettings) {
    try {
      const parsed = JSON.parse(storedSettings);
      return {
        numberOfMembers: parsed.numberOfMembers > 0 ? parsed.numberOfMembers : defaults.numberOfMembers,
        zonaSeguraDeduction: parsed.zonaSeguraDeduction ?? defaults.zonaSeguraDeduction,
        arriendoDeduction: parsed.arriendoDeduction ?? defaults.arriendoDeduction,
        cooperativaDeduction: parsed.cooperativaDeduction ?? defaults.cooperativaDeduction,
      };
    } catch (e) {
      console.error("Failed to parse settings from localStorage", e);
      return defaults;
    }
  }
  return defaults;
}

export function getGroupForLocationOnDate(locationId: LocationId, date: Date): GroupId {
  const rotationStartDate = startOfWeek(parseISO(ROTATION_START_DATE), { weekStartsOn: 2 /* Tuesday */ });
  const targetDateStartOfWeek = startOfWeek(date, { weekStartsOn: 2 /* Tuesday */ });

  const daysDifference = differenceInCalendarDays(targetDateStartOfWeek, rotationStartDate);
  const weeksSinceRotationStart = Math.floor(daysDifference / 7);

  const locationIndex = LOCATION_IDS.indexOf(locationId);
  const numberOfGroups = INITIAL_ROTATION_ASSIGNMENT.length;
  
  const shiftedIndex = (locationIndex + weeksSinceRotationStart) % numberOfGroups;

  return INITIAL_ROTATION_ASSIGNMENT[shiftedIndex];
}

export function calculateDailyTotal(entry: RevenueEntry): DailyTotal {
  const total = LOCATION_IDS.reduce((sum, locId) => sum + (entry.revenues[locId] || 0), 0);
  const { numberOfMembers } = getAppSettings();
  return {
    date: entry.date,
    total,
    memberShare: total > 0 && numberOfMembers > 0 ? total / numberOfMembers : 0,
    locationTotals: entry.revenues,
  };
}

export function calculateLocationTotalsForPeriod(entries: RevenueEntry[]): LocationRevenue {
  const totals: LocationRevenue = { la72: 0, elCubo: 0, parqueDeLasLuces: 0, la78: 0 };
  for (const entry of entries) {
    LOCATION_IDS.forEach(locId => {
      totals[locId] += entry.revenues[locId] || 0;
    });
  }
  return totals;
}

const calculateAggregatedTotals = (
  periodEntries: RevenueEntry[], 
  periodLabel: string,
  applyDeductionsForThisPeriod: boolean
): AggregatedTotal => {
  const { 
    numberOfMembers, 
    zonaSeguraDeduction, 
    arriendoDeduction, 
    cooperativaDeduction 
  } = getAppSettings();

  const totalRevenueInPeriod = periodEntries.reduce((sum, entry) => sum + calculateDailyTotal(entry).total, 0);

  const groupRevenueTotals: GroupRevenue = { grupoCubo: 0, grupoLuces: 0, grupo78: 0, grupo72: 0 };
  periodEntries.forEach(entry => {
    const entryDate = parseISO(entry.date);
    LOCATION_IDS.forEach(locId => {
      const group = getGroupForLocationOnDate(locId, entryDate);
      groupRevenueTotals[group] += entry.revenues[locId] || 0;
    });
  });

  const grossMemberShare = totalRevenueInPeriod > 0 && numberOfMembers > 0 
    ? totalRevenueInPeriod / numberOfMembers 
    : 0;

  let deductionsDetail: DeductionsDetail = { zonaSegura: 0, arriendo: 0, aporteCooperativa: 0, totalDeductions: 0 };

  if (applyDeductionsForThisPeriod && numberOfMembers > 0) {
    const totalZonaSegura = zonaSeguraDeduction * numberOfMembers;
    const totalArriendo = arriendoDeduction * numberOfMembers;
    const totalAporteCooperativa = cooperativaDeduction * numberOfMembers;
    deductionsDetail = {
      zonaSegura: totalZonaSegura,
      arriendo: totalArriendo,
      aporteCooperativa: totalAporteCooperativa,
      totalDeductions: totalZonaSegura + totalArriendo + totalAporteCooperativa,
    };
  }

  const netRevenueToDistribute = totalRevenueInPeriod - deductionsDetail.totalDeductions;
  const netMemberShare = numberOfMembers > 0 ? netRevenueToDistribute / numberOfMembers : 0;

  return {
    period: periodLabel,
    totalRevenueInPeriod,
    grossMemberShare,
    deductionsDetail,
    netRevenueToDistribute,
    netMemberShare,
    groupRevenueTotals,
    entries: periodEntries,
    numberOfMembers,
  };
};

const getPeriodData = (
  allEntries: RevenueEntry[], 
  getPeriodKey: (date: Date) => string,
  getPeriodLabel: (date: Date) => string,
  applyDeductionsLogic: (date: Date, entries: RevenueEntry[]) => boolean
): AggregatedTotal[] => {
  if (allEntries.length === 0) return [];

  const periodAggregations: { [key: string]: RevenueEntry[] } = {};

  allEntries.forEach(entry => {
    const entryDate = parseISO(entry.date);
    const periodKey = getPeriodKey(entryDate);
    if (!periodAggregations[periodKey]) {
      periodAggregations[periodKey] = [];
    }
    periodAggregations[periodKey].push(entry);
  });
  
  return Object.keys(periodAggregations).map(periodKey => {
    const periodEntries = periodAggregations[periodKey];
    const periodStartDateObj = parseISO(periodKey);
    const periodLabel = getPeriodLabel(periodStartDateObj);
    const applyDeductions = applyDeductionsLogic(periodStartDateObj, periodEntries);
    
    return calculateAggregatedTotals(periodEntries, periodLabel, applyDeductions);
  }).sort((a,b) => parseISO(b.entries[0].date).getTime() - parseISO(a.entries[0].date).getTime());
};

export function getWeeklyTotals(entries: RevenueEntry[]): AggregatedTotal[] {
  const rotationStartDate = startOfWeek(parseISO(ROTATION_START_DATE), { weekStartsOn: 2 });
  
  const getPeriodKey = (date: Date) => format(startOfWeek(date, { weekStartsOn: 2 }), 'yyyy-MM-dd');
  const getPeriodLabel = (date: Date) => `Semana del ${format(date, 'PPP', { locale: es })}`;
  
  const applyDeductionsLogic = (periodStartDate: Date): boolean => {
    const daysDiff = differenceInCalendarDays(periodStartDate, rotationStartDate);
    const weekIndex = Math.round(daysDiff / 7);
    return (weekIndex + 1) % 4 === 0;
  };
  
  return getPeriodData(entries, getPeriodKey, getPeriodLabel, applyDeductionsLogic);
}

export function get28DayTotals(entries: RevenueEntry[]): AggregatedTotal[] {
  const rotationStartDate = startOfWeek(parseISO(ROTATION_START_DATE), { weekStartsOn: 2 });

  const getPeriodKey = (date: Date) => {
    const diffInDays = differenceInCalendarDays(date, rotationStartDate);
    const periodIndex = Math.floor(diffInDays / 28);
    const periodStartDate = add(rotationStartDate, { days: periodIndex * 28 });
    return format(periodStartDate, 'yyyy-MM-dd');
  };

  const getPeriodLabel = (date: Date) => {
    const endDate = add(date, { days: 27 });
    return `Periodo del ${format(date, 'd MMM', { locale: es })} al ${format(endDate, 'd MMM yyyy', { locale: es })}`;
  };
  
  return getPeriodData(entries, getPeriodKey, getPeriodLabel, () => true);
}

export function getCalendarMonthlyTotals(entries: RevenueEntry[]): AggregatedTotal[] {
  const getPeriodKey = (date: Date) => format(startOfMonth(date), 'yyyy-MM-dd');
  const getPeriodLabel = (date: Date) => `Mes de ${format(date, 'MMMM yyyy', { locale: es })}`;
  
  return getPeriodData(entries, getPeriodKey, getPeriodLabel, () => true);
}

export function getHistoricalMonthlyDataString(entries: RevenueEntry[]): string {
  const monthlyTotals = get28DayTotals(entries); 
  
  const sortedMonthlyTotals = [...monthlyTotals].sort((a, b) => {
    const dateA = a.entries.length > 0 ? parseISO(a.entries[0].date) : new Date(0);
    const dateB = b.entries.length > 0 ? parseISO(b.entries[0].date) : new Date(0);
    return dateA.getTime() - dateB.getTime();
  });

  return sortedMonthlyTotals
    .map(monthly => `${monthly.period}:${Math.round(monthly.totalRevenueInPeriod)}`)
    .join(',');
}
