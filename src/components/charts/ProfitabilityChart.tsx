
"use client";

import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { RevenueEntry, Expense } from '@/types';
import { format, parseISO, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { calculateDailyTotal } from '@/lib/calculations';
import { formatCurrencyCOP } from '@/lib/formatters';
import { useSettings } from '@/hooks/useSettings';

interface ProfitabilityChartProps {
  revenueEntries: RevenueEntry[];
  expenses: Expense[];
  totalFixedCosts: number;
}

export function ProfitabilityChart({ revenueEntries, expenses, totalFixedCosts }: ProfitabilityChartProps) {
  const { settings, isLoading: isLoadingSettings } = useSettings();

  const chartData = React.useMemo(() => {
    if (revenueEntries.length === 0 || isLoadingSettings) return [];

    const firstDate = parseISO(revenueEntries[revenueEntries.length - 1].date);
    const monthStart = startOfMonth(firstDate);
    const monthEnd = endOfMonth(firstDate);
    const allDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const revenueMap = new Map<string, number>();
    revenueEntries.forEach(entry => {
        const total = calculateDailyTotal(entry, settings).total;
        revenueMap.set(entry.date, (revenueMap.get(entry.date) || 0) + total);
    });

    const expenseMap = new Map<string, number>();
    expenses.forEach(expense => {
        expenseMap.set(expense.date, (expenseMap.get(expense.date) || 0) + expense.amount);
    });

    let cumulativeRevenue = 0;
    return allDaysInMonth.map(date => {
        const dateString = format(date, 'yyyy-MM-dd');
        const revenue = revenueMap.get(dateString) || 0;
        const expense = expenseMap.get(dateString) || 0;
        cumulativeRevenue += revenue;
        return {
            name: format(date, 'd', { locale: es }),
            Ingresos: revenue,
            Gastos: expense,
            Neto: revenue - expense,
            'Ingreso Acumulado': cumulativeRevenue,
        };
    });
  }, [revenueEntries, expenses, settings, isLoadingSettings]);
  
  const chartConfig = {
    Ingresos: {
      label: 'Ingresos Diarios',
      color: 'hsl(var(--chart-1))',
    },
    Gastos: {
      label: 'Gastos Diarios',
      color: 'hsl(var(--chart-3))',
    },
    'Ingreso Acumulado': {
        label: 'Ingreso Acumulado',
        color: 'hsl(var(--chart-2))',
    },
    'Costos Fijos': {
        label: 'Costos Fijos (Punto de Equilibrio)',
        color: 'hsl(var(--chart-4))'
    }
  };

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No hay datos para mostrar el gráfico de rentabilidad.
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="w-full h-full">
      <ResponsiveContainer>
        <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
            />
            <YAxis
                yAxisId="left"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${formatCurrencyCOP(Number(value) / 1000)}k`}
            />
            <YAxis
                yAxisId="right"
                orientation="right"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${formatCurrencyCOP(Number(value) / 1000000)}M`}
            />
            <Tooltip
                content={
                    <ChartTooltipContent
                        formatter={(value, name) => (
                           <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full" style={{backgroundColor: chartConfig[name as keyof typeof chartConfig]?.color}}></div>
                                <span>{chartConfig[name as keyof typeof chartConfig]?.label}: </span>
                                <span className="font-bold">{formatCurrencyCOP(Number(value))}</span>
                           </div>
                        )}
                        labelClassName="font-bold"
                    />
                }
            />
            <Legend />
            <ReferenceLine y={totalFixedCosts} yAxisId="right" stroke="hsl(var(--chart-4))" strokeDasharray="3 3" strokeWidth={2}>
                 <Legend payload={[{ value: 'Costos Fijos', type: 'line', color: 'hsl(var(--chart-4))' }]} />
            </ReferenceLine>
            <Bar yAxisId="left" dataKey="Ingresos" fill="var(--color-Ingresos)" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="left" dataKey="Gastos" fill="var(--color-Gastos)" radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="Ingreso Acumulado" stroke="var(--color-Ingreso Acumulado)" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
