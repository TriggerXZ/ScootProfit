
"use client";

import React from 'react';
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { formatCurrencyCOP } from '@/lib/formatters';
import { EXPENSE_CATEGORIES } from '@/lib/constants';
import type { Expense } from '@/types';

interface ExpenseCategoryChartProps {
  expenses: Expense[];
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
];

export function ExpenseCategoryChart({ expenses }: ExpenseCategoryChartProps) {
  const chartData = React.useMemo(() => {
    if (expenses.length === 0) return [];
    
    const categoryTotals: { [key: string]: number } = {};
    expenses.forEach(expense => {
      categoryTotals[expense.categoryId] = (categoryTotals[expense.categoryId] || 0) + expense.amount;
    });

    return Object.entries(categoryTotals)
      .map(([categoryId, total]) => ({
        name: EXPENSE_CATEGORIES.find(c => c.id === categoryId)?.name || 'Desconocida',
        value: total,
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No hay gastos registrados en este período.
      </div>
    );
  }

  return (
    <ChartContainer config={{}} className="w-full h-full">
      <ResponsiveContainer>
        <PieChart>
          <Tooltip
            content={
              <ChartTooltipContent
                nameKey="name"
                formatter={(value) => formatCurrencyCOP(Number(value))}
                labelClassName="font-bold"
                indicator="dot"
              />
            }
          />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={60}
            strokeWidth={2}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

    