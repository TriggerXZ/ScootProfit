
"use client";

import React, { useState, useMemo } from 'react';
import { RevenueEntryForm } from '@/components/forms/RevenueEntryForm';
import { RecentEntriesTable } from '@/components/sections/RecentEntriesTable';
import { useRevenueEntries } from '@/hooks/useRevenueEntries';
import type { LocationRevenueInput, RevenueEntry } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { getMonth, getYear, parseISO } from 'date-fns';
import { exportRevenuesToCSV } from '@/lib/csvExport';
import { calculateDailyTotal } from '@/lib/calculations';
import { formatCurrencyCOP, formatDate } from '@/lib/formatters';

export default function RevenueEntryPage() {
  const { entries, addEntry, getEntryByDate, deleteEntry, refreshEntries } = useRevenueEntries();
  const [editingEntry, setEditingEntry] = useState<RevenueEntry | null>(null);
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const handleSubmitSuccess = (date: string, revenues: LocationRevenueInput) => {
    addEntry(date, revenues);
    setEditingEntry(null); // Clear editing state after successful submission
    refreshEntries();
  };
  
  const handleEdit = (entry: RevenueEntry) => {
    setEditingEntry(entry);
    // Scroll to the top to make the form visible
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleCancelEdit = () => {
    setEditingEntry(null);
  };
  
  const handleDelete = (id: string) => {
    deleteEntry(id);
    if(editingEntry?.id === id) {
        setEditingEntry(null);
    }
  };

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const entryDate = parseISO(entry.date);
      return getMonth(entryDate) === selectedMonth && getYear(entryDate) === selectedYear;
    });
  }, [entries, selectedMonth, selectedYear]);

  const yearOptions = useMemo(() => {
    if (entries.length === 0) return [currentYear];
    const firstEntryYear = getYear(parseISO(entries[entries.length - 1].date));
    const years = [];
    for (let y = currentYear; y >= firstEntryYear; y--) {
      years.push(y);
    }
    return years;
  }, [entries, currentYear]);

  const handleExport = () => {
    const dataToExport = filteredEntries.map(entry => {
        const dailyTotal = calculateDailyTotal(entry);
        return {
            date: formatDate(entry.date, 'yyyy-MM-dd'),
            la72: entry.revenues.la72,
            elCubo: entry.revenues.elCubo,
            parqueDeLasLuces: entry.revenues.parqueDeLasLuces,
            la78: entry.revenues.la78,
            total: dailyTotal.total
        };
    });
    exportRevenuesToCSV(dataToExport);
  };


  return (
    <div className="container mx-auto py-8 space-y-8">
      <RevenueEntryForm 
        onSubmitSuccess={handleSubmitSuccess}
        getExistingEntry={getEntryByDate}
        editingEntry={editingEntry}
        onCancelEdit={handleCancelEdit}
      />
      
      <Separator />

      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="font-headline text-2xl">Historial de Registros</CardTitle>
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
              <Button onClick={handleExport} variant="outline" size="icon" disabled={filteredEntries.length === 0}>
                <Download className="h-4 w-4" />
                <span className="sr-only">Exportar a CSV</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <RecentEntriesTable 
            entries={filteredEntries}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>
    </div>
  );
}
