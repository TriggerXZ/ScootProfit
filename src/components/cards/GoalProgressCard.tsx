
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrencyCOP } from '@/lib/formatters';
import { useSettings } from '@/hooks/useSettings';
import type { AggregatedTotal } from '@/types';
import { Target } from 'lucide-react';
import { LOCATIONS, LocationId } from '@/lib/constants';
import { calculateLocationTotalsForPeriod } from '@/lib/calculations';

interface GoalProgressCardProps {
  currentPeriod: AggregatedTotal | null;
}

export function GoalProgressCard({ currentPeriod }: GoalProgressCardProps) {
  const { settings, isLoading: isLoadingSettings } = useSettings();

  if (!currentPeriod || isLoadingSettings) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
           <Skeleton className="h-6 w-3/4 mb-2" />
           <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const { totalRevenueInPeriod, entries } = currentPeriod;
  const { monthlyGoal } = settings;
  const totalProgressPercentage = monthlyGoal > 0 ? (totalRevenueInPeriod / monthlyGoal) * 100 : 0;

  const locationTotalsInPeriod = calculateLocationTotalsForPeriod(entries);

  return (
    <Card className="shadow-lg">
      <CardHeader>
         <div className="flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            <CardTitle className="font-headline text-xl">Meta del Período</CardTitle>
          </div>
        <CardDescription>Rendimiento por ubicación vs. meta de 28 días.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.values(LOCATIONS).map(location => {
          const locationGoal = settings[`goal_${location.id}` as keyof typeof settings] as number;
          if (locationGoal === 0) return null; // Don't show locations without a goal

          const locationRevenue = locationTotalsInPeriod[location.id as LocationId];
          const progress = locationGoal > 0 ? (locationRevenue / locationGoal) * 100 : 0;
          
          return (
            <div key={location.id}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-foreground">{location.name}</span>
                <span className="text-xs text-muted-foreground">{`${Math.round(progress)}%`}</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{formatCurrencyCOP(locationRevenue)}</span>
                <span>{formatCurrencyCOP(locationGoal)}</span>
              </div>
            </div>
          );
        })}

        <div className="pt-4 border-t">
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-bold text-foreground">Total General</span>
                <span className="text-sm font-bold text-primary">{`${Math.round(totalProgressPercentage)}%`}</span>
            </div>
            <Progress value={totalProgressPercentage} className="h-3 [&>div]:bg-green-500" />
            <div className="flex justify-between text-sm font-medium text-muted-foreground mt-1">
                <span className="font-bold text-primary">{formatCurrencyCOP(totalRevenueInPeriod)}</span>
                <span className="font-bold">{formatCurrencyCOP(monthlyGoal)}</span>
            </div>
        </div>

      </CardContent>
    </Card>
  );
}
