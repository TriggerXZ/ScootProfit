
"use client";

import React, { useState, useMemo, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AggregatedSummarySection } from '@/components/sections/AggregatedSummarySection';
import { GroupPerformanceChart } from '@/components/charts/GroupPerformanceChart';
import { LocationPerformanceChart } from '@/components/charts/LocationPerformanceChart';
import { useRevenueEntries } from '@/hooks/useRevenueEntries';
import { useExpenses } from '@/hooks/useExpenses';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, BarChart2 } from 'lucide-react';
import type { AggregatedTotal, RevenueEntry, Expense } from '@/types';
import { format, getMonth, getYear, parseISO, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getGroupForLocationOnDate } from '@/lib/calculations';
import { formatCurrencyCOP } from '@/lib/formatters';
import { ExpenseCategoryChart } from '@/components/charts/ExpenseCategoryChart';
import { GROUPS } from '@/lib/constants';


export default function ReportsPage() {
  const { allWeeklyTotals, all28DayTotals, allCalendarMonthlyTotals, allTimeTotal, entries, isLoading: isLoadingRevenues } = useRevenueEntries();
  const { expenses, isLoading: isLoadingExpenses } = useExpenses();
  const [activeTab, setActiveTab] = useState('weekly');
  
  const [filterType, setFilterType] = useState<'monthly' | 'allTime'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const { yearOptions, monthOptions } = useMemo(() => {
    if (entries.length === 0) {
      const currentYear = new Date().getFullYear();
      return {
        yearOptions: [currentYear],
        monthOptions: Array.from({ length: 12 }, (_, i) => ({ value: i, label: new Date(0, i).toLocaleString('es-ES', { month: 'long' }) }))
      };
    }
    
    const sortedEntries = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstEntryYear = getYear(parseISO(sortedEntries[0].date));
    const lastEntryYear = getYear(parseISO(sortedEntries[sortedEntries.length - 1].date));
    
    const years = [];
    for (let y = lastEntryYear; y >= firstEntryYear; y--) {
      years.push(y);
    }
    
    const months = Array.from({ length: 12 }, (_, i) => ({
      value: i,
      label: new Date(0, i).toLocaleString('es-ES', { month: 'long' }).replace(/^\w/, (c) => c.toUpperCase()),
    }));

    return { yearOptions: years, monthOptions: months };
  }, [entries]);

    const { groupTotals, locationTotals, summaryData, previousPeriodData, filteredExpenses } = useMemo(() => {
        const groupMap: { [key: string]: number } = {};
        const locationMap: { [key: string]: number } = {};

        let entriesToAnalyze: RevenueEntry[] = [];
        let expensesToAnalyze: Expense[] = [];
        let summary: AggregatedTotal | null = null;
        let previousSummary: AggregatedTotal | null = null;

        const allMonthlyTotals = allCalendarMonthlyTotals(expenses);

        if (filterType === 'allTime') {
            entriesToAnalyze = entries;
            expensesToAnalyze = expenses;
            summary = allTimeTotal(expenses);
            previousSummary = null; // No previous period for "all time"
        } else {
            const currentPeriodDate = new Date(selectedYear, selectedMonth);
            summary = allMonthlyTotals.find(total => {
                if (total.entries.length === 0) return false;
                const periodDate = parseISO(total.entries[0].date);
                return getMonth(periodDate) === selectedMonth && getYear(periodDate) === selectedYear;
            }) ?? null;

            if(summary) {
                entriesToAnalyze = summary.entries;
                expensesToAnalyze = expenses.filter(expense => {
                    const expenseDate = parseISO(expense.date);
                    return getMonth(expenseDate) === selectedMonth && getYear(expenseDate) === selectedYear;
                });
            }

            const previousMonthDate = subMonths(currentPeriodDate, 1);
            const prevMonth = getMonth(previousMonthDate);
            const prevYear = getYear(previousMonthDate);
            previousSummary = allMonthlyTotals.find(total => {
                if (total.entries.length === 0) return false;
                const periodDate = parseISO(total.entries[0].date);
                return getMonth(periodDate) === prevMonth && getYear(periodDate) === prevYear;
            }) ?? null;
        }

        entriesToAnalyze.forEach(entry => {
            const entryDate = parseISO(entry.date);
            for (const [location, revenue] of Object.entries(entry.revenues)) {
                locationMap[location] = (locationMap[location] || 0) + revenue;
            }
            for (const [locationId, revenue] of Object.entries(entry.revenues)) {
                const group = getGroupForLocationOnDate(locationId as any, entryDate);
                groupMap[group] = (groupMap[group] || 0) + revenue;
            }
        });

        return {
            groupTotals: groupMap,
            locationTotals: locationMap,
            summaryData: summary,
            previousPeriodData: previousSummary,
            filteredExpenses: expensesToAnalyze
        };
    }, [entries, expenses, filterType, selectedMonth, selectedYear, allCalendarMonthlyTotals, allTimeTotal]);
  
  const isLoading = isLoadingRevenues || isLoadingExpenses;

  const handleDownloadInvoicePDF = async (item: AggregatedTotal) => {
    const html2pdf = (await import('html2pdf.js')).default;
    const { es: localeEs } = await import('date-fns/locale/es');
    const currentDate = format(new Date(), 'PPP', { locale: localeEs });
    const textColor = '#2c3e50';

    const invoiceHTML = `
      <div style="font-family: Arial, sans-serif; width: 100%; max-width: 800px; margin: 20px auto; padding: 20px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0,0,0,0.1); font-size: 10pt; line-height: 1.5; color: ${textColor};">
        <h1 style="text-align: center; color: ${textColor}; font-size: 18px; margin-bottom: 10px;">Liquidación de Ingresos para Miembro</h1>
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="font-size: 16px; margin: 0; color: ${textColor};">ScootProfit</h2>
        </div>
        <table style="width: 100%; margin-bottom: 20px; font-size: 10pt; color: ${textColor};">
          <tr>
            <td style="font-weight: bold; padding: 4px; color: ${textColor};">Fecha de Emisión:</td>
            <td style="padding: 4px; color: ${textColor};">${currentDate}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; padding: 4px; color: ${textColor};">Período de Liquidación:</td>
            <td style="padding: 4px; color: ${textColor};">${item.period}</td>
          </tr>
        </table>
        
        <h3 style="border-bottom: 2px solid #eee; padding-bottom: 5px; margin-top: 20px; margin-bottom:10px; font-size: 14px; color: ${textColor};">Detalle de Liquidación</h3>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 10pt; color: ${textColor};">
          <thead>
            <tr>
              <th style="padding: 6px 8px; border: 1px solid #ddd; text-align: left; background-color: #f0f0f0; color: ${textColor};">Concepto</th>
              <th style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; background-color: #f0f0f0; color: ${textColor};">Valor (COP)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 6px 8px; border: 1px solid #ddd; color: ${textColor};">1. Total Ingresos Brutos del Período (Todos los puntos):</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; color: ${textColor};">${formatCurrencyCOP(item.totalRevenueInPeriod)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 8px; border: 1px solid #ddd; font-weight: bold; color: ${textColor};" colspan="2">2. Costos Operativos Fijos del Período:</td>
            </tr>
            <tr style="background-color: #fdfdfd;">
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left; color: ${textColor};">&nbsp;&nbsp;&nbsp;&nbsp;Pago Zona Segura:</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; color: ${textColor};">${formatCurrencyCOP(item.deductionsDetail.zonaSegura)}</td>
            </tr>
            <tr style="background-color: #fdfdfd;">
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left; color: ${textColor};">&nbsp;&nbsp;&nbsp;&nbsp;Arriendo:</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; color: ${textColor};">${formatCurrencyCOP(item.deductionsDetail.arriendo)}</td>
            </tr>
            <tr style="background-color: #fdfdfd;">
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left; color: ${textColor};">&nbsp;&nbsp;&nbsp;&nbsp;Aporte Cooperativa:</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; color: ${textColor};">${formatCurrencyCOP(item.deductionsDetail.aporteCooperativa)}</td>
            </tr>
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 6px 8px; border: 1px solid #ddd; font-weight: bold; color: ${textColor};">3. Total Costos Operativos Fijos (Sumatoria de 2):</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: ${textColor};">${formatCurrencyCOP(item.deductionsDetail.totalDeductions)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 8px; border: 1px solid #ddd; font-weight: bold; color: ${textColor};">4. Ingreso Neto del Período para Distribución (1 - 3):</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: ${item.netRevenueToDistribute < 0 ? '#dc3545' : textColor};">${formatCurrencyCOP(item.netRevenueToDistribute)}</td>
            </tr>
             <tr>
              <td style="padding: 6px 8px; border: 1px solid #ddd; color: ${textColor};">5. Total Gastos Variables del Período:</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; color: ${textColor};">(${formatCurrencyCOP(item.totalVariableExpenses)})</td>
            </tr>
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 6px 8px; border: 1px solid #ddd; font-weight: bold; color: ${textColor};">6. Beneficio Neto Final del Período (4 - 5):</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: ${item.finalNetProfit < 0 ? '#dc3545' : textColor};">${formatCurrencyCOP(item.finalNetProfit)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 8px; border: 1px solid #ddd; color: ${textColor};">7. Número de Miembros Participantes:</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; color: ${textColor};">${item.numberOfMembers}</td>
            </tr>
            <tr style="background-color: #f0f0f0;">
              <td style="padding: 10px 8px; border: 1px solid #ddd; font-weight: bold; font-size: 12pt; color: ${textColor};">8. Monto Neto a Pagar al Miembro (6 / 7):</td>
              <td style="padding: 10px 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; font-size: 12pt; color: ${item.netMemberShare < 0 ? '#dc3545' : '#28a745'};">${formatCurrencyCOP(item.netMemberShare)}</td>
            </tr>
          </tbody>
        </table>
        ${item.finalNetProfit < 0 ? `<p style="color: red; text-align: center; margin-top: 15px; font-size: 9pt;">Nota: El beneficio neto del período es negativo, lo que indica que los costos y gastos totales superaron los ingresos.</p>` : ''}
        <p style="text-align: center; margin-top: 25px; font-size: 9pt; color: #777;">Este es un documento generado automáticamente.</p>
      </div>
    `;

    const options = {
      margin: [10, 10, 10, 10], 
      filename: `liquidacion_miembro_${item.period.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      image: { type: 'png', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };
    
    try {
      await html2pdf().from(invoiceHTML).set(options).outputPdf('dataurlnewwindow');
    } catch (error) {
      console.error("Error generating invoice PDF:", error);
      alert("Hubo un error al generar la liquidación PDF. Por favor, inténtalo de nuevo.");
    }
  };

  const handleDownloadSummaryPDF = async () => {
    if (!summaryData) {
        alert("No hay datos de resumen para exportar.");
        return;
    }
    const html2pdf = (await import('html2pdf.js')).default;
    const { es: localeEs } = await import('date-fns/locale/es');

    const periodName = summaryData.period;
    const currentDate = format(new Date(), 'PPP', { locale: localeEs });

    const getChangeIndicator = (current: number, previous: number | undefined) => {
        if (previous === undefined || previous === null) return '';
        if (previous === 0) return current > 0 ? `<span style="color: #28a745;"> (+100%+)</span>` : '';
        const change = ((current - previous) / Math.abs(previous)) * 100;
        const color = change >= 0 ? '#28a745' : '#dc3545';
        const sign = change >= 0 ? '+' : '';
        return `<span style="font-size: 10pt; color: ${color};"> (${sign}${change.toFixed(1)}%)</span>`;
    };
    
    const groupRevenueRows = Object.entries(summaryData.groupRevenueTotals).map(([groupId, total]) => {
        const groupName = GROUPS[groupId as keyof typeof GROUPS]?.name || groupId;
        return `
            <tr style="background-color: #fdfdfd;">
                <td style="padding: 6px 8px; border: 1px solid #ddd;">&nbsp;&nbsp;&nbsp;&nbsp;Ingresos ${groupName}</td>
                <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;">${formatCurrencyCOP(total)}</td>
            </tr>
        `;
    }).join('');

    const summaryHTML = `
      <div style="font-family: Arial, sans-serif; width: 100%; max-width: 800px; margin: 20px auto; padding: 20px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0,0,0,0.1); font-size: 10pt; line-height: 1.5; color: #333;">
        <header style="text-align: center; border-bottom: 2px solid #f0f0f0; padding-bottom: 15px; margin-bottom: 20px;">
          <h1 style="font-size: 24px; color: #1a1a1a; margin: 0;">Resumen Ejecutivo</h1>
          <h2 style="font-size: 16px; color: #555; margin: 5px 0 0 0;">${periodName}</h2>
          <p style="font-size: 12px; color: #888; margin-top: 8px;">Generado el ${currentDate}</p>
        </header>
        
        <section>
          <h3 style="font-size: 16px; color: #1a1a1a; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 15px;">Resumen Financiero</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 11pt;">
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 8px; border: 1px solid #ddd;">Ingresos Brutos Totales</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #28a745;">
                ${formatCurrencyCOP(summaryData.totalRevenueInPeriod)}
                ${getChangeIndicator(summaryData.totalRevenueInPeriod, previousPeriodData?.totalRevenueInPeriod)}
              </td>
            </tr>
            ${groupRevenueRows}
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Costos Fijos Totales</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #dc3545;">
                (${formatCurrencyCOP(summaryData.deductionsDetail.totalDeductions)})
                ${getChangeIndicator(summaryData.deductionsDetail.totalDeductions, previousPeriodData?.deductionsDetail.totalDeductions)}
              </td>
            </tr>
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 8px; border: 1px solid #ddd;">Gastos Variables Totales</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #dc3545;">
                (${formatCurrencyCOP(summaryData.totalVariableExpenses)})
                ${getChangeIndicator(summaryData.totalVariableExpenses, previousPeriodData?.totalVariableExpenses)}
              </td>
            </tr>
            <tr style="border-top: 2px solid #333;">
              <td style="padding: 10px 8px; border: 1px solid #ddd; font-weight: bold; font-size: 13pt;">Beneficio Neto Final</td>
              <td style="padding: 10px 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; font-size: 13pt; color: ${summaryData.finalNetProfit >= 0 ? '#0056b3' : '#dc3545'};">
                ${formatCurrencyCOP(summaryData.finalNetProfit)}
                 ${getChangeIndicator(summaryData.finalNetProfit, previousPeriodData?.finalNetProfit)}
              </td>
            </tr>
             <tr style="border-top: 1px solid #ccc;">
              <td style="padding: 10px 8px; border: 1px solid #ddd; font-weight: bold; font-size: 13pt;">Cuota Neta por Miembro</td>
              <td style="padding: 10px 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; font-size: 13pt; color: ${summaryData.netMemberShare >= 0 ? '#0056b3' : '#dc3545'};">
                ${formatCurrencyCOP(summaryData.netMemberShare)}
                 ${getChangeIndicator(summaryData.netMemberShare, previousPeriodData?.netMemberShare)}
              </td>
            </tr>
          </tbody>
        </table>
        </section>
        
        <footer style="text-align: center; margin-top: 40px; font-size: 9pt; color: #777; border-top: 1px solid #eee; padding-top: 10px;">
          Reporte generado por ScootProfit
        </footer>
      </div>
    `;

    const options = {
      margin: 10,
      filename: `resumen_${periodName.toLowerCase().replace(/\s/g, '_').replace(/[^a-z0-9_]/g, '')}.pdf`,
      image: { type: 'png', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    html2pdf().from(summaryHTML).set(options).outputPdf('dataurlnewwindow');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold text-foreground">Reportes de Ingresos</h1>
        <p className="text-muted-foreground mt-1">Analiza los ingresos semanales, mensuales y el rendimiento por grupo y ubicación.</p>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
                <BarChart2 className="h-6 w-6 text-primary" />
                <CardTitle className="font-headline text-2xl">Análisis de Rendimiento</CardTitle>
            </div>
             <div className="flex items-center gap-2 flex-wrap">
                 <Tabs value={filterType} onValueChange={(value) => setFilterType(value as 'monthly' | 'allTime')} className="w-full sm:w-auto">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="monthly">Mensual</TabsTrigger>
                        <TabsTrigger value="allTime">Histórico</TabsTrigger>
                    </TabsList>
                </Tabs>
                {filterType === 'monthly' && (
                    <>
                        <Select value={String(selectedMonth)} onValueChange={(val) => setSelectedMonth(Number(val))}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Seleccionar mes" />
                            </SelectTrigger>
                            <SelectContent>
                                {monthOptions.map(month => (
                                    <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
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
                    </>
                )}
                 <Button onClick={handleDownloadSummaryPDF} variant="outline" disabled={!summaryData || isLoading}>
                    <FileText className="mr-2 h-4 w-4" />
                    Ver Resumen PDF
                </Button>
            </div>
          </div>
          <CardDescription>
            {filterType === 'monthly'
                ? 'Visualiza los ingresos acumulados por grupo y ubicación para el período seleccionado.'
                : 'Visualiza el rendimiento histórico total por grupo y ubicación.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-8 md:grid-cols-2 pt-4">
          <div className="h-80">
            <h3 className="font-semibold mb-2 text-center">Rendimiento por Grupo</h3>
            <GroupPerformanceChart groupTotals={groupTotals} />
          </div>
          <div className="h-80">
            <h3 className="font-semibold mb-2 text-center">Ingresos por Ubicación</h3>
            <LocationPerformanceChart locationTotals={locationTotals} />
          </div>
        </CardContent>
      </Card>
      
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
          <h2 className="text-2xl font-headline font-bold text-foreground">Desglose de Períodos</h2>
        </div>
        <Tabs defaultValue="weekly" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 md:w-1/2 lg:w-1/3 mb-6">
            <TabsTrigger value="weekly" className="text-base py-2.5">Semanal</TabsTrigger>
            <TabsTrigger value="28-days" className="text-base py-2.5">28 Días</TabsTrigger>
            <TabsTrigger value="monthly" className="text-base py-2.5">Mensual (Calendario)</TabsTrigger>
          </TabsList>
          <TabsContent value="weekly">
              <AggregatedSummarySection 
                title="Ingresos Semanales" 
                totals={allWeeklyTotals(expenses)} 
                isLoading={isLoading}
                onDownloadInvoice={handleDownloadInvoicePDF}
              />
          </TabsContent>
          <TabsContent value="28-days">
              <AggregatedSummarySection 
                title="Ingresos por Períodos de 28 días" 
                totals={all28DayTotals(expenses)} 
                isLoading={isLoading}
                onDownloadInvoice={handleDownloadInvoicePDF}
              />
          </TabsContent>
          <TabsContent value="monthly">
              <AggregatedSummarySection 
                title="Ingresos Mensuales" 
                totals={allCalendarMonthlyTotals(expenses)} 
                isLoading={isLoading}
                onDownloadInvoice={handleDownloadInvoicePDF}
              />
          </TabsContent>
        </Tabs>
      </div>

    </div>
  );
}
