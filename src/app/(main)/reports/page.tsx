
"use client";

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AggregatedSummarySection } from '@/components/sections/AggregatedSummarySection';
import { useRevenueEntries } from '@/hooks/useRevenueEntries';

export default function ReportsPage() {
  const { allWeeklyTotals, allMonthlyTotals, isLoading } = useRevenueEntries();

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-headline font-bold text-foreground">Reportes de Ingresos</h1>
      
      <Tabs defaultValue="weekly" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-1/2 lg:w-1/3 mb-6">
          <TabsTrigger value="weekly" className="text-base py-2.5">Semanal</TabsTrigger>
          <TabsTrigger value="monthly" className="text-base py-2.5">Mensual</TabsTrigger>
        </TabsList>
        <TabsContent value="weekly">
          <AggregatedSummarySection 
            title="Ingresos Semanales" 
            totals={allWeeklyTotals()} 
            isLoading={isLoading}
          />
        </TabsContent>
        <TabsContent value="monthly">
          <AggregatedSummarySection 
            title="Ingresos Mensuales" 
            totals={allMonthlyTotals()} 
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
