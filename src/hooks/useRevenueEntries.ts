
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { RevenueEntry, DailyTotal, AggregatedTotal, LocationRevenueInput } from '@/types';
import { 
  getRevenueEntries as fetchEntries, 
  addOrUpdateRevenueEntry as saveEntry,
  getRevenueEntryById as fetchEntryById
} from '@/lib/localStorageStore';
import { 
  calculateDailyTotal, 
  getWeeklyTotals, 
  getMonthlyTotals,
  getEntriesForDate
} from '@/lib/calculations';
import { LOCATION_IDS } from '@/lib/constants';
import { format } from 'date-fns';

export function useRevenueEntries() {
  const [entries, setEntries] = useState<RevenueEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setEntries(fetchEntries());
    setIsLoading(false);
  }, []);

  const refreshEntries = useCallback(() => {
    setEntries(fetchEntries());
  }, []);

  const addEntry = useCallback((date: string, revenuesInput: LocationRevenueInput) => {
    const revenues = LOCATION_IDS.reduce((acc, locId) => {
      acc[locId] = parseFloat(revenuesInput[locId]) || 0;
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

  const getEntryByDate = useCallback((date: string): RevenueEntry | undefined => {
    return fetchEntryById(date);
  }, []);
  
  const getDailySummary = useCallback((date: Date): DailyTotal | null => {
    const dateString = format(date, 'yyyy-MM-dd');
    const entryForDay = entries.find(e => e.date === dateString);
    if (!entryForDay) return null;
    return calculateDailyTotal(entryForDay);
  }, [entries]);

  const allWeeklyTotals = useCallback((): AggregatedTotal[] => {
    return getWeeklyTotals(entries);
  }, [entries]);

  const allMonthlyTotals = useCallback((): AggregatedTotal[] => {
    return getMonthlyTotals(entries);
  }, [entries]);

  return {
    entries,
    isLoading,
    addEntry,
    getEntryByDate,
    getDailySummary,
    allWeeklyTotals,
    allMonthlyTotals,
    refreshEntries,
  };
}
