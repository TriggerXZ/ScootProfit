
import type { RevenueEntry, DailyTotal, AggregatedTotal, LocationRevenue, DeductionsDetail, GroupId, GroupRevenue, Expense } from '@/types';
import { 
  LOCATION_IDS, 
  LocationId,
  ROTATION_START_DATE,
  INITIAL_ROTATION_ASSIGNMENT,
} from './constants';
import {
  startOfWeek,
  startOfMonth,
  endOfMonth,
  parseISO,
  format,
  add,
  differenceInCalendarDays,
  isWithinInterval,
  differenceInMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import type { AppSettings } from '@/hooks/useSettings';


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

export function calculateDailyTotal(entry: RevenueEntry, settings: AppSettings): DailyTotal {
  const total = LOCATION_IDS.reduce((sum, locId) => sum + (entry.revenues[locId] || 0), 0);
  const { numberOfMembers } = settings;
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
  applyDeductionsForThisPeriod: boolean,
  periodExpenses: Expense[],
  periodInterval: Interval,
  settings: AppSettings,
  totalMonths: number = 1,
): AggregatedTotal => {
  const { 
    numberOfMembers, 
    zonaSeguraDeduction, 
    arriendoDeduction, 
    cooperativaDeduction 
  } = settings;

  const totalRevenueInPeriod = periodEntries.reduce((sum, entry) => sum + calculateDailyTotal(entry, settings).total, 0);

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
    // For historical view, scale deductions by number of months
    const totalZonaSegura = (zonaSeguraDeduction * numberOfMembers) * totalMonths;
    const totalArriendo = (arriendoDeduction * numberOfMembers) * totalMonths;
    const totalAporteCooperativa = (cooperativaDeduction * numberOfMembers) * totalMonths;
    deductionsDetail = {
      zonaSegura: totalZonaSegura,
      arriendo: totalArriendo,
      aporteCooperativa: totalAporteCooperativa,
      totalDeductions: totalZonaSegura + totalArriendo + totalAporteCooperativa,
    };
  }

  const netRevenueToDistribute = totalRevenueInPeriod - deductionsDetail.totalDeductions;
  
  const relevantExpenses = periodExpenses.filter(expense => isWithinInterval(parseISO(expense.date), periodInterval));
  const totalVariableExpenses = relevantExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const finalNetProfit = netRevenueToDistribute - totalVariableExpenses;
  const netMemberShare = numberOfMembers > 0 ? finalNetProfit / numberOfMembers : 0;

  return {
    period: periodLabel,
    totalRevenueInPeriod,
    grossMemberShare,
    deductionsDetail,
    netRevenueToDistribute,
    totalVariableExpenses,
    finalNetProfit,
    netMemberShare,
    groupRevenueTotals,
    entries: periodEntries,
    numberOfMembers,
  };
};

const getPeriodData = (
  allEntries: RevenueEntry[], 
  allExpenses: Expense[],
  settings: AppSettings,
  getPeriodKeyAndInterval: (date: Date) => { key: string, interval: Interval },
  getPeriodLabel: (date: Date) => string,
  applyDeductionsLogic: (date: Date, entries: RevenueEntry[]) => boolean
): AggregatedTotal[] => {
  if (allEntries.length === 0) return [];

  const periodAggregations: { [key: string]: RevenueEntry[] } = {};

  allEntries.forEach(entry => {
    const entryDate = parseISO(entry.date);
    const { key } = getPeriodKeyAndInterval(entryDate);
    if (!periodAggregations[key]) {
      periodAggregations[key] = [];
    }
    periodAggregations[key].push(entry);
  });
  
  return Object.keys(periodAggregations).map(periodKey => {
    const periodEntries = periodAggregations[periodKey];
    const periodStartDateObj = parseISO(periodKey);
    const { interval } = getPeriodKeyAndInterval(periodStartDateObj);
    const periodLabel = getPeriodLabel(periodStartDateObj);
    const applyDeductions = applyDeductionsLogic(periodStartDateObj, periodEntries);
    
    return calculateAggregatedTotals(periodEntries, periodLabel, applyDeductions, allExpenses, interval, settings);
  }).sort((a,b) => parseISO(b.entries[0].date).getTime() - parseISO(a.entries[0].date).getTime());
};

