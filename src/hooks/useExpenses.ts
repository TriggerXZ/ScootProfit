
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Expense } from '@/types';
import { 
  getExpenses as fetchExpenses, 
  addOrUpdateExpense as saveExpense,
  deleteExpense as removeExpense
} from '@/lib/localStorageStore';
import { v4 as uuidv4 } from 'uuid';
import { isWithinInterval, parseISO } from 'date-fns';

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
    // If editing an existing expense, it should already have an ID.
    // This function handles both creating new and updating existing.
    // The form logic will pass the full expense object when editing.
    const expenseToSave = 'id' in expenseData 
      ? (expenseData as Expense)
      : { ...expenseData, id: uuidv4() };

    saveExpense(expenseToSave);
    refreshExpenses();
  }, [refreshExpenses]);

  const deleteExpense = useCallback((id: string) => {
    removeExpense(id);
    refreshExpenses();
  }, [refreshExpenses]);

  const getExpensesForPeriod = useCallback((interval: Interval): Expense[] => {
    return expenses.filter(expense => isWithinInterval(parseISO(expense.date), interval));
  }, [expenses]);
  

  return {
    expenses,
    isLoading,
    addExpense,
    deleteExpense,
    refreshExpenses,
    getExpensesForPeriod,
  };
}
