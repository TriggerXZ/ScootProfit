
import type { RevenueEntry, DailyTotal, AggregatedTotal, LocationRevenue, DeductionsDetail, GroupId, GroupRevenue } from '@/types';
import { 
  DEFAULT_NUMBER_OF_MEMBERS,
  LOCAL_STORAGE_SETTINGS_KEY,
  LOCATION_IDS, 
  LocationId,
  DEDUCTION_ZONA_SEGURA_PER_MEMBER,
  DEDUCTION_ARRIENDO_PER_MEMBER,
  DEDUCTION_APORTE_COOPERATIVA_PER_MEMBER,
  ROTATION_START_DATE,
  INITIAL_ROTATION_ASSIGNMENT,
  GROUP_IDS,
} from './constants';
import {
  startOfWeek,
  startOfMonth,
  parseISO,
  format,
  isSameDay,
  getDay,
  addDays,
  differenceInWeeks,
  add,
} from 'date-fns';
import { es } from 'date-fns/locale';

function getNumberOfMembers(): number {
  if (typeof window === 'undefined') {
    return DEFAULT_NUMBER_OF_MEMBERS;
  }
  const storedSettings = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
  if (storedSettings) {
    try {
      const parsed = JSON.parse(storedSettings);
      if (parsed.numberOfMembers && typeof parsed.numberOfMembers === 'number' && parsed.numberOfMembers > 0) {
        return parsed.numberOfMembers;
      }
    } catch (e) {
      return DEFAULT_NUMBER_OF_MEMBERS;
    }
  }
  return DEFAULT_NUMBER_OF_MEMBERS;
}


/**
 * Determines which group was assigned to a specific location on a given date.
 */
export function getGroupForLocationOnDate(locationId: LocationId, date: Date): GroupId {
  const rotationStartDate = parseISO(ROTATION_START_DATE);
  // Weeks are calculated starting on Tuesday, to match the business week.
  const weeksSinceRotationStart = differenceInWeeks(date, rotationStartDate, { weekStartsOn: 2 });
  const locationIndex = LOCATION_IDS.indexOf(locationId);
  const numberOfGroups = INITIAL_ROTATION_ASSIGNMENT.length;
  
  // The shift for the given location is its initial index plus the number of weeks passed.
  const shiftedIndex = (locationIndex + weeksSinceRotationStart) % numberOfGroups;

  // The group at that shifted position in the initial assignment is the current group.
  return INITIAL_ROTATION_ASSIGNMENT[shiftedIndex];
}

