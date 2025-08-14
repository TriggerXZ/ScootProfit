
import type { RevenueEntry, DailyTotal, AggregatedTotal, LocationRevenue, DeductionsDetail, GroupId, GroupRevenue, Expense } from '@/types';
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
  isWithinInterval,
} from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Retrieves the configured number of members from localStorage,
 * falling back to the default if not set.
 * @returns The number of members.
 */
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
      console.error("Failed to parse settings from localStorage", e);
      return DEFAULT_NUMBER_OF_MEMBERS;
    }
  }
  return DEFAULT_NUMBER_OF_MEMBERS;
}


/**
 * Determines which group was assigned to a specific location on a given date based on the weekly rotation schedule.
 * The rotation shifts every Tuesday.
 * @param locationId The ID of the location.
 * @param date The date for which to determine the group.
 * @returns The ID of the group assigned to the location on that date.
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

/**
 * Calculates the total revenue for a single day and the gross share per member.
 * @param entry The revenue entry for the day.
 * @returns A DailyTotal object with the total revenue and member share.
 */
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

/**
 * Calculates the total revenue for each location over a given period of entries.
 * @param entries An array of revenue entries for the period.
 * @returns A LocationRevenue object with the sum of revenues for each location.
 */
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

/**
 * Core function to calculate aggregated totals for a given period (weekly or monthly).
 * It calculates gross revenue, applies deductions if specified, and determines net shares.
 * @param periodEntries The revenue entries for the period.
 * @param periodExpenses The expense entries for the period.
 * @param periodLabel A string label for the period (e.g., "Semana del...").
 * @param applyDeductionsForThisPeriod A boolean indicating if business costs should be deducted for this period.
 * @returns An AggregatedTotal object with a full financial breakdown.
 */
const calculateAggregatedTotals = (
  periodEntries: RevenueEntry[], 
  periodExpenses: Expense[],
  periodLabel: string,
  applyDeductionsForThisPeriod: boolean
): AggregatedTotal => {
  const totalRevenueInPeriod = periodEntries.reduce((sum, entry) => sum + calculateDailyTotal(entry).total, 0);
  const variableExpensesTotal = periodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const numberOfMembers = getNumberOfMembers();

  // Calculate revenue totals per group for the period
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

  // Calculate total business deductions if they apply to this period
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
  const finalNetProfit = netRevenueToDistribute - variableExpensesTotal;

  const netMemberShare = numberOfMembers > 0 
    ? finalNetProfit / numberOfMembers 
    : 0;


  return {
    period: periodLabel,
    totalRevenueInPeriod,
    grossMemberShare,
    deductionsDetail,
    variableExpensesTotal,
    netRevenueToDistribute,
    finalNetProfit,
    netMemberShare,
    groupRevenueTotals,
    entries: periodEntries,
    expenses: periodExpenses,
  };
};

const getPeriodData = (
  allEntries: RevenueEntry[], 
  allExpenses: Expense[],
  getPeriodKey: (date: Date) => string,
  getPeriodLabel: (date: Date) => string,
  getPeriodInterval: (date: Date) => Interval,
  applyDeductionsLogic: (date: Date) => boolean
): AggregatedTotal[] => {
  const periodAggregations: { [key: string]: { entries: RevenueEntry[], expenses: Expense[] } } = {};

  allEntries.forEach(entry => {
    const entryDate = parseISO(entry.date);
    const periodKey = getPeriodKey(entryDate);
    if (!periodAggregations[periodKey]) {
      periodAggregations[periodKey] = { entries: [], expenses: [] };
    }
    periodAggregations[periodKey].entries.push(entry);
  });
  
  allExpenses.forEach(expense => {
    const expenseDate = parseISO(expense.date);
    const periodKey = getPeriodKey(expenseDate);
     if (periodAggregations[periodKey]) {
        periodAggregations[periodKey].expenses.push(expense);
     }
  });
  
  return Object.keys(periodAggregations).map(periodKey => {
    const periodStartDateObj = parseISO(periodKey);
    const { entries, expenses } = periodAggregations[periodKey];
    const periodLabel = getPeriodLabel(periodStartDateObj);
    const applyDeductions = applyDeductionsLogic(periodStartDateObj);
    
    return calculateAggregatedTotals(entries, expenses, periodLabel, applyDeductions);
  }).sort((a,b) => parseISO(b.entries[0].date).getTime() - parseISO(a.entries[0].date).getTime());
};


