
// This file should only be imported and used in Client Components.
import type { RevenueEntry, Expense } from '@/types';
import { LOCAL_STORAGE_REVENUE_KEY, LOCAL_STORAGE_EXPENSE_KEY } from './constants';

// --- Revenue Entries ---

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

export function deleteRevenueEntry(id: string): void {
    let entries = getRevenueEntries();
    entries = entries.filter(entry => entry.id !== id);
    saveRevenueEntries(entries);
}

export function getRevenueEntryById(id: string): RevenueEntry | undefined {
  return getRevenueEntries().find(entry => entry.id === id);
}


// --- Expense Entries ---

export function getExpenses(): Expense[] {
  if (typeof window === 'undefined') return [];
  const storedExpenses = localStorage.getItem(LOCAL_STORAGE_EXPENSE_KEY);
  return storedExpenses ? JSON.parse(storedExpenses) : [];
}

export function saveExpenses(expenses: Expense[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_STORAGE_EXPENSE_KEY, JSON.stringify(expenses));
}

export function addOrUpdateExpense(expense: Expense): void {
  const expenses = getExpenses();
  const existingIndex = expenses.findIndex(e => e.id === expense.id);
  if (existingIndex > -1) {
    expenses[existingIndex] = expense;
  } else {
    expenses.push(expense);
  }
  // Sort expenses by date descending
  expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  saveExpenses(expenses);
}

export function deleteExpense(id: string): void {
  let expenses = getExpenses();
  expenses = expenses.filter(expense => expense.id !== id);
  saveExpenses(expenses);
}

export function getExpenseById(id: string): Expense | undefined {
  return getExpenses().find(expense => expense.id === id);
}
