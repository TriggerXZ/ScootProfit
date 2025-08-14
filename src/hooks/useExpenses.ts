
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
    refreshExpenses();
  }, [refreshExpenses]);


  const addExpense = useCallback((expenseData: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
      id: new Date().toISOString(), // Unique ID
      ...expenseData,
    };
    saveExpense(newExpense);
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
