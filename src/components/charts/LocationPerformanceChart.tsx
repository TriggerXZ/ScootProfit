
"use client";

import React from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { formatCurrencyCOP } from '@/lib/formatters';
import { LOCATIONS } from '@/lib/constants';

interface LocationPerformanceChartProps {
  locationTotals: { [key: string]: number };
}

export function LocationPerformanceChart({ locationTotals }: LocationPerformanceChartProps) {
  const chartData = React.useMemo(() => {
    return Object.entries(locationTotals)
      .map(([locationId, total]) => ({
        name: (Object.values(LOCATIONS).find(l => l.id === locationId))?.name || locationId,
        total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [locationTotals]);
  
  const chartConfig = {
    total: {
      label: 'Total',
      color: 'hsl(var(--chart-2))',
    },
  };

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No hay datos para mostrar.
      </div>
    );
  }

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
            angle={-45}
            textAnchor="end"
            height={50}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${formatCurrencyCOP(Number(value)).replace(/\s*COP\s*/, '')}`}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted))' }}
            content={
              <ChartTooltipContent
                formatter={(value) => formatCurrencyCOP(Number(value))}
                labelClassName="font-bold"
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
