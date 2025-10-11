
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { RevenueEntry, AggregatedTotal, LocationRevenueInput, Expense } from '@/types';
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
  getAllTimeTotal,
  getHistoricalMonthlyDataString,
} from '@/lib/calculations';
import { LOCATION_IDS, LocationId } from '@/lib/constants';
import { format } from 'date-fns';
import { useSettings } from './useSettings';

export function useRevenueEntries() {
  const [entries, setEntries] = useState<RevenueEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { settings, isLoading: isSettingsLoading } = useSettings();

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
  
  const getDailySummary = useCallback((date: Date): ReturnType<typeof calculateDailyTotal> | null => {
    if (isSettingsLoading) return null;
    const dateString = format(date, 'yyyy-MM-dd');
    const entryForDay = entries.find(e => e.date === dateString);
    if (!entryForDay) return null;
    return calculateDailyTotal(entryForDay, settings);
  }, [entries, settings, isSettingsLoading]);

  const allWeeklyTotals = useCallback((expenses: Expense[] = []): AggregatedTotal[] => {
    if (isSettingsLoading) return [];
    return getWeeklyTotals(entries, expenses, settings);
  }, [entries, settings, isSettingsLoading]);

  const all28DayTotals = useCallback((expenses: Expense[] = []): AggregatedTotal[] => {
     if (isSettingsLoading) return [];
    return get28DayTotals(entries, expenses, settings);
  }, [entries, settings, isSettingsLoading]);

  const allCalendarMonthlyTotals = useCallback((expenses: Expense[] = []): AggregatedTotal[] => {
     if (isSettingsLoading) return [];
    return getCalendarMonthlyTotals(entries, expenses, settings);
  }, [entries, settings, isSettingsLoading]);

  const allTimeTotal = useCallback((expenses: Expense[] = []): AggregatedTotal | null => {
    if (isSettingsLoading || entries.length === 0) return null;
    return getAllTimeTotal(entries, expenses, settings);
  }, [entries, settings, isSettingsLoading]);

  return {
    entries,
    isLoading: isLoading || isSettingsLoading,
    addEntry,
    deleteEntry,
    getEntryByDate,
    getDailySummary,
    allWeeklyTotals,
    all28DayTotals,
    allCalendarMonthlyTotals,
    allTimeTotal,
    refreshEntries,
  };
}
