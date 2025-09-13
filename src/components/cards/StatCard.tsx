import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrencyCOP } from '@/lib/formatters';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  className?: string;
  valueClassName?: string;
  percentageChange?: number | null;
  comparisonValue?: number | null;
}

export function StatCard({ title, value, description, icon: Icon, className, valueClassName, percentageChange, comparisonValue }: StatCardProps) {
  const showPercentage = typeof percentageChange === 'number';
  const isPositive = showPercentage && percentageChange >= 0;

  // Determine comparison logic: use percentage if available, otherwise direct comparison
  const hasComparison = typeof comparisonValue === 'number';
  let comparisonChange: number | undefined = percentageChange;
  
  if (typeof comparisonChange === 'undefined' && hasComparison) {
      const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g,"")) : value;
      if (comparisonValue > 0) {
        comparisonChange = ((numericValue - comparisonValue) / comparisonValue) * 100;
      } else if (numericValue > 0) {
        comparisonChange = 100; // From 0 to positive is a 100% increase
      }
  }

  const isComparisonPositive = typeof comparisonChange === 'number' && comparisonChange >= 0;


  return (
    <Card className={cn("shadow-lg hover:shadow-xl transition-shadow duration-300", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className={cn("text-3xl font-bold font-headline text-foreground", valueClassName)}>{value}</div>
          {typeof comparisonChange === 'number' && (
            <div className={cn(
              "flex items-center text-sm font-semibold",
              isComparisonPositive ? "text-green-500" : "text-red-500"
            )}>
              {isComparisonPositive ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
              {comparisonChange.toFixed(1)}%
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground pt-1">{description}</p>
        {hasComparison && <p className="text-xs text-muted-foreground">vs. {formatCurrencyCOP(comparisonValue!)}</p>}
      </CardContent>
    </Card>
  );
}