/**
 * Aggregates all revenue entries into weekly totals, starting on Tuesdays.
 * Deductions are only applied to the week that contains the first Tuesday of a calendar month.
 * @param entries All revenue entries.
 * @returns An array of AggregatedTotal objects, one for each week.
 */
export function getWeeklyTotals(entries: RevenueEntry[], expenses: Expense[]): AggregatedTotal[] {
  const getPeriodKey = (date: Date) => format(startOfWeek(date, { locale: es, weekStartsOn: 2 }), 'yyyy-MM-dd');
  const getPeriodLabel = (date: Date) => `Semana del ${format(date, 'PPP', { locale: es })}`;
  const getPeriodInterval = (date: Date) => ({ start: date, end: addDays(date, 6) });
  
  const applyDeductionsLogic = (date: Date) => {
    const firstDayOfTheMonthOfThisWeek = startOfMonth(date);
    const dayOfWeekOfFirstDay = getDay(firstDayOfTheMonthOfThisWeek);
    const daysToAddForFirstTuesday = (2 - dayOfWeekOfFirstDay + 7) % 7;
    const firstTuesdayOfThisMonth = addDays(firstDayOfTheMonthOfThisWeek, daysToAddForFirstTuesday);
    return isSameDay(date, firstTuesdayOfThisMonth);
  };
  
  return getPeriodData(entries, expenses, getPeriodKey, getPeriodLabel, getPeriodInterval, applyDeductionsLogic);
}

/**
 * Aggregates all revenue entries into 28-day period totals.
 * This aligns with the 4-week group rotation cycle. Deductions are always applied.
 * @param entries All revenue entries.
 * @returns An array of AggregatedTotal objects, one for each 28-day period.
 */
export function getMonthlyTotals(entries: RevenueEntry[], expenses: Expense[]): AggregatedTotal[] {
  if (entries.length === 0 && expenses.length === 0) return [];
  
  const allDates = [...entries.map(e => e.date), ...expenses.map(e => e.date)];
  if (allDates.length === 0) return [];

  const sortedDates = allDates.map(d => parseISO(d)).sort((a, b) => a.getTime() - b.getTime());
  const firstEntryDate = sortedDates[0];
  
  const firstPeriodStartDate = startOfWeek(firstEntryDate, { locale: es, weekStartsOn: 2 });

  const getPeriodKey = (date: Date) => {
    const diffInDays = Math.floor((date.getTime() - firstPeriodStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const periodIndex = Math.floor(diffInDays / 28);
    const periodStartDate = add(firstPeriodStartDate, { days: periodIndex * 28 });
    return format(periodStartDate, 'yyyy-MM-dd');
  };

  const getPeriodLabel = (date: Date) => {
    const endDate = add(date, { days: 27 });
    return `Periodo del ${format(date, 'd MMM', { locale: es })} al ${format(endDate, 'd MMM yyyy', { locale: es })}`;
  };
  
  const getPeriodInterval = (date: Date) => ({ start: date, end: add(date, { days: 27 }) });

  const applyDeductionsLogic = () => true;

  return getPeriodData(entries, expenses, getPeriodKey, getPeriodLabel, getPeriodInterval, applyDeductionsLogic);
}

/**
 * Generates a string of historical monthly (28-day period) data for the AI prediction model.
 * @param entries All revenue entries.
 * @returns A comma-separated string of period and total revenue pairs.
 */
export function getHistoricalMonthlyDataString(entries: RevenueEntry[], expenses: Expense[]): string {
  const monthlyTotals = getMonthlyTotals(entries, expenses); 
  
  const sortedMonthlyTotals = [...monthlyTotals].sort((a, b) => {
    const dateA = a.entries.length > 0 ? parseISO(a.entries.reduce((min, p) => (p.date < min ? p.date : min), a.entries[0].date)) : new Date(0);
    const dateB = b.entries.length > 0 ? parseISO(b.entries.reduce((min, p) => (p.date < min ? p.date : min), b.entries[0].date)) : new Date(0);
    return dateA.getTime() - dateB.getTime();
  });

  return sortedMonthlyTotals
    .map(monthly => `${monthly.period}:${Math.round(monthly.totalRevenueInPeriod)}`)
    .join(',');
}
