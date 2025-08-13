
"use client";

import React from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { formatCurrencyCOP } from '@/lib/formatters';
import { GROUPS } from '@/lib/constants';

interface GroupPerformanceChartProps {
  groupTotals: { [key: string]: number };
}

export function GroupPerformanceChart({ groupTotals }: GroupPerformanceChartProps) {
  const chartData = React.useMemo(() => {
    return Object.entries(groupTotals)
      .map(([groupId, total]) => ({
        name: (Object.values(GROUPS).find(g => g.id === groupId))?.name || groupId,
        total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [groupTotals]);
  
  const chartConfig = {
    total: {
      label: 'Total',
      color: 'hsl(var(--chart-1))',
    },
  };

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No hay datos suficientes para mostrar el gráfico.
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="w-full h-full">
      <ResponsiveContainer>
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <XAxis
            type="number"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${formatCurrencyCOP(Number(value)).replace(/\s*COP\s*/, '')}`}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={80}
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
            radius={4} 
            layout="vertical"
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
