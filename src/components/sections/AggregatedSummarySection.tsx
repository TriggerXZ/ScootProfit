
"use client";

import React from 'react';
import type { AggregatedTotal } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { formatCurrencyCOP } from '@/lib/formatters';
import { 
  LOCATIONS, 
  LOCATION_IDS, 
  GROUPS,
  GROUP_IDS,
} from '@/lib/constants';
import { calculateLocationTotalsForPeriod } from '@/lib/calculations';
import { CalendarDays, MapPin, FileText, AlertCircle, Group, TrendingUp, TrendingDown } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';


export function AggregatedSummarySection({ title, totals, isLoading, onDownloadInvoice }: {
  title: string;
  totals: AggregatedTotal[];
  isLoading: boolean;
  onDownloadInvoice: (item: AggregatedTotal) => void;
}) {
  const { settings, isLoading: isLoadingSettings } = useSettings();
  
  const finalIsLoading = isLoading || isLoadingSettings;

  if (finalIsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (totals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No hay datos disponibles para mostrar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">{title}</CardTitle>
        <CardDescription>Resumen de ingresos agregados con deducciones y cuota neta.</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
          {totals.map((item, index) => {
            const locationTotalsInPeriod = calculateLocationTotalsForPeriod(item.entries);
            const isWeeklyReport = title.toLowerCase().includes('semanal');
            const goal = isWeeklyReport ? settings.weeklyGoal : settings.monthlyGoal;
            const isGoalMet = item.totalRevenueInPeriod >= goal;

            return (
              <AccordionItem value={`item-${index}`} key={item.period}>
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex justify-between items-center w-full pr-4">
                    <span className="text-lg font-medium flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-primary" />
                      <span className="text-left">{item.period}</span>
                    </span>
                    <div className="text-right">
                      <div className={`text-xl font-semibold flex items-center justify-end ${item.finalNetProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                         {item.finalNetProfit >= 0 ? <TrendingUp className="mr-1 h-5 w-5" /> : <TrendingDown className="mr-1 h-5 w-5" />}
                        {formatCurrencyCOP(item.finalNetProfit)}
                      </div>
                      <div className="text-xs text-muted-foreground">Beneficio Neto del Periodo</div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4 px-4 space-y-6 bg-muted/30 rounded-md border">
                  
                  {/* Revenue Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                     <div className="space-y-4">
                        <h4 className="text-md font-semibold text-foreground flex items-center gap-2">
                          <Group className="h-5 w-5" />
                          Detalle por Grupo (Ingresos Brutos)
                        </h4>
                        <div className="space-y-2">
                          {GROUP_IDS.map(groupId => (
                            <div key={groupId} className="flex items-center justify-between p-2 bg-card rounded-md">
                              <span className="text-sm font-medium">{(Object.values(GROUPS).find(g => g.id === groupId))?.name || groupId}</span>
                              <span className="font-medium text-sm">{formatCurrencyCOP(item.groupRevenueTotals[groupId])}</span>
                            </div>
                          ))}
                        </div>
                     </div>
                      <div className="space-y-4">
                        <h4 className="text-md font-semibold text-foreground flex items-center gap-2">
                          <MapPin className="h-5 w-5" />
                           Detalle por Punto (Ingresos Brutos)
                        </h4>
                        <div className="space-y-2">
                          {LOCATION_IDS.map(locId => (
                            <div key={locId} className="flex items-center justify-between p-2 bg-card rounded-md">
                              <span className="text-sm font-medium">{(Object.values(LOCATIONS).find(l => l.id === locId))?.name || locId}</span>
                              <span className="font-medium text-sm">{formatCurrencyCOP(locationTotalsInPeriod[locId])}</span>
                            </div>
                          ))}
                        </div>
                     </div>
                  </div>

                  {/* Financial Summary */}
                   <div className="pt-4 border-t">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                        {/* Left Column: Gross Figures */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-foreground">Total Ingresos Brutos del Periodo:</span>
                                <span className="font-semibold text-green-500">{formatCurrencyCOP(item.totalRevenueInPeriod)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-foreground">Total Costos Fijos:</span>
                                <span className="text-muted-foreground">({formatCurrencyCOP(item.deductionsDetail.totalDeductions)})</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-foreground">Total Gastos Variables:</span>
                                <span className="text-muted-foreground">({formatCurrencyCOP(item.totalVariableExpenses)})</span>
                            </div>
                        </div>

                        {/* Right Column: Net Figures */}
                         <div className="space-y-3 p-3 rounded-md bg-card border">
                              <div className="flex justify-between items-center">
                                  <span className="font-medium text-foreground">Ingreso (después de costos fijos):</span>
                                  <span className={`font-semibold ${item.netRevenueToDistribute < 0 ? 'text-destructive' : 'text-foreground'}`}>
                                    {formatCurrencyCOP(item.netRevenueToDistribute)}
                                    {item.netRevenueToDistribute < 0 && <AlertCircle className="inline ml-1 h-4 w-4" />}
                                  </span>
                              </div>
                              <div className="flex justify-between items-center font-bold text-lg">
                                  <span className="text-primary">Beneficio Neto Final del Periodo:</span>
                                  <span className={`text-primary ${item.finalNetProfit < 0 ? 'text-destructive' : ''}`}>
                                    {formatCurrencyCOP(item.finalNetProfit)}
                                  </span>
                              </div>
                           </div>
                     </div>
                  </div>
                  
                  {/* Final Net Share */}
                  <div className="pt-6 border-t mt-4 text-center">
                      <h4 className="text-lg font-headline text-foreground">Cuota Neta Final por Miembro</h4>
                      <div className={`text-3xl font-bold mt-2 ${item.netMemberShare < 0 ? 'text-destructive' : 'text-primary'}`}>
                          {formatCurrencyCOP(item.netMemberShare)}
                          {item.netMemberShare < 0 && <AlertCircle className="inline ml-2 h-6 w-6" />}
                      </div>
                       <p className="text-xs text-muted-foreground mt-1">Este es el monto final a liquidar por miembro después de todos los costos.</p>
                  </div>


                  {/* Actions */}
                  <div className="pt-4 border-t flex justify-end">
                      <Button 
                        onClick={() => onDownloadInvoice(item)} 
                        variant="outline" 
                        size="sm"
                        className="mt-4"
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Descargar Liquidación PDF
                      </Button>
                  </div>

                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
