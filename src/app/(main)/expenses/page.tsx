
"use client";

import React, { useState, useMemo, useRef } from 'react';
import { ExpenseEntryForm } from '@/components/forms/ExpenseEntryForm';
import { RecentExpensesTable } from '@/components/sections/RecentExpensesTable';
import { useExpenses } from '@/hooks/useExpenses';
import type { Expense } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { getMonth, getYear, parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { exportExpensesToCSV } from '@/lib/csvExport';
import { EXPENSE_CATEGORIES } from '@/lib/constants';
import { formatDate } from '@/lib/formatters';

export default function ExpenseEntryPage() {
  const { expenses, addExpense, deleteExpense, refreshExpenses } = useExpenses();
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
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
    return expenses.filter(expense => {
      const expenseDate = parseISO(expense.date);
      return getMonth(expenseDate) === selectedMonth && getYear(expenseDate) === selectedYear;
    });
  }, [expenses, selectedMonth, selectedYear]);

  const yearOptions = useMemo(() => {
    if (expenses.length === 0) return [currentYear];
    // Ensure we handle the case where expenses might be empty initially
    const sortedExpenses = [...expenses].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstExpenseYear = sortedExpenses.length > 0 ? getYear(parseISO(sortedExpenses[0].date)) : currentYear;
    
    const years = [];
    for (let y = currentYear; y >= firstExpenseYear; y--) {
      years.push(y);
    }
    return years;
  }, [expenses, currentYear]);

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
    const elementToPrint = tableContainerRef.current;
    if (!elementToPrint) return;

    const html2pdf = (await import('html2pdf.js')).default;
    const monthName = new Date(selectedYear, selectedMonth).toLocaleString('es-ES', { month: 'long' });
    const formattedDate = format(new Date(), 'PPP', { locale: es });

    const titleHTML = `
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="font-size: 24px; font-family: 'Poppins', sans-serif;">Historial de Gastos</h1>
        <p style="font-size: 16px; font-family: 'PT Sans', sans-serif; color: #555;">
          ${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${selectedYear}
        </p>
        <p style="font-size: 12px; font-family: 'PT Sans', sans-serif; color: #888;">
          Exportado el ${formattedDate}
        </p>
      </div>
    `;

    const container = document.createElement('div');
    container.innerHTML = titleHTML;
    container.appendChild(elementToPrint.cloneNode(true));
    
    const options = {
      margin: 15,
      filename: `gastos_${monthName}_${selectedYear}.pdf`,
      image: { type: 'png', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(container).set(options).save();
  };


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
              <Button onClick={handleExportCSV} variant="outline" size="icon" disabled={filteredExpenses.length === 0} title="Exportar a CSV">
                <Download className="h-4 w-4" />
                <span className="sr-only">Exportar a CSV</span>
              </Button>
              <Button onClick={handleExportPDF} variant="outline" size="icon" disabled={filteredExpenses.length === 0} title="Descargar PDF">
                <FileText className="h-4 w-4" />
                <span className="sr-only">Descargar PDF</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div ref={tableContainerRef}>
            <RecentExpensesTable 
              expenses={filteredExpenses}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
