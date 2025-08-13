
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrencyCOP } from '@/lib/formatters';
import { LOCAL_STORAGE_SETTINGS_KEY, DEFAULT_MONTHLY_GOAL } from '@/lib/constants';
import type { AggregatedTotal } from '@/types';
import { Target } from 'lucide-react';

interface GoalProgressCardProps {
  currentPeriod: AggregatedTotal | null;
}

function getSettings() {
    if (typeof window === 'undefined') {
        return { monthlyGoal: DEFAULT_MONTHLY_GOAL };
    }
    const storedSettings = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
    if (storedSettings) {
        try {
            const parsed = JSON.parse(storedSettings);
            return {
                monthlyGoal: parsed.monthlyGoal || DEFAULT_MONTHLY_GOAL
            };
        } catch (e) {
            return { monthlyGoal: DEFAULT_MONTHLY_GOAL };
        }
    }
    return { monthlyGoal: DEFAULT_MONTHLY_GOAL };
}


export function GoalProgressCard({ currentPeriod }: GoalProgressCardProps) {
  const [settings, setSettings] = useState({ monthlyGoal: DEFAULT_MONTHLY_GOAL });

  useEffect(() => {
    setSettings(getSettings());
    
    const handleStorageChange = () => {
        setSettings(getSettings());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };

  }, []);

  if (!currentPeriod) {
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
            <Progress value={progressPercentage} className="h-3" />
            <div className="flex justify-between text-sm font-medium text-muted-foreground">
                <span className="text-foreground font-bold">{formatCurrencyCOP(totalRevenueInPeriod)}</span>
                <span className="text-primary">{formatCurrencyCOP(monthlyGoal)}</span>
            </div>
             <div className="flex justify-between text-xs">
                <span>Alcanzado</span>
                <span>Meta</span>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
