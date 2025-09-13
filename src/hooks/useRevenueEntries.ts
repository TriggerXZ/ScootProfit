
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { RevenueEntry, AggregatedTotal, LocationRevenueInput } from '@/types';
import { 
  getRevenueEntries as fetchEntries, 
  addOrUpdateRevenueEntry as saveEntry,
  getRevenueEntryById as fetchEntryById,
  deleteRevenueEntry as removeEntry,
} from '@/lib/localStorageStore';
import { 
  calculateDailyTotal, 
  getWeeklyTotals, 
  get28DayTotals,
  getCalendarMonthlyTotals,
} from '@/lib/calculations';
import { LOCATION_IDS, LocationId } from '@/lib/constants';
import { format } from 'date-fns';

export function useRevenueEntries() {
  const [entries, setEntries] = useState<RevenueEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshEntries = useCallback(() => {
    setIsLoading(true);
    setEntries(fetchEntries());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshEntries();
  }, [refreshEntries]);


  const addEntry = useCallback((date: string, revenuesInput: LocationRevenueInput) => {
    const revenues = LOCATION_IDS.reduce((acc, locId) => {
      const parsedValue = parseFloat(revenuesInput[locId as LocationId]);
      acc[locId as LocationId] = isNaN(parsedValue) ? 0 : parsedValue;
      return acc;
    }, {} as Record<LocationId, number>);

    const newEntry: RevenueEntry = {
      id: date, // Using date as ID
      date,
      revenues: revenues as any, // Type assertion after construction
    };
    saveEntry(newEntry);
    refreshEntries();
  }, [refreshEntries]);

  const deleteEntry = useCallback((id: string) => {
    removeEntry(id);
    refreshEntries();
  }, [refreshEntries]);

  const getEntryByDate = useCallback((date: string): RevenueEntry | undefined => {
    return fetchEntryById(date);
  }, []);
  
  const getDailySummary = useCallback((date: Date): AggregatedTotal | null => {
    const dateString = format(date, 'yyyy-MM-dd');
    const entryForDay = entries.find(e => e.date === dateString);
    if (!entryForDay) return null;
    const dailyTotal = calculateDailyTotal(entryForDay);
    // Wrap it in a simple AggregatedTotal-like structure for consistency if needed, or return DailyTotal
    return {
        period: dateString,
        totalRevenueInPeriod: dailyTotal.total,
        grossMemberShare: dailyTotal.memberShare,
        deductionsDetail: { zonaSegura: 0, arriendo: 0, aporteCooperativa: 0, totalDeductions: 0 },
        netRevenueToDistribute: dailyTotal.total,
        netMemberShare: dailyTotal.memberShare,
        groupRevenueTotals: {} as any, // Not calculated for single day summary
        entries: [entryForDay],
        numberOfMembers: 0, // Placeholder
    };
  }, [entries]);

  const allWeeklyTotals = useCallback((): AggregatedTotal[] => {
    return getWeeklyTotals(entries);
  }, [entries]);

  const all28DayTotals = useCallback((): AggregatedTotal[] => {
    return get28DayTotals(entries);
  }, [entries]);

  const allCalendarMonthlyTotals = useCallback((): AggregatedTotal[] => {
    return getCalendarMonthlyTotals(entries);
  }, [entries]);

  return {
    entries,
    isLoading,
    addEntry,
    deleteEntry,
    getEntryByDate,
    getDailySummary,
    allWeeklyTotals,
    all28DayTotals,
    allCalendarMonthlyTotals,
    refreshEntries,
  };
}
