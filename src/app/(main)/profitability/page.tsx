
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRevenueEntries } from '@/hooks/useRevenueEntries';
import { useExpenses } from '@/hooks/useExpenses';
import type { AggregatedTotal, Expense } from '@/types';
import { formatCurrencyCOP } from '@/lib/formatters';
import { getMonth, getYear, parseISO, subMonths } from 'date-fns';
import { LineChart, DollarSign, TrendingDown, TrendingUp, AlertTriangle, Scale } from 'lucide-react';
import { ProfitabilityChart } from '@/components/charts/ProfitabilityChart';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/cards/StatCard';

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

  const { monthlyProfitabilityData, previousMonthlyData } = useMemo(() => {
    const totals = allCalendarMonthlyTotals(expenses);
    const currentData = totals.find(total => {
        if (total.entries.length === 0) return false;
        const periodDate = parseISO(total.entries[0].date);
        return getMonth(periodDate) === selectedMonth && getYear(periodDate) === selectedYear;
    });

    const previousMonthDate = subMonths(new Date(selectedYear, selectedMonth), 1);
    const previousMonth = getMonth(previousMonthDate);
    const previousYear = getYear(previousMonthDate);

    const previousData = totals.find(total => {
        if (total.entries.length === 0) return false;
        const periodDate = parseISO(total.entries[0].date);
        return getMonth(periodDate) === previousMonth && getYear(periodDate) === previousYear;
    });
    
    return { monthlyProfitabilityData: currentData, previousMonthlyData: previousData };
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
    const isProfitable = finalNetProfit >= 0;

    return (
        <div className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                 <StatCard
                    title="Ingresos Brutos Totales"
                    value={formatCurrencyCOP(totalRevenueInPeriod)}
                    icon={TrendingUp}
                    description="Total facturado en el período."
                    valueClassName="text-green-500"
                    comparisonValue={previousMonthlyData?.totalRevenueInPeriod}
                />
                 <StatCard
                    title="Costos Fijos Totales"
                    value={formatCurrencyCOP(deductionsDetail.totalDeductions)}
                    icon={TrendingDown}
                    description="Deducciones (Zona Segura, Arriendo, etc.)"
                    valueClassName="text-red-500"
                    comparisonValue={previousMonthlyData?.deductionsDetail.totalDeductions}
                />
                 <StatCard
                    title="Gastos Variables Totales"
                    value={formatCurrencyCOP(totalVariableExpenses)}
                    icon={TrendingDown}
                    description="Reparaciones, combustible, etc."
                    valueClassName="text-red-500"
                    comparisonValue={previousMonthlyData?.totalVariableExpenses}
                />
                 <StatCard
                    title={isProfitable ? 'Beneficio Neto (Ganancia)' : 'Pérdida Neta'}
                    value={formatCurrencyCOP(finalNetProfit)}
                    icon={Scale}
                    description="Resultado final después de todos los costos."
                    valueClassName={isProfitable ? 'text-primary' : 'text-destructive'}
                    comparisonValue={previousMonthlyData?.finalNetProfit}
                />
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
                        totalFixedCosts={monthlyProfitabilityData.deductionsDetail.totalDeductions}
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
