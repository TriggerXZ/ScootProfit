
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/cards/StatCard';
import { GoalProgressCard } from '@/components/cards/GoalProgressCard';
import { useRevenueEntries } from '@/hooks/useRevenueEntries';
import { useExpenses } from '@/hooks/useExpenses';
import { formatCurrencyCOP, formatDate } from '@/lib/formatters';
import { DatePicker } from '@/components/ui/DatePicker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { WeeklyRevenueChart } from '@/components/charts/WeeklyRevenueChart';
import { useSettings } from '@/hooks/useSettings';
import { Edit3, BrainCircuit, Languages, TrendingUp, TrendingDown, Scale, Users, PieChart, CheckCircle, AlertTriangle, Target } from 'lucide-react';
import { TopPerformerCard } from '@/components/cards/TopPerformerCard';
import { GROUPS, LOCATIONS } from '@/lib/constants';
import { ExpenseCategoryChart } from '@/components/charts/ExpenseCategoryChart';
import type { Expense } from '@/types';


export default function DashboardPage() {
  const { entries, isLoading: isLoadingRevenues, all28DayTotals, getDailySummary, refreshEntries } = useRevenueEntries();
  const { expenses, isLoading: isLoadingExpenses } = useExpenses();
  const { settings, isLoading: isLoadingSettings } = useSettings();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [dailySummary, setDailySummary] = useState<ReturnType<typeof getDailySummary> | null>(null);
  
  useEffect(() => {
    // Set initial date on client side to avoid hydration mismatch
    setSelectedDate(new Date());
  }, []);

  useEffect(() => {
    if (selectedDate) {
      const summary = getDailySummary(selectedDate);
      setDailySummary(summary);
    }
  }, [selectedDate, getDailySummary, entries]);

  useEffect(() => {
    refreshEntries(); 
  }, [refreshEntries]);
  
  const isLoading = isLoadingRevenues || isLoadingExpenses || isLoadingSettings;

  const { currentMonthData, previousMonthData } = useMemo(() => {
    if (isLoading || entries.length === 0) return { currentMonthData: null, previousMonthData: null };
    const totals = all28DayTotals(expenses);
    const current = totals.length > 0 ? totals[0] : null;
    const previous = totals.length > 1 ? totals[1] : null;
    return { currentMonthData: current, previousMonthData: previous };
  }, [all28DayTotals, isLoading, entries, expenses]);
  
  const currentPeriodExpenses: Expense[] = useMemo(() => {
    if (!currentMonthData || expenses.length === 0) return [];
    
    const periodStartDate = currentMonthData.entries.length > 0 ? parseISO(currentMonthData.entries[currentMonthData.entries.length - 1].date) : new Date();
    const periodEndDate = currentMonthData.entries.length > 0 ? parseISO(currentMonthData.entries[0].date) : new Date();

    const interval = {
        start: periodStartDate,
        end: periodEndDate
    };

    return expenses.filter(expense => isWithinInterval(parseISO(expense.date), interval));
  }, [currentMonthData, expenses]);

  const topPerformers = useMemo(() => {
    if (!currentMonthData) return { topGroup: null, topLocation: null };

    const { groupRevenueTotals, entries: periodEntries } = currentMonthData;

    let topGroup = { name: 'N/A', total: 0 };
    if (groupRevenueTotals && Object.keys(groupRevenueTotals).length > 0) {
      const topGroupId = Object.entries(groupRevenueTotals).reduce((a, b) => a[1] > b[1] ? a : b)[0];
      topGroup = {
        name: (Object.values(GROUPS).find(g => g.id === topGroupId))?.name || topGroupId,
        total: groupRevenueTotals[topGroupId as keyof typeof groupRevenueTotals],
      };
    }

    let topLocation = { name: 'N/A', total: 0 };
    if (periodEntries && periodEntries.length > 0) {
      const locationTotals: { [key: string]: number } = {};
      periodEntries.forEach(entry => {
        for (const [loc, revenue] of Object.entries(entry.revenues)) {
          locationTotals[loc] = (locationTotals[loc] || 0) + revenue;
        }
      });
      const topLocationId = Object.entries(locationTotals).reduce((a, b) => a[1] > b[1] ? a : b)[0];
      topLocation = {
        name: (Object.values(LOCATIONS).find(l => l.id === topLocationId))?.name || topLocationId,
        total: locationTotals[topLocationId],
      };
    }
    
    return { topGroup, topLocation };
  }, [currentMonthData]);

  const dailyFinancials = useMemo(() => {
    if (!selectedDate) return { dailyRevenue: 0, dailyExpenses: 0, dailyNet: 0, dailyGoal: 0 };
    const dateString = format(selectedDate, 'yyyy-MM-dd');
    const dailyRevenue = dailySummary?.total ?? 0;
    const dailyExpenses = expenses
        .filter(e => e.date === dateString)
        .reduce((sum, e) => sum + e.amount, 0);
    const dailyNet = dailyRevenue - dailyExpenses;
    const dailyGoal = settings.weeklyGoal > 0 ? settings.weeklyGoal / 7 : 0;
    return { dailyRevenue, dailyExpenses, dailyNet, dailyGoal };
  }, [selectedDate, expenses, dailySummary, settings.weeklyGoal]);


  if (isLoading || selectedDate === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-10 w-1/4" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
        </div>
        <Skeleton className="h-80 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
            <h1 className="text-3xl font-headline font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Un resumen de la actividad reciente.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground shrink-0">Ver resumen para:</span>
          <DatePicker date={selectedDate} setDate={setSelectedDate} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Ingresos Período Actual" 
          value={formatCurrencyCOP(currentMonthData?.totalRevenueInPeriod ?? 0)}
          icon={TrendingUp}
          description={currentMonthData?.period ?? "Últimos 28 días"}
          comparisonValue={previousMonthData?.totalRevenueInPeriod}
        />
        <StatCard 
          title="Gastos Período Actual" 
          value={formatCurrencyCOP(currentMonthData?.totalVariableExpenses ?? 0)}
          icon={TrendingDown}
          description="Gastos variables registrados"
          comparisonValue={previousMonthData?.totalVariableExpenses}
        />
         <StatCard 
          title="Beneficio Neto Período" 
          value={formatCurrencyCOP(currentMonthData?.finalNetProfit ?? 0)}
          icon={Scale}
          description="Ingresos menos costos y gastos"
          valueClassName={currentMonthData && currentMonthData.finalNetProfit < 0 ? 'text-destructive' : 'text-primary'}
          comparisonValue={previousMonthData?.finalNetProfit}
        />
        <StatCard 
          title="Cuota Neta Miembro" 
          value={formatCurrencyCOP(currentMonthData?.netMemberShare ?? 0)}
          icon={Users}
          description="Beneficio final por miembro"
          valueClassName={currentMonthData && currentMonthData.netMemberShare < 0 ? 'text-destructive' : ''}
          comparisonValue={previousMonthData?.netMemberShare}
        />
      </div>
      
       <div className="grid gap-6 lg:grid-cols-5">
        <Card className="shadow-lg lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-headline text-xl">
              Ingresos de los Últimos 7 Días
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80 pl-2">
            <WeeklyRevenueChart entries={entries} />
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
           <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <PieChart className="h-6 w-6 text-primary" />
                        <CardTitle className="font-headline text-xl">Gastos por Categoría</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="h-48">
                    <ExpenseCategoryChart expenses={currentPeriodExpenses} />
                </CardContent>
            </Card>
          <TopPerformerCard
            topGroup={topPerformers.topGroup}
            topLocation={topPerformers.topLocation}
            periodLabel={currentMonthData?.period}
          />
          <GoalProgressCard currentPeriod={currentMonthData} />
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-xl">
                Detalle del {selectedDate ? formatDate(format(selectedDate, 'yyyy-MM-dd')) : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dailyFinancials.dailyRevenue > 0 || dailyFinancials.dailyExpenses > 0 ? (
                  <div className="space-y-3">
                     <div className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="h-5 w-5 text-green-500" />
                            <span className="font-medium text-foreground">Ingresos del Día</span>
                        </div>
                        <span className="font-semibold text-lg text-green-500">{formatCurrencyCOP(dailyFinancials.dailyRevenue)}</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <TrendingDown className="h-5 w-5 text-red-500" />
                            <span className="font-medium text-foreground">Gastos del Día</span>
                        </div>
                        <span className="font-semibold text-lg text-red-500">{formatCurrencyCOP(dailyFinancials.dailyExpenses)}</span>
                    </div>
                    <div className={`flex items-center justify-between p-3 rounded-lg border-2 ${dailyFinancials.dailyNet >= 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                        <div className="flex items-center gap-3">
                             <Scale className={`h-5 w-5 ${dailyFinancials.dailyNet >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                            <span className={`font-bold ${dailyFinancials.dailyNet >= 0 ? 'text-green-700' : 'text-red-700'}`}>Beneficio Neto del Día</span>
                        </div>
                        <span className={`font-bold text-xl ${dailyFinancials.dailyNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrencyCOP(dailyFinancials.dailyNet)}</span>
                    </div>
                    {dailyFinancials.dailyGoal > 0 && (
                       <div className={`flex items-center justify-center gap-2 p-2 rounded-lg text-sm ${dailyFinancials.dailyRevenue >= dailyFinancials.dailyGoal ? 'bg-sky-500/10 text-sky-600' : 'bg-amber-500/10 text-amber-600'}`}>
                            {dailyFinancials.dailyRevenue >= dailyFinancials.dailyGoal ? <CheckCircle className="h-4 w-4" /> : <Target className="h-4 w-4" />}
                            <span>
                                {dailyFinancials.dailyRevenue >= dailyFinancials.dailyGoal ? 'Meta diaria cumplida' : `Meta diaria: ${formatCurrencyCOP(dailyFinancials.dailyGoal)}`}
                            </span>
                        </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">No se encontraron movimientos para la fecha seleccionada.</p>
                      <div className="flex justify-center gap-2">
                         <Link href="/entry" passHref>
                            <Button variant="outline" size="sm">
                            <Edit3 className="mr-2 h-4 w-4" /> Registrar Ingresos
                            </Button>
                        </Link>
                         <Link href="/expenses" passHref>
                            <Button variant="outline" size="sm">
                            <TrendingDown className="mr-2 h-4 w-4" /> Registrar Gastos
                            </Button>
                        </Link>
                      </div>
                  </div>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div className="mt-8 text-center flex gap-4 justify-center">
        <Link href="/entry" passHref>
          <Button size="lg" variant="secondary">
            <Edit3 className="mr-2 h-5 w-5" /> Registrar Nuevos Ingresos
          </Button>
        </Link>
      </div>

    </div>
  );
}

    