
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/cards/StatCard';
import { GoalProgressCard } from '@/components/cards/GoalProgressCard';
import { useRevenueEntries } from '@/hooks/useRevenueEntries';
import { formatCurrencyCOP, formatDate } from '@/lib/formatters';
import { calculateDailyTotal } from '@/lib/calculations';
import { LOCATIONS, LOCATION_IDS } from '@/lib/constants';
import { Calendar, DollarSign, Users, Edit3, TrendingUp, MapPin } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { WeeklyRevenueChart } from '@/components/charts/WeeklyRevenueChart';

export default function DashboardPage() {
  const { entries, isLoading, getDailySummary, allMonthlyTotals, refreshEntries } = useRevenueEntries();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [dailySummary, setDailySummary] = useState<ReturnType<typeof calculateDailyTotal> | null>(null);
  
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

  const currentMonthData = React.useMemo(() => {
    if (isLoading || entries.length === 0) return null;
    const totals = allMonthlyTotals();
    return totals.length > 0 ? totals[0] : null;
  }, [allMonthlyTotals, isLoading, entries]);


  const averageDailyRevenue = React.useMemo(() => {
    if (entries.length === 0) return 0;
    const dailyTotalsMap = new Map<string, { sum: number, count: number }>();
    entries.forEach(entry => {
      const dateStr = entry.date;
      const dailyTotalForEntry = calculateDailyTotal(entry).total;
      const current = dailyTotalsMap.get(dateStr) || { sum: 0, count: 0 };
      current.sum += dailyTotalForEntry;
      current.count = 1; 
      dailyTotalsMap.set(dateStr, current);
    });

    if (dailyTotalsMap.size === 0) return 0;
    
    let totalRevenue = 0;
    dailyTotalsMap.forEach(value => {
      totalRevenue += value.sum;
    });
    
    return totalRevenue / dailyTotalsMap.size;
  }, [entries]);


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
          title="Total Período Actual (28 días)" 
          value={formatCurrencyCOP(currentMonthData?.totalRevenueInPeriod ?? 0)}
          icon={Calendar}
          description={currentMonthData?.period ?? "Ingresos del último período"}
        />
        <StatCard 
          title="Promedio Diario (Hist.)" 
          value={formatCurrencyCOP(averageDailyRevenue)}
          icon={TrendingUp}
          description="Promedio de todos los registros"
        />
        <StatCard 
          title={`Total del Día (${selectedDate ? formatDate(format(selectedDate, 'yyyy-MM-dd'), 'd MMM') : 'N/A'})`} 
          value={dailySummary ? formatCurrencyCOP(dailySummary.total) : formatCurrencyCOP(0)}
          icon={DollarSign}
          description={dailySummary ? 'Ingresos consolidados del día' : 'No hay datos para esta fecha'}
        />
        <StatCard 
          title="Cuota por Miembro (Día)" 
          value={dailySummary ? formatCurrencyCOP(dailySummary.memberShare) : formatCurrencyCOP(0)}
          icon={Users}
          description="Basado en el total diario bruto"
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
          <GoalProgressCard currentPeriod={currentMonthData} />
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-xl">
                Detalle del {selectedDate ? formatDate(format(selectedDate, 'yyyy-MM-dd')) : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dailySummary ? (
                  <div className="space-y-4">
                    {LOCATION_IDS.map(locId => (
                      <div key={locId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-background rounded-md">
                            <MapPin className="h-5 w-5 text-primary" />
                          </div>
                          <span className="font-medium text-foreground">{(Object.values(LOCATIONS).find(l => l.id === locId))?.name || locId}</span>
                        </div>
                        <span className="font-semibold text-lg text-foreground">{formatCurrencyCOP(dailySummary.locationTotals[locId])}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">No se encontraron ingresos para la fecha seleccionada.</p>
                      <Link href="/entry" passHref>
                        <Button variant="outline">
                          <Edit3 className="mr-2 h-4 w-4" /> Registrar Ingresos
                        </Button>
                      </Link>
                  </div>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div className="mt-8 text-center">
        <Link href="/entry" passHref>
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Edit3 className="mr-2 h-5 w-5" /> Registrar Nuevos Ingresos
          </Button>
        </Link>
      </div>
    </div>
  );
}
