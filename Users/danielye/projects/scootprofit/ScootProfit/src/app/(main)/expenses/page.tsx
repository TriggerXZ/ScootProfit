
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { ExpenseEntryForm } from '@/components/forms/ExpenseEntryForm';
import { RecentExpensesTable } from '@/components/sections/RecentExpensesTable';
import { useExpenses } from '@/hooks/useExpenses';
import type { Expense } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getMonth, getYear, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function ExpenseEntryPage() {
  const { expenses, addExpense, deleteExpense, refreshExpenses, isLoading } = useExpenses();
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const handleSubmitSuccess = () => {
    setEditingExpense(null); // Clear editing state after successful submission
    refreshExpenses();
  };
  
  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    // Scroll to the top to make the form visible
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleCancelEdit = () => {
    setEditingExpense(null);
  };
  
  const handleDelete = (id: string) => {
    deleteExpense(id);
    if(editingExpense?.id === id) {
        setEditingExpense(null);
    }
  };

  const filteredExpenses = useMemo(() => {
    if (isLoading || !isClient) return [];
    return expenses.filter(expense => {
      const expenseDate = parseISO(expense.date);
      return getMonth(expenseDate) === selectedMonth && getYear(expenseDate) === selectedYear;
    });
  }, [expenses, selectedMonth, selectedYear, isLoading, isClient]);

  const yearOptions = useMemo(() => {
    if (isLoading || !isClient || expenses.length === 0) return [currentYear];
    const firstExpenseYear = getYear(parseISO(expenses[expenses.length - 1].date));
    const years = [];
    for (let y = currentYear; y >= firstExpenseYear; y--) {
      years.push(y);
    }
    return years;
  }, [expenses, currentYear, isLoading, isClient]);


  return (
    <div className="container mx-auto py-8 space-y-8">
      <ExpenseEntryForm 
        onSubmitSuccess={handleSubmitSuccess}
        editingExpense={editingExpense}
        onCancelEdit={handleCancelEdit}
        addExpense={addExpense}
      />
      
      <Separator />

      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="font-headline text-2xl">Historial de Gastos</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={String(selectedMonth)} onValueChange={(val) => setSelectedMonth(Number(val))}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Seleccionar mes" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {new Date(0, i).toLocaleString('es-ES', { month: 'long' }).replace(/^\w/, (c) => c.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
               <Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(Number(val))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Seleccionar año" />
                </SelectTrigger>
                <SelectContent>
                   {yearOptions.map(year => (
                      <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                   ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!isClient || isLoading ? (
             <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
          ) : (
            <RecentExpensesTable 
              expenses={filteredExpenses}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
