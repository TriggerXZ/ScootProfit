
"use client";

import React, { useState, useMemo, useRef } from 'react';
import { RevenueEntryForm } from '@/components/forms/RevenueEntryForm';
import { RecentEntriesTable } from '@/components/sections/RecentEntriesTable';
import { useRevenueEntries } from '@/hooks/useRevenueEntries';
import type { LocationRevenueInput, RevenueEntry } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { getMonth, getYear, parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';
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

  const tableContainerRef = useRef<HTMLDivElement>(null);

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

  const handleExportCSV = () => {
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

  const handleExportPDF = async () => {
    const elementToPrint = tableContainerRef.current;
    if (!elementToPrint) return;

    const html2pdf = (await import('html2pdf.js')).default;
    const monthName = new Date(selectedYear, selectedMonth).toLocaleString('es-ES', { month: 'long' });
    const formattedDate = format(new Date(), 'PPP', { locale: es });

    const titleHTML = `
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="font-size: 24px; font-family: 'Poppins', sans-serif;">Historial de Ingresos</h1>
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
      filename: `ingresos_${monthName}_${selectedYear}.pdf`,
      image: { type: 'png', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(container).set(options).save();
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
              <Button onClick={handleExportCSV} variant="outline" size="icon" disabled={filteredEntries.length === 0} title="Exportar a CSV">
                <Download className="h-4 w-4" />
                <span className="sr-only">Exportar a CSV</span>
              </Button>
              <Button onClick={handleExportPDF} variant="outline" size="icon" disabled={filteredEntries.length === 0} title="Descargar PDF">
                <FileText className="h-4 w-4" />
                <span className="sr-only">Descargar PDF</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div ref={tableContainerRef}>
            <RecentEntriesTable 
              entries={filteredEntries}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
