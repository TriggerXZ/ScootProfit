
"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ExpenseEntryForm } from '@/components/forms/ExpenseEntryForm';
import { RecentExpensesTable } from '@/components/sections/RecentExpensesTable';
import { useExpenses } from '@/hooks/useExpenses';
import type { Expense } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, FileText, WalletCards, TrendingDown } from 'lucide-react';
import { getMonth, getYear, parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { exportExpensesToCSV } from '@/lib/csvExport';
import { EXPENSE_CATEGORIES } from '@/lib/constants';
import { formatDate, formatCurrencyCOP } from '@/lib/formatters';

export default function ExpenseEntryPage() {
  const { expenses, addExpense, deleteExpense, refreshExpenses } = useExpenses();
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const tableContainerRef = useRef<HTMLDivElement>(null);

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
    if (!isClient) return [];
    return expenses.filter(expense => {
      const expenseDate = parseISO(expense.date);
      return getMonth(expenseDate) === selectedMonth && getYear(expenseDate) === selectedYear;
    });
  }, [expenses, selectedMonth, selectedYear, isClient]);

  const { totalMonthlyExpenses, topCategory } = useMemo(() => {
    if (filteredExpenses.length === 0) {
        return { totalMonthlyExpenses: 0, topCategory: null };
    }
    
    const total = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    const categoryTotals = filteredExpenses.reduce((acc, expense) => {
        acc[expense.categoryId] = (acc[expense.categoryId] || 0) + expense.amount;
        return acc;
    }, {} as { [key: string]: number });

    let topCat: { name: string; amount: number } | null = null;
    if (Object.keys(categoryTotals).length > 0) {
        const topCategoryId = Object.entries(categoryTotals).reduce((a, b) => a[1] > b[1] ? a : b)[0];
        topCat = {
            name: EXPENSE_CATEGORIES.find(c => c.id === topCategoryId)?.name || 'Desconocida',
            amount: categoryTotals[topCategoryId]
        };
    }

    return { totalMonthlyExpenses: total, topCategory: topCat };
  }, [filteredExpenses]);


  const yearOptions = useMemo(() => {
    if (!isClient || expenses.length === 0) return [currentYear];
    // Ensure we handle the case where expenses might be empty initially
    const sortedExpenses = [...expenses].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstExpenseYear = sortedExpenses.length > 0 ? getYear(parseISO(sortedExpenses[0].date)) : currentYear;
    
    const years = [];
    for (let y = currentYear; y >= firstExpenseYear; y--) {
      years.push(y);
    }
    return years;
  }, [expenses, currentYear, isClient]);

  const handleExportCSV = () => {
    const categoryMap = new Map(EXPENSE_CATEGORIES.map(c => [c.id, c.name]));
    const dataToExport = filteredExpenses.map(expense => ({
        date: formatDate(expense.date, 'yyyy-MM-dd'),
        description: expense.description,
        categoryName: categoryMap.get(expense.categoryId) || 'Desconocida',
        amount: expense.amount
    }));
    exportExpensesToCSV(dataToExport);
  };

  const handleExportPDF = async () => {
    const elementToPrint = tableContainerRef.current?.querySelector('table');
    if (!elementToPrint) return;

    const html2pdf = (await import('html2pdf.js')).default;
    const monthName = new Date(selectedYear, selectedMonth).toLocaleString('es-ES', { month: 'long' });
    const formattedDate = format(new Date(), 'PPP', { locale: es });

    // Create a clone of the table to manipulate without affecting the UI
    const clonedTable = elementToPrint.cloneNode(true) as HTMLElement;
    
    // Create a container for the PDF content
    const container = document.createElement('div');
    container.style.fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-body') || 'PT Sans, sans-serif';
    container.style.color = '#333';

    // Create and style the header
    const titleHTML = `
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="font-size: 24px; font-family: 'Poppins', sans-serif; color: #1a1a1a; margin-bottom: 4px;">Historial de Gastos</h1>
        <p style="font-size: 16px; color: #555; margin: 0;">
          ${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${selectedYear}
        </p>
        <p style="font-size: 12px; color: #888; margin-top: 8px;">
          Exportado el ${formattedDate}
        </p>
      </div>
    `;
    container.innerHTML = titleHTML;

    // Apply styles to the cloned table for better PDF output
    clonedTable.style.width = '100%';
    clonedTable.style.borderCollapse = 'collapse';
    clonedTable.querySelectorAll('th, td').forEach(cell => {
        (cell as HTMLElement).style.border = '1px solid #ddd';
        (cell as HTMLElement).style.padding = '8px';
        (cell as HTMLElement).style.textAlign = 'left';
    });
     clonedTable.querySelectorAll('th').forEach(th => {
        (th as HTMLElement).style.backgroundColor = '#f2f2f2';
        (th as HTMLElement).style.fontWeight = 'bold';
    });
    
    container.appendChild(clonedTable);
    
    const options = {
      margin: 15,
      filename: `gastos_${monthName}_${selectedYear}.pdf`,
      image: { type: 'png', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(container).set(options).save();
  };


  return (
    <div className="container mx-auto py-8 space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <WalletCards className="h-7 w-7 text-primary" />
            <div>
              <CardTitle className="font-headline text-2xl">Resumen de Gastos del Mes</CardTitle>
              <CardDescription>
                {new Date(selectedYear, selectedMonth).toLocaleString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, (c) => c.toUpperCase())}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col justify-center p-6 bg-muted/50 rounded-lg">
            <h3 className="text-sm font-medium text-muted-foreground">Total Gastado en el Mes</h3>
            <p className="text-4xl font-bold font-headline text-destructive">{formatCurrencyCOP(totalMonthlyExpenses)}</p>
          </div>
          <div className="flex flex-col justify-center p-6 bg-muted/50 rounded-lg">
            {topCategory ? (
              <>
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Categoría Principal de Gasto
                </h3>
                <p className="text-2xl font-bold font-headline text-foreground">{topCategory.name}</p>
                <p className="text-lg font-semibold text-red-500">{formatCurrencyCOP(topCategory.amount)}</p>
              </>
            ) : (
              <p className="text-muted-foreground text-center">No hay gastos para analizar la categoría principal.</p>
            )}
          </div>
        </CardContent>
      </Card>

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
            <div className="flex items-center gap-2 flex-wrap">
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
              <Button onClick={handleExportCSV} variant="outline" size="icon" disabled={!isClient || filteredExpenses.length === 0} title="Exportar a CSV">
                <Download className="h-4 w-4" />
                <span className="sr-only">Exportar a CSV</span>
              </Button>
              <Button onClick={handleExportPDF} variant="outline" size="icon" disabled={!isClient || filteredExpenses.length === 0} title="Descargar PDF">
                <FileText className="h-4 w-4" />
                <span className="sr-only">Descargar PDF</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div ref={tableContainerRef}>
           {isClient ? (
                <RecentExpensesTable 
                  expenses={filteredExpenses}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">Cargando gastos...</div>
              )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