export function getWeeklyTotals(entries: RevenueEntry[], expenses: Expense[], settings: AppSettings): AggregatedTotal[] {
  const rotationStartDate = startOfWeek(parseISO(ROTATION_START_DATE), { weekStartsOn: 2 });
  
  const getPeriodKeyAndInterval = (date: Date) => {
    const start = startOfWeek(date, { weekStartsOn: 2 });
    return {
        key: format(start, 'yyyy-MM-dd'),
        interval: { start, end: add(start, { days: 6 }) }
    };
  };

  const getPeriodLabel = (date: Date) => `Semana del ${format(date, 'PPP', { locale: es })}`;
  
  const applyDeductionsLogic = (periodStartDate: Date): boolean => {
    const daysDiff = differenceInCalendarDays(periodStartDate, rotationStartDate);
    const weekIndex = Math.round(daysDiff / 7);
    return (weekIndex + 1) % 4 === 0;
  };
  
  return getPeriodData(entries, expenses, settings, getPeriodKeyAndInterval, getPeriodLabel, applyDeductionsLogic);
}

export function get28DayTotals(entries: RevenueEntry[], expenses: Expense[], settings: AppSettings): AggregatedTotal[] {
  const rotationStartDate = startOfWeek(parseISO(ROTATION_START_DATE), { weekStartsOn: 2 });

  const getPeriodKeyAndInterval = (date: Date) => {
    const diffInDays = differenceInCalendarDays(date, rotationStartDate);
    const periodIndex = Math.floor(diffInDays / 28);
    const start = add(rotationStartDate, { days: periodIndex * 28 });
    return {
        key: format(start, 'yyyy-MM-dd'),
        interval: { start, end: add(start, { days: 27 }) }
    };
  };

  const getPeriodLabel = (date: Date) => {
    const endDate = add(date, { days: 27 });
    return `Periodo del ${format(date, 'd MMM', { locale: es })} al ${format(endDate, 'd MMM yyyy', { locale: es })}`;
  };
  
  return getPeriodData(entries, expenses, settings, getPeriodKeyAndInterval, getPeriodLabel, () => true);
}

export function getCalendarMonthlyTotals(entries: RevenueEntry[], expenses: Expense[], settings: AppSettings): AggregatedTotal[] {
  const getPeriodKeyAndInterval = (date: Date) => {
    const start = startOfMonth(date);
    return {
        key: format(start, 'yyyy-MM-dd'),
        interval: { start, end: endOfMonth(start) }
    };
  };

  const getPeriodLabel = (date: Date) => `Mes de ${format(date, 'MMMM yyyy', { locale: es })}`;
  
  return getPeriodData(entries, expenses, settings, getPeriodKeyAndInterval, getPeriodLabel, () => true);
}

export function getAllTimeTotal(entries: RevenueEntry[], expenses: Expense[], settings: AppSettings): AggregatedTotal | null {
  if (entries.length === 0) return null;

  const sortedEntries = [...entries].sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  const firstDate = parseISO(sortedEntries[0].date);
  const lastDate = parseISO(sortedEntries[sortedEntries.length - 1].date);
  
  const interval = { start: firstDate, end: lastDate };
  const periodLabel = `Histórico (${format(firstDate, 'd MMM yyyy', {locale: es})} - ${format(lastDate, 'd MMM yyyy', {locale: es})})`;

  // Calculate total months for scaling fixed deductions
  const totalMonths = differenceInMonths(lastDate, firstDate) + 1;

  return calculateAggregatedTotals(entries, periodLabel, true, expenses, interval, settings, totalMonths);
}


export function getHistoricalMonthlyDataString(entries: RevenueEntry[], settings: AppSettings): string {
  const monthlyTotals = get28DayTotals(entries, [], settings); 
  
  const sortedMonthlyTotals = [...monthlyTotals].sort((a, b) => {
    const dateA = a.entries.length > 0 ? parseISO(a.entries[0].date) : new Date(0);
    const dateB = b.entries.length > 0 ? parseISO(b.entries[0].date) : new Date(0);
    return dateA.getTime() - dateB.getTime();
  });

  return sortedMonthlyTotals
    .map(monthly => `${monthly.period}:${Math.round(monthly.totalRevenueInPeriod)}`)
    .join(',');
}
