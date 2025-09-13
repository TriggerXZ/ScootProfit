
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRevenueEntries } from '@/hooks/useRevenueEntries';
import { useExpenses } from '@/hooks/useExpenses';
import type { AggregatedTotal, Expense } from '@/types';
import { formatCurrencyCOP } from '@/lib/formatters';
import { getMonth, getYear, parseISO } from 'date-fns';
import { LineChart, DollarSign, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { ProfitabilityChart } from '@/components/charts/ProfitabilityChart';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfitabilityPage() {
  const { entries, allCalendarMonthlyTotals, isLoading: isLoadingRevenues } = useRevenueEntries();
  const { expenses, isLoading: isLoadingExpenses } = useExpenses();
  
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const { yearOptions, monthOptions } = useMemo(() => {
    if (entries.length === 0) {
      const currentYear = new Date().getFullYear();
      return {
        yearOptions: [currentYear],
        monthOptions: Array.from({ length: 12 }, (_, i) => ({ value: i, label: new Date(0, i).toLocaleString('es-ES', { month: 'long' }).replace(/^\w/, c => c.toUpperCase()) }))
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

  const monthlyProfitabilityData = useMemo(() => {
    const totals = allCalendarMonthlyTotals(expenses);
    return totals.find(total => {
        if (total.entries.length === 0) return false;
        const periodDate = parseISO(total.entries[0].date);
        return getMonth(periodDate) === selectedMonth && getYear(periodDate) === selectedYear;
    });
  }, [allCalendarMonthlyTotals, expenses, selectedMonth, selectedYear]);

  const isLoading = isLoadingRevenues || isLoadingExpenses;

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
          </div>
          <Skeleton className="h-80 rounded-lg" />
        </div>
      );
    }

    if (!monthlyProfitabilityData) {
      return (
        <div className="text-center py-16">
          <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No hay datos para el período seleccionado</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Por favor, selecciona otro mes o año, o registra nuevos ingresos para este período.
          </p>
        </div>
      );
    }

    const { 
        totalRevenueInPeriod, 
        deductionsDetail, 
        totalVariableExpenses, 
        finalNetProfit 
    } = monthlyProfitabilityData;
    const totalExpenses = deductionsDetail.totalDeductions + totalVariableExpenses;
    const isProfitable = finalNetProfit >= 0;

    return (
        <div className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                 <Card className="shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Brutos Totales</CardTitle>
                        <TrendingUp className="h-5 w-5 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold font-headline text-green-500">{formatCurrencyCOP(totalRevenueInPeriod)}</div>
                        <p className="text-xs text-muted-foreground pt-1">Total facturado en el período</p>
                    </CardContent>
                </Card>
                 <Card className="shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Gastos Totales (Fijos + Variables)</CardTitle>
                        <TrendingDown className="h-5 w-5 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold font-headline text-red-500">{formatCurrencyCOP(totalExpenses)}</div>
                        <p className="text-xs text-muted-foreground pt-1">
                            {formatCurrencyCOP(deductionsDetail.totalDeductions)} (fijos) + {formatCurrencyCOP(totalVariableExpenses)} (variables)
                        </p>
                    </CardContent>
                </Card>
                <Card className={`shadow-xl lg:col-span-2 border-2 ${isProfitable ? 'border-primary' : 'border-destructive'}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base font-semibold">{isProfitable ? 'Beneficio Neto (Ganancia)' : 'Pérdida Neta'}</CardTitle>
                        <DollarSign className={`h-6 w-6 ${isProfitable ? 'text-primary' : 'text-destructive'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-5xl font-bold font-headline ${isProfitable ? 'text-primary' : 'text-destructive'}`}>
                            {formatCurrencyCOP(finalNetProfit)}
                        </div>
                        <p className="text-sm text-muted-foreground pt-1">Resultado final después de todos los costos.</p>
                    </CardContent>
                </Card>
            </div>
            <Card className="shadow-xl">
                <CardHeader>
                    <CardTitle className="font-headline text-xl">Evolución de Ingresos vs. Gastos Diarios</CardTitle>
                    <CardDescription>Comparativa diaria de los ingresos generados contra los gastos registrados en el período.</CardDescription>
                </CardHeader>
                <CardContent className="h-96 pl-2">
                    <ProfitabilityChart 
                        revenueEntries={monthlyProfitabilityData.entries} 
                        expenses={expenses.filter(e => {
                            const expenseDate = parseISO(e.date);
                            return getMonth(expenseDate) === selectedMonth && getYear(expenseDate) === selectedYear;
                        })} 
                    />
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
                <LineChart className="h-7 w-7 text-primary" />
                <div>
                    <CardTitle className="font-headline text-2xl">Análisis de Rentabilidad</CardTitle>
                    <CardDescription>Calcula el beneficio neto comparando ingresos contra gastos fijos y variables.</CardDescription>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
