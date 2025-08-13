
"use client";

import React from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { RevenueEntry } from '@/types';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { calculateDailyTotal } from '@/lib/calculations';
import { formatCurrencyCOP } from '@/lib/formatters';

interface WeeklyRevenueChartProps {
  entries: RevenueEntry[];
}

export function WeeklyRevenueChart({ entries }: WeeklyRevenueChartProps) {
  const chartData = React.useMemo(() => {
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dateString = format(date, 'yyyy-MM-dd');
      const dayEntry = entries.find(e => e.date === dateString);
      const total = dayEntry ? calculateDailyTotal(dayEntry).total : 0;
      data.push({
        name: format(date, 'EEE', { locale: es }), // e.g., 'lun', 'mar'
        date: format(date, 'd MMM', { locale: es }),
        total,
      });
    }
    return data;
  }, [entries]);
  
  const chartConfig = {
    total: {
      label: 'Total',
      color: 'hsl(var(--primary))',
    },
  };

  return (
    <ChartContainer config={chartConfig} className="w-full h-full">
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
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
            tickFormatter={(value) => `${formatCurrencyCOP(value).replace(/\s*COP\s*/, '')}`}
          />
          <Tooltip
            cursor={false}
            content={
              <ChartTooltipContent
                formatter={(value, name, item) => (
                  <div className="flex flex-col gap-1">
                     <span className="font-bold text-foreground">{item.payload.date}</span>
                     <span className="text-sm text-foreground">{formatCurrencyCOP(Number(value))}</span>
                  </div>
                )}
                 labelClassName="text-lg font-bold"
                 indicator="dot"
              />
            }
          />
          <Bar
            dataKey="total"
            fill="var(--color-total)"
            radius={[4, 4, 0, 0]} 
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