export function calculateDailyTotal(entry: RevenueEntry): DailyTotal {
  const total = LOCATION_IDS.reduce((sum, locId) => sum + (entry.revenues[locId] || 0), 0);
  const numberOfMembers = getNumberOfMembers();
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


export function getEntriesForDate(entries: RevenueEntry[], date: Date): RevenueEntry[] {
    const dateString = format(date, 'yyyy-MM-dd');
    return entries.filter(entry => entry.date === dateString);
}

const calculateAggregatedTotals = (
  periodEntries: RevenueEntry[], 
  periodLabel: string,
  applyDeductionsForThisPeriod: boolean
): AggregatedTotal => {
  const totalRevenueInPeriod = periodEntries.reduce((sum, entry) => sum + calculateDailyTotal(entry).total, 0);
  const numberOfMembers = getNumberOfMembers();

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

  let deductionsDetail: DeductionsDetail;

  if (applyDeductionsForThisPeriod && numberOfMembers > 0) {
    const totalZonaSegura = DEDUCTION_ZONA_SEGURA_PER_MEMBER * numberOfMembers;
    const totalArriendo = DEDUCTION_ARRIENDO_PER_MEMBER * numberOfMembers;
    const totalAporteCooperativa = DEDUCTION_APORTE_COOPERATIVA_PER_MEMBER * numberOfMembers;
    deductionsDetail = {
      zonaSegura: totalZonaSegura,
      arriendo: totalArriendo,
      aporteCooperativa: totalAporteCooperativa,
      totalDeductions: totalZonaSegura + totalArriendo + totalAporteCooperativa,
    };
  } else {
    deductionsDetail = {
      zonaSegura: 0,
      arriendo: 0,
      aporteCooperativa: 0,
      totalDeductions: 0,
    };
  }

  const netRevenueToDistribute = totalRevenueInPeriod - deductionsDetail.totalDeductions;

  const netMemberShare = numberOfMembers > 0 
    ? netRevenueToDistribute / numberOfMembers 
    : 0;


  return {
    period: periodLabel,
    totalRevenueInPeriod,
    grossMemberShare,
    deductionsDetail,
    netRevenueToDistribute,
    netMemberShare,
    groupRevenueTotals,
    entries: periodEntries,
  };
};

export function getWeeklyTotals(entries: RevenueEntry[]): AggregatedTotal[] {
  const weeklyAggregations: { [weekStart: string]: RevenueEntry[] } = {};

  entries.forEach(entry => {
    const entryDate = parseISO(entry.date);
    const weekStartDateForEntry = startOfWeek(entryDate, { locale: es, weekStartsOn: 2 }); // Tuesday
    const weekStartString = format(weekStartDateForEntry, 'yyyy-MM-dd');

    if (!weeklyAggregations[weekStartString]) {
      weeklyAggregations[weekStartString] = [];
    }
    weeklyAggregations[weekStartString].push(entry);
  });
  
  return Object.entries(weeklyAggregations).map(([weekStart, periodEntries]) => {
    const currentWeekStartDateObj = parseISO(weekStart);
    const periodLabel = `Semana del ${format(currentWeekStartDateObj, 'PPP', { locale: es })}`;
    
    // Determine if this week starts on the first Tuesday of its month
    const firstDayOfTheMonthOfThisWeek = startOfMonth(currentWeekStartDateObj);
    // getDay returns 0 for Sunday, ..., 2 for Tuesday, ..., 6 for Saturday.
    const dayOfWeekOfFirstDay = getDay(firstDayOfTheMonthOfThisWeek);
    const daysToAddForFirstTuesday = (2 - dayOfWeekOfFirstDay + 7) % 7;
    const firstTuesdayOfThisMonth = addDays(firstDayOfTheMonthOfThisWeek, daysToAddForFirstTuesday);
    
    const applyDeductionsThisWeek = isSameDay(currentWeekStartDateObj, firstTuesdayOfThisMonth);

    return calculateAggregatedTotals(periodEntries, periodLabel, applyDeductionsThisWeek);
  }).sort((a,b) => parseISO(b.entries[0].date).getTime() - parseISO(a.entries[0].date).getTime());
}

export function getMonthlyTotals(entries: RevenueEntry[]): AggregatedTotal[] {
  if (entries.length === 0) return [];
  
  const monthlyAggregations: { [periodKey: string]: RevenueEntry[] } = {};
  
  // Sort entries to find the absolute start date
  const sortedEntries = entries.slice().sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  const firstEntryDate = parseISO(sortedEntries[0].date);
  
  // The first 28-day period starts on the first Tuesday on or before the first entry
  const firstPeriodStartDate = startOfWeek(firstEntryDate, { locale: es, weekStartsOn: 2 });

  sortedEntries.forEach(entry => {
    const entryDate = parseISO(entry.date);
    const diffInDays = Math.floor((entryDate.getTime() - firstPeriodStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const periodIndex = Math.floor(diffInDays / 28);
    
    const periodStartDate = add(firstPeriodStartDate, { days: periodIndex * 28 });
    const periodKey = format(periodStartDate, 'yyyy-MM-dd');

    if (!monthlyAggregations[periodKey]) {
      monthlyAggregations[periodKey] = [];
    }
    monthlyAggregations[periodKey].push(entry);
  });

  return Object.entries(monthlyAggregations).map(([periodStart, periodEntries]) => {
    const startDate = parseISO(periodStart);
    const endDate = add(startDate, { days: 27 });
    const periodLabel = `Periodo del ${format(startDate, 'd MMM', { locale: es })} al ${format(endDate, 'd MMM yyyy', { locale: es })}`;
    
    return calculateAggregatedTotals(periodEntries, periodLabel, true);
  }).sort((a,b) => parseISO(b.entries[0].date).getTime() - parseISO(a.entries[0].date).getTime());
}

export function getHistoricalMonthlyDataString(entries: RevenueEntry[]): string {
  const monthlyTotals = getMonthlyTotals(entries); 
  
  const sortedMonthlyTotals = [...monthlyTotals].sort((a, b) => {
    const dateA = a.entries.length > 0 ? parseISO(a.entries.reduce((min, p) => (p.date < min ? p.date : min), a.entries[0].date)) : new Date(0);
    const dateB = b.entries.length > 0 ? parseISO(b.entries.reduce((min, p) => (p.date < min ? p.date : min), b.entries[0].date)) : new Date(0);
    return dateA.getTime() - dateB.getTime();
  });

  return sortedMonthlyTotals
    .map(monthly => `${monthly.period}:${Math.round(monthly.totalRevenueInPeriod)}`)
    .join(',');
}
