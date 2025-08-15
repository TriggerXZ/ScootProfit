
"use client";

import React, { useState, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DatePickerWithRange } from '@/components/ui/DatePickerWithRange';
import { useRevenueEntries } from '@/hooks/useRevenueEntries';
import { Download, Calendar } from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { calculateDailyTotal } from '@/lib/calculations';
import { LOCATIONS } from '@/lib/constants';

export default function ExportPage() {
    const { entries } = useRevenueEntries();
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: new Date(),
    });

    const filteredEntries = useMemo(() => {
        if (!dateRange?.from || !dateRange?.to) return [];
        const interval = { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) };
        return entries.filter(entry => isWithinInterval(parseISO(entry.date), interval));
    }, [entries, dateRange]);

    const handleDownloadCSV = () => {
        if (filteredEntries.length === 0) return;

        const headers = ['Fecha', ...Object.values(LOCATIONS).map(l => l.name), 'Total Dia'];
        
        const rows = filteredEntries.map(entry => {
            const dailySummary = calculateDailyTotal(entry);
            const rowData = [
                entry.date,
                ...Object.values(LOCATIONS).map(l => entry.revenues[l.id] || 0),
                dailySummary.total,
            ];
            return rowData.join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            const from = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : 'start';
            const to = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : 'end';
            link.setAttribute('href', url);
            link.setAttribute('download', `reporte_ingresos_${from}_a_${to}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="container mx-auto py-8">
             <Card className="w-full max-w-2xl mx-auto shadow-xl border-border">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Download className="h-7 w-7 text-primary" />
                        <CardTitle className="font-headline text-2xl">Exportar Datos de Ingresos</CardTitle>
                    </div>
                    <CardDescription>Selecciona un rango de fechas para descargar el historial de ingresos como un archivo CSV.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Rango de Fechas
                        </label>
                        <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                    </div>

                    <div className="text-sm text-muted-foreground">
                        Se exportarán <span className="font-bold text-primary">{filteredEntries.length}</span> registros.
                    </div>

                    <Button onClick={handleDownloadCSV} disabled={filteredEntries.length === 0} className="w-full text-lg py-6">
                        <Download className="mr-2 h-5 w-5" />
                        Descargar CSV
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

