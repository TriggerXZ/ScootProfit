
import type { RevenueEntry, DailyTotal, AggregatedTotal, LocationRevenue, DeductionsDetail } from '@/types';
import { 
  NUMBER_OF_MEMBERS, 
  LOCATION_IDS, 
  LocationId,
  DEDUCTION_ZONA_SEGURA,
  DEDUCTION_ARRIENDO,
  DEDUCTION_APORTE_COOPERATIVA
} from './constants';
import {
  startOfWeek,
  startOfMonth,
  parseISO,
  format,
} from 'date-fns';
import { es } from 'date-fns/locale';


export function calculateDailyTotal(entry: RevenueEntry): DailyTotal {
  const total = LOCATION_IDS.reduce((sum, locId) => sum + (entry.revenues[locId] || 0), 0);
  return {
    date: entry.date,
    total,
    // This memberShare at daily level is a gross calculation based on that day's income
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

const calculateAggregatedTotals = (
  periodEntries: RevenueEntry[], 
  periodLabel: string
): AggregatedTotal => {
  const totalRevenueInPeriod = periodEntries.reduce((sum, entry) => sum + calculateDailyTotal(entry).total, 0);

  const grossMemberShare = totalRevenueInPeriod > 0 && NUMBER_OF_MEMBERS > 0 
    ? totalRevenueInPeriod / NUMBER_OF_MEMBERS 
    : 0;

  const deductionsDetail: DeductionsDetail = {
    zonaSegura: DEDUCTION_ZONA_SEGURA,
    arriendo: DEDUCTION_ARRIENDO,
    aporteCooperativa: DEDUCTION_APORTE_COOPERATIVA,
    totalDeductions: DEDUCTION_ZONA_SEGURA + DEDUCTION_ARRIENDO + DEDUCTION_APORTE_COOPERATIVA,
  };

  const netRevenueToDistribute = totalRevenueInPeriod - deductionsDetail.totalDeductions;

  const netMemberShare = netRevenueToDistribute > 0 && NUMBER_OF_MEMBERS > 0 
    ? netRevenueToDistribute / NUMBER_OF_MEMBERS 
    : 0;

  return {
    period: periodLabel,
    totalRevenueInPeriod,
    grossMemberShare,
    deductionsDetail,
    netRevenueToDistribute,
    netMemberShare,
    entries: periodEntries,
  };
};

export function getWeeklyTotals(entries: RevenueEntry[]): AggregatedTotal[] {
  const weeklyAggregations: { [weekStart: string]: RevenueEntry[] } = {};

  entries.forEach(entry => {
    const entryDate = parseISO(entry.date);
    const weekStartDate = startOfWeek(entryDate, { locale: es, weekStartsOn: 2 }); // Tuesday
    const weekStartString = format(weekStartDate, 'yyyy-MM-dd');

    if (!weeklyAggregations[weekStartString]) {
      weeklyAggregations[weekStartString] = [];
    }
    weeklyAggregations[weekStartString].push(entry);
  });
  
  return Object.entries(weeklyAggregations).map(([weekStart, periodEntries]) => {
    const periodLabel = `Semana del ${format(parseISO(weekStart), 'PPP', { locale: es })}`;
    return calculateAggregatedTotals(periodEntries, periodLabel);
  }).sort((a,b) => parseISO(b.entries[0].date).getTime() - parseISO(a.entries[0].date).getTime());
}

export function getMonthlyTotals(entries: RevenueEntry[]): AggregatedTotal[] {
  const monthlyAggregations: { [monthStart: string]: RevenueEntry[] } = {};

  entries.forEach(entry => {
    const entryDate = parseISO(entry.date);
    const monthStartDate = startOfMonth(entryDate);
    const monthStartString = format(monthStartDate, 'yyyy-MM');

    if (!monthlyAggregations[monthStartString]) {
      monthlyAggregations[monthStartString] = [];
    }
    monthlyAggregations[monthStartString].push(entry);
  });

  return Object.entries(monthlyAggregations).map(([monthStart, periodEntries]) => {
    const periodLabel = format(parseISO(monthStart + '-01'), 'MMMM yyyy', { locale: es });
    return calculateAggregatedTotals(periodEntries, periodLabel);
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
