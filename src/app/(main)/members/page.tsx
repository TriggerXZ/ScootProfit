
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRevenueEntries } from '@/hooks/useRevenueEntries';
import { useExpenses } from '@/hooks/useExpenses';
import { useSettings } from '@/hooks/useSettings';
import { formatCurrencyCOP } from '@/lib/formatters';
import { getMonth, getYear, parseISO, subMonths } from 'date-fns';
import { Users, TrendingUp, TrendingDown, Scale, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/cards/StatCard';
import type { AggregatedTotal } from '@/types';


export default function MembersPage() {
  const { allCalendarMonthlyTotals, isLoading: isLoadingRevenues, entries } from useRevenueEntries();
  const { expenses, isLoading: isLoadingExpenses } = useExpenses();
  const { settings, isLoading: isLoadingSettings } = useSettings();
  
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

  const { monthlyData, previousMonthlyData } = useMemo(() => {
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
    
    return { monthlyData: currentData, previousMonthlyData: previousData };
  }, [allCalendarMonthlyTotals, expenses, selectedMonth, selectedYear]);

  const isLoading = isLoadingRevenues || isLoadingExpenses || isLoadingSettings;

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

    if (!monthlyData) {
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

    const { numberOfMembers } = settings;
    const grossRevenuePerMember = numberOfMembers > 0 ? monthlyData.totalRevenueInPeriod / numberOfMembers : 0;
    const fixedCostPerMember = numberOfMembers > 0 ? monthlyData.deductionsDetail.totalDeductions / numberOfMembers : 0;
    const variableCostPerMember = numberOfMembers > 0 ? monthlyData.totalVariableExpenses / numberOfMembers : 0;
    const netProfitPerMember = monthlyData.netMemberShare;

    const prevGrossRevenuePerMember = previousMonthlyData && numberOfMembers > 0 ? previousMonthlyData.totalRevenueInPeriod / numberOfMembers : 0;
    const prevFixedCostPerMember = previousMonthlyData && numberOfMembers > 0 ? previousMonthlyData.deductionsDetail.totalDeductions / numberOfMembers : 0;
    const prevVariableCostPerMember = previousMonthlyData && numberOfMembers > 0 ? previousMonthlyData.totalVariableExpenses / numberOfMembers : 0;

    return (
        <div className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                 <StatCard
                    title="Ingreso Bruto por Miembro"
                    value={formatCurrencyCOP(grossRevenuePerMember)}
                    icon={TrendingUp}
                    description="Ingresos generados por miembro."
                    valueClassName="text-green-500"
                    comparisonValue={prevGrossRevenuePerMember}
                />
                 <StatCard
                    title="Costos Fijos por Miembro"
                    value={formatCurrencyCOP(fixedCostPerMember)}
                    icon={TrendingDown}
                    description="Deducciones (Arriendo, etc.)"
                     valueClassName="text-red-500"
                     comparisonValue={prevFixedCostPerMember}
                />
                 <StatCard
                    title="Gastos Variables por Miembro"
                    value={formatCurrencyCOP(variableCostPerMember)}
                    icon={TrendingDown}
                    description="Reparaciones, combustible, etc."
                     valueClassName="text-red-500"
                     comparisonValue={prevVariableCostPerMember}
                />
                <StatCard
                    title="Beneficio Neto por Miembro"
                    value={formatCurrencyCOP(netProfitPerMember)}
                    icon={Scale}
                    description="Ganancia final por miembro."
                    valueClassName={netProfitPerMember >= 0 ? 'text-primary' : 'text-destructive'}
                    comparisonValue={previousMonthlyData?.netMemberShare}
                />
            </div>
            <Card className="shadow-xl">
                <CardHeader>
                    <CardTitle className="font-headline text-xl">Desglose Financiero por Miembro</CardTitle>
                    <CardDescription>Detalle de los cálculos para el período seleccionado, basado en {numberOfMembers} miembros.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Concepto</TableHead>
                                <TableHead className="text-right">Total del Negocio</TableHead>
                                <TableHead className="text-right">Valor por Miembro</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow className="bg-muted/20">
                                <TableCell className="font-medium">Ingresos Brutos Totales</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrencyCOP(monthlyData.totalRevenueInPeriod)}</TableCell>
                                <TableCell className="text-right font-medium text-green-500">{formatCurrencyCOP(grossRevenuePerMember)}</TableCell>
                            </TableRow>
                             <TableRow>
                                <TableCell className="pl-8 text-muted-foreground">Costo Fijo: Zona Segura</TableCell>
                                <TableCell className="text-right text-muted-foreground">({formatCurrencyCOP(monthlyData.deductionsDetail.zonaSegura)})</TableCell>
                                <TableCell className="text-right text-muted-foreground">({formatCurrencyCOP(settings.zonaSeguraDeduction)})</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="pl-8 text-muted-foreground">Costo Fijo: Arriendo</TableCell>
                                <TableCell className="text-right text-muted-foreground">({formatCurrencyCOP(monthlyData.deductionsDetail.arriendo)})</TableCell>
                                <TableCell className="text-right text-muted-foreground">({formatCurrencyCOP(settings.arriendoDeduction)})</TableCell>
                            </TableRow>
                             <TableRow>
                                <TableCell className="pl-8 text-muted-foreground">Costo Fijo: Aporte Cooperativa</TableCell>
                                <TableCell className="text-right text-muted-foreground">({formatCurrencyCOP(monthlyData.deductionsDetail.aporteCooperativa)})</TableCell>
                                <TableCell className="text-right text-muted-foreground">({formatCurrencyCOP(settings.cooperativaDeduction)})</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Total Costos Fijos</TableCell>
                                <TableCell className="text-right font-medium">({formatCurrencyCOP(monthlyData.deductionsDetail.totalDeductions)})</TableCell>
                                <TableCell className="text-right font-medium text-red-500">({formatCurrencyCOP(fixedCostPerMember)})</TableCell>
                            </TableRow>
                             <TableRow>
                                <TableCell className="font-medium">Total Gastos Variables</TableCell>
                                <TableCell className="text-right font-medium">({formatCurrencyCOP(monthlyData.totalVariableExpenses)})</TableCell>
                                <TableCell className="text-right font-medium text-red-500">({formatCurrencyCOP(variableCostPerMember)})</TableCell>
                            </TableRow>
                             <TableRow className="bg-muted/50 border-t-2 border-border">
                                <TableCell className="font-bold text-lg text-primary">Beneficio Neto Final</TableCell>
                                <TableCell className={`text-right font-bold text-lg ${monthlyData.finalNetProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                                    {formatCurrencyCOP(monthlyData.finalNetProfit)}
                                </TableCell>
                                 <TableCell className={`text-right font-bold text-lg ${netProfitPerMember >= 0 ? 'text-primary' : 'text-destructive'}`}>
                                    {formatCurrencyCOP(netProfitPerMember)}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
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
                <Users className="h-7 w-7 text-primary" />
                <div>
                    <CardTitle className="font-headline text-2xl">Análisis por Miembro</CardTitle>
                    <CardDescription>Evalúa la rentabilidad y el rendimiento promedio por cada miembro del equipo.</CardDescription>
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
