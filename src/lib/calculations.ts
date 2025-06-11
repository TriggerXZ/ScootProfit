
import type { RevenueEntry, DailyTotal, AggregatedTotal, LocationRevenue, DeductionsDetail } from '@/types';
import { 
  NUMBER_OF_MEMBERS, 
  LOCATION_IDS, 
  LocationId,
  DEDUCTION_ZONA_SEGURA_PER_MEMBER,
  DEDUCTION_ARRIENDO_PER_MEMBER,
  DEDUCTION_APORTE_COOPERATIVA_PER_MEMBER
} from './constants';
import {
  startOfWeek,
  startOfMonth,
  parseISO,
  format,
  isSameDay,
  getDay,
  addDays,
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

const calculateAggregatedTotals = (
  periodEntries: RevenueEntry[], 
  periodLabel: string,
  applyDeductionsForThisPeriod: boolean
): AggregatedTotal => {
  const totalRevenueInPeriod = periodEntries.reduce((sum, entry) => sum + calculateDailyTotal(entry).total, 0);

  const grossMemberShare = totalRevenueInPeriod > 0 && NUMBER_OF_MEMBERS > 0 
    ? totalRevenueInPeriod / NUMBER_OF_MEMBERS 
    : 0;

  let deductionsDetail: DeductionsDetail;

  if (applyDeductionsForThisPeriod && NUMBER_OF_MEMBERS > 0) {
    const totalZonaSegura = DEDUCTION_ZONA_SEGURA_PER_MEMBER * NUMBER_OF_MEMBERS;
    const totalArriendo = DEDUCTION_ARRIENDO_PER_MEMBER * NUMBER_OF_MEMBERS;
    const totalAporteCooperativa = DEDUCTION_APORTE_COOPERATIVA_PER_MEMBER * NUMBER_OF_MEMBERS;
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

  const netMemberShare = NUMBER_OF_MEMBERS > 0 
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
    // getDay returns 0 for Sunday, 1 for Monday, ..., 6 for Saturday. We want Tuesday (2).
    const dayOfWeekOfFirstDay = getDay(firstDayOfTheMonthOfThisWeek);
    const daysToAddForFirstTuesday = (2 - dayOfWeekOfFirstDay + 7) % 7;
    const firstTuesdayOfThisMonth = addDays(firstDayOfTheMonthOfThisWeek, daysToAddForFirstTuesday);
    
    const applyDeductionsThisWeek = isSameDay(currentWeekStartDateObj, firstTuesdayOfThisMonth);

    return calculateAggregatedTotals(periodEntries, periodLabel, applyDeductionsThisWeek);
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
    // For monthly reports, deductions are always applied.
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

