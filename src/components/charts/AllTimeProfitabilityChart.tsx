
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
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { AggregatedTotal } from '@/types';
import { formatCurrencyCOP } from '@/lib/formatters';
import { parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AllTimeProfitabilityChartProps {
  monthlyTotals: AggregatedTotal[];
}

export function AllTimeProfitabilityChart({ monthlyTotals }: AllTimeProfitabilityChartProps) {

  const chartData = React.useMemo(() => {
    return monthlyTotals
      .map(monthly => ({
        name: format(parseISO(monthly.entries[0].date), 'MMM yy', { locale: es }),
        Ingresos: monthly.totalRevenueInPeriod,
        Gastos: monthly.totalVariableExpenses + monthly.deductionsDetail.totalDeductions,
        Beneficio: monthly.finalNetProfit,
      }))
      .reverse(); // reverse to show chronologically
  }, [monthlyTotals]);

  const chartConfig = {
    Ingresos: {
      label: 'Ingresos',
      color: 'hsl(var(--chart-1))',
    },
    Gastos: {
      label: 'Gastos Totales',
      color: 'hsl(var(--chart-3))',
    },
    Beneficio: {
        label: 'Beneficio Neto',
        color: 'hsl(var(--chart-2))',
    },
  };

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No hay suficientes datos históricos para mostrar el gráfico.
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
            <Bar dataKey="Ingresos" fill="var(--color-Ingresos)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Gastos" fill="var(--color-Gastos)" radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="Beneficio" stroke="var(--color-Beneficio)" strokeWidth={2} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
