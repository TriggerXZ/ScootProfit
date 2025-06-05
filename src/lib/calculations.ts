
import type { RevenueEntry, DailyTotal, AggregatedTotal, LocationRevenue } from '@/types';
import { NUMBER_OF_MEMBERS, LOCATION_IDS } from './constants';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
  format,
  eachDayOfInterval,
  getMonth,
  getYear,
} from 'date-fns';
import { es } from 'date-fns/locale';


export function calculateDailyTotal(entry: RevenueEntry): DailyTotal {
  const total = LOCATION_IDS.reduce((sum, locId) => sum + (entry.revenues[locId] || 0), 0);
  return {
    date: entry.date,
    total,
    memberShare: total > 0 && NUMBER_OF_MEMBERS > 0 ? total / NUMBER_OF_MEMBERS : 0,
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

export function getWeeklyTotals(entries: RevenueEntry[], date: Date = new Date()): AggregatedTotal[] {
  const weeklyAggregations: { [weekStart: string]: { total: number, entries: RevenueEntry[] } } = {};

  entries.forEach(entry => {
    const entryDate = parseISO(entry.date);
    const weekStartDate = startOfWeek(entryDate, { locale: es });
    const weekStartString = format(weekStartDate, 'yyyy-MM-dd');

    if (!weeklyAggregations[weekStartString]) {
      weeklyAggregations[weekStartString] = { total: 0, entries: [] };
    }
    const dailySum = calculateDailyTotal(entry).total;
    weeklyAggregations[weekStartString].total += dailySum;
    weeklyAggregations[weekStartString].entries.push(entry);
  });
  
  return Object.entries(weeklyAggregations).map(([weekStart, data]) => ({
    period: `Semana del ${format(parseISO(weekStart), 'PPP', { locale: es })}`,
    total: data.total,
    memberShare: data.total > 0 && NUMBER_OF_MEMBERS > 0 ? data.total / NUMBER_OF_MEMBERS : 0,
    entries: data.entries,
  })).sort((a,b) => parseISO(b.entries[0].date).getTime() - parseISO(a.entries[0].date).getTime());
}

export function getMonthlyTotals(entries: RevenueEntry[]): AggregatedTotal[] {
  const monthlyAggregations: { [monthStart: string]: { total: number, entries: RevenueEntry[] } } = {};

  entries.forEach(entry => {
    const entryDate = parseISO(entry.date);
    const monthStartDate = startOfMonth(entryDate);
    const monthStartString = format(monthStartDate, 'yyyy-MM'); // Use YYYY-MM for grouping

    if (!monthlyAggregations[monthStartString]) {
      monthlyAggregations[monthStartString] = { total: 0, entries: [] };
    }
    const dailySum = calculateDailyTotal(entry).total;
    monthlyAggregations[monthStartString].total += dailySum;
    monthlyAggregations[monthStartString].entries.push(entry);
  });

  return Object.entries(monthlyAggregations).map(([monthStart, data]) => ({
    period: format(parseISO(monthStart + '-01'), 'MMMM yyyy', { locale: es }), // Add day for parsing
    total: data.total,
    memberShare: data.total > 0 && NUMBER_OF_MEMBERS > 0 ? data.total / NUMBER_OF_MEMBERS : 0,
    entries: data.entries,
  })).sort((a,b) => parseISO(b.entries[0].date).getTime() - parseISO(a.entries[0].date).getTime());
}

export function getHistoricalMonthlyDataString(entries: RevenueEntry[]): string {
  const monthlyTotals = getMonthlyTotals(entries); // This already aggregates
  // Sort by period to ensure chronological order for the AI
  // The period string is "Month Year", so we need to parse it back to sort if not already sorted.
  // getMonthlyTotals already sorts descending by date, so we might need to reverse for chronological.
  
  // Let's ensure the AI gets data in chronological order (oldest to newest)
  const sortedMonthlyTotals = [...monthlyTotals].sort((a, b) => {
    // Find the earliest date in each entry list to represent the month's actual timing
    const dateA = a.entries.length > 0 ? parseISO(a.entries.reduce((min, p) => (p.date < min ? p.date : min), a.entries[0].date)) : new Date(0);
    const dateB = b.entries.length > 0 ? parseISO(b.entries.reduce((min, p) => (p.date < min ? p.date : min), b.entries[0].date)) : new Date(0);
    return dateA.getTime() - dateB.getTime();
  });


  return sortedMonthlyTotals
    .map(monthly => `${monthly.period}:${Math.round(monthly.total)}`)
    .join(',');
}
