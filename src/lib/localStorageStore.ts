// This file should only be imported and used in Client Components.
import type { RevenueEntry } from '@/types';
import { LOCAL_STORAGE_REVENUE_KEY } from './constants';

export function getRevenueEntries(): RevenueEntry[] {
  if (typeof window === 'undefined') return [];
  const storedEntries = localStorage.getItem(LOCAL_STORAGE_REVENUE_KEY);
  return storedEntries ? JSON.parse(storedEntries) : [];
}

export function saveRevenueEntries(entries: RevenueEntry[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_STORAGE_REVENUE_KEY, JSON.stringify(entries));
}

export function addOrUpdateRevenueEntry(entry: RevenueEntry): void {
  const entries = getRevenueEntries();
  const existingEntryIndex = entries.findIndex(e => e.id === entry.id);
  if (existingEntryIndex > -1) {
    entries[existingEntryIndex] = entry;
  } else {
    entries.push(entry);
  }
  // Sort entries by date descending
  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  saveRevenueEntries(entries);
}

export function getRevenueEntryById(id: string): RevenueEntry | undefined {
  return getRevenueEntries().find(entry => entry.id === id);
}
