
"use client";

import React, { useState, useEffect } from 'react';
import type { AggregatedTotal } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { formatCurrencyCOP } from '@/lib/formatters';
import { 
  LOCATIONS, 
  LOCATION_IDS, 
  DEDUCTION_ZONA_SEGURA_PER_MEMBER,
  DEDUCTION_ARRIENDO_PER_MEMBER,
  DEDUCTION_APORTE_COOPERATIVA_PER_MEMBER,
  GROUPS,
  GROUP_IDS,
  LOCAL_STORAGE_SETTINGS_KEY,
  DEFAULT_WEEKLY_GOAL,
} from '@/lib/constants';
import { calculateLocationTotalsForPeriod } from '@/lib/calculations';
import { CalendarDays, MapPin, FileText, TrendingDown, AlertCircle, Group, TrendingUp, TrendingDown as TrendingDownIcon } from 'lucide-react';

interface AggregatedSummarySectionProps {
  title: string;
  totals: AggregatedTotal[];
  isLoading: boolean;
  onDownloadInvoice: (item: AggregatedTotal) => void;
}

function getWeeklyGoalFromSettings(): number {
    if (typeof window === 'undefined') {
        return DEFAULT_WEEKLY_GOAL;
    }
    const storedSettings = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
    if (storedSettings) {
        try {
            const parsed = JSON.parse(storedSettings);
            return parsed.weeklyGoal || DEFAULT_WEEKLY_GOAL;
        } catch (e) {
            return DEFAULT_WEEKLY_GOAL;
        }
    }
    return DEFAULT_WEEKLY_GOAL;
}


export function AggregatedSummarySection({ title, totals, isLoading, onDownloadInvoice }: AggregatedSummarySectionProps) {
  const [weeklyGoal, setWeeklyGoal] = useState(DEFAULT_WEEKLY_GOAL);

  useEffect(() => {
    setWeeklyGoal(getWeeklyGoalFromSettings());
    
    const handleStorageChange = () => {
        setWeeklyGoal(getWeeklyGoalFromSettings());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  if (isLoading) {
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
            const showDeductionsDetails = item.deductionsDetail.totalDeductions > 0;
            // Determine if the goal is met only for weekly reports
            const isWeeklyReport = title.toLowerCase().includes('semanal');
            const isGoalMet = isWeeklyReport ? item.totalRevenueInPeriod >= weeklyGoal : true;

            return (
              <AccordionItem value={`item-${index}`} key={item.period}>
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex justify-between items-center w-full pr-4">
                    <span className="text-lg font-medium flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-primary" />
                      <span className="text-left">{item.period}</span>
                    </span>
                    <div className="text-right">
                      <div className={`text-xl font-semibold flex items-center justify-end ${isWeeklyReport ? (isGoalMet ? 'text-green-500' : 'text-red-500') : 'text-foreground'}`}>
                         {isWeeklyReport && (isGoalMet ? <TrendingUp className="mr-1 h-5 w-5" /> : <TrendingDownIcon className="mr-1 h-5 w-5" />)}
                        {formatCurrencyCOP(item.totalRevenueInPeriod)}
                      </div>
                      <div className="text-xs text-muted-foreground">Ingresos Totales del Periodo</div>
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
                                <span className="font-semibold text-foreground">{formatCurrencyCOP(item.totalRevenueInPeriod)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-foreground">Cuota Bruta Estimada por Miembro:</span>
                                <span className="text-muted-foreground">{formatCurrencyCOP(item.grossMemberShare)}</span>
                            </div>
                        </div>

                        {/* Right Column: Net Figures */}
                        {showDeductionsDetails ? (
                           <div className="space-y-3 p-3 rounded-md bg-card border">
                              <div className="flex justify-between items-center">
                                  <span className="font-medium text-foreground">Ingreso Neto a Distribuir:</span>
                                  <span className={`font-semibold ${item.netRevenueToDistribute < 0 ? 'text-destructive' : 'text-green-600'}`}>
                                    {formatCurrencyCOP(item.netRevenueToDistribute)}
                                    {item.netRevenueToDistribute < 0 && <AlertCircle className="inline ml-1 h-4 w-4" />}
                                  </span>
                              </div>
                              <div className="flex justify-between items-center font-bold text-lg">
                                  <span className="text-primary">Cuota Neta Final por Miembro:</span>
                                  <span className={`text-primary ${item.netMemberShare < 0 ? 'text-destructive' : ''}`}>
                                    {formatCurrencyCOP(item.netMemberShare)}
                                    {item.netMemberShare < 0 && <AlertCircle className="inline ml-1 h-4 w-4" />}
                                  </span>
                              </div>
                           </div>
                        ) : (
                           <div className="space-y-3 p-3 rounded-md bg-card border">
                               <div className="flex justify-between items-center font-bold text-lg">
                                 <span className="text-primary">Cuota Neta Final por Miembro:</span>
                                 <span className="text-primary">{formatCurrencyCOP(item.netMemberShare)}</span>
                               </div>
                               <p className="text-xs text-muted-foreground text-center pt-2">No se aplican costos operativos en este período semanal.</p>
                           </div>
                        )}
                     </div>
                  </div>

                  {/* Deductions Details (Conditional) */}
                  {showDeductionsDetails && (
                    <div className="pt-4 border-t">
                       <h4 className="text-md font-semibold text-foreground flex items-center gap-2 mb-3">
                          <TrendingDown className="h-5 w-5 text-destructive" />
                          Costos Operativos del Negocio (Total)
                       </h4>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                          <div className="p-3 bg-card rounded-md">
                            <p className="text-sm text-muted-foreground">Zona Segura</p>
                            <p className="font-semibold text-destructive">{formatCurrencyCOP(item.deductionsDetail.zonaSegura)}</p>
                            <p className="text-xs text-muted-foreground">({formatCurrencyCOP(DEDUCTION_ZONA_SEGURA_PER_MEMBER)}/miembro)</p>
                          </div>
                           <div className="p-3 bg-card rounded-md">
                            <p className="text-sm text-muted-foreground">Arriendo</p>
                            <p className="font-semibold text-destructive">{formatCurrencyCOP(item.deductionsDetail.arriendo)}</p>
                            <p className="text-xs text-muted-foreground">({formatCurrencyCOP(DEDUCTION_ARRIENDO_PER_MEMBER)}/miembro)</p>
                          </div>
                           <div className="p-3 bg-card rounded-md">
                            <p className="text-sm text-muted-foreground">Aporte Cooperativa</p>
                            <p className="font-semibold text-destructive">{formatCurrencyCOP(item.deductionsDetail.aporteCooperativa)}</p>
                            <p className="text-xs text-muted-foreground">({formatCurrencyCOP(DEDUCTION_APORTE_COOPERATIVA_PER_MEMBER)}/miembro)</p>
                          </div>
                       </div>
                    </div>
                  )}

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
