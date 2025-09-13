
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrencyCOP } from '@/lib/formatters';
import { useSettings } from '@/hooks/useSettings';
import type { AggregatedTotal } from '@/types';
import { Target } from 'lucide-react';

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
        <CardContent>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-8 w-1/2 mt-2" />
        </CardContent>
      </Card>
    );
  }

  const { totalRevenueInPeriod } = currentPeriod;
  const { monthlyGoal } = settings;
  const progressPercentage = monthlyGoal > 0 ? (totalRevenueInPeriod / monthlyGoal) * 100 : 0;
  const isGoalMet = totalRevenueInPeriod >= monthlyGoal;
  
  return (
    <Card className="shadow-lg">
      <CardHeader>
         <div className="flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            <CardTitle className="font-headline text-xl">Meta del Período</CardTitle>
          </div>
        <CardDescription>Progreso hacia la meta de ingresos de 28 días.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
            <Progress value={progressPercentage} className="h-3 [&>div]:bg-green-500" />
            <div className="flex justify-between text-sm font-medium">
                <span className={`font-bold ${isGoalMet ? 'text-green-400' : 'text-foreground'}`}>{formatCurrencyCOP(totalRevenueInPeriod)}</span>
                <span className="text-muted-foreground">{formatCurrencyCOP(monthlyGoal)}</span>
            </div>
             <div className="flex justify-between text-xs text-muted-foreground">
                <span>Alcanzado</span>
                <span>Meta</span>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}

    