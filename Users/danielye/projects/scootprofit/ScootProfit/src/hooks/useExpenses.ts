
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Expense } from '@/types';
import { 
  getExpenses as fetchExpenses, 
  addOrUpdateExpense as saveExpense,
  deleteExpense as removeExpense
} from '@/lib/localStorageStore';

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshExpenses = useCallback(() => {
    setIsLoading(true);
    setExpenses(fetchExpenses());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Initial fetch on client-side
    refreshExpenses();
  }, [refreshExpenses]);


  const addExpense = useCallback((expenseData: Omit<Expense, 'id'>, id?: string) => {
    const expenseToSave: Expense = {
      id: id || new Date().toISOString() + Math.random(), // Use existing id for updates, or generate new for adds
      ...expenseData,
    };
    saveExpense(expenseToSave);
    refreshExpenses();
  }, [refreshExpenses]);

  const deleteExpense = useCallback((id: string) => {
    removeExpense(id);
    refreshExpenses();
  }, [refreshExpenses]);
  

  return {
    expenses,
    isLoading,
    addExpense,
    deleteExpense,
    refreshExpenses,
  };
}
