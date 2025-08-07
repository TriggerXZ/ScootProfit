
"use client";

import React from 'react';
import type { AggregatedTotal } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { formatCurrencyCOP, formatDate } from '@/lib/formatters';
import { 
  LOCATIONS, 
  LOCATION_IDS, 
  DEDUCTION_ZONA_SEGURA_PER_MEMBER,
  DEDUCTION_ARRIENDO_PER_MEMBER,
  DEDUCTION_APORTE_COOPERATIVA_PER_MEMBER,
  GROUPS,
  GROUP_IDS
} from '@/lib/constants';
import { calculateLocationTotalsForPeriod } from '@/lib/calculations';
import { CalendarDays, MapPin, Users, FileText, TrendingDown, CircleDollarSign, AlertCircle, Banknote, Group } from 'lucide-react';

interface AggregatedSummarySectionProps {
  title: string;
  totals: AggregatedTotal[];
  isLoading: boolean;
  onDownloadInvoice: (item: AggregatedTotal) => void;
}

export function AggregatedSummarySection({ title, totals, isLoading, onDownloadInvoice }: AggregatedSummarySectionProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
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
        <Accordion type="single" collapsible className="w-full">
          {totals.map((item, index) => {
            const locationTotalsInPeriod = calculateLocationTotalsForPeriod(item.entries);
            const showDeductionsDetails = item.deductionsDetail.totalDeductions > 0;

            return (
              <AccordionItem value={`item-${index}`} key={item.period}>
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex justify-between items-center w-full pr-4">
                    <span className="text-lg font-medium flex items-center">
                      <CalendarDays className="mr-2 h-5 w-5 text-primary" />
                      {item.period}
                    </span>
                    <div className="text-right">
                      <div className="text-xl font-semibold text-accent flex items-center justify-end">
                         <Banknote className="mr-1 h-5 w-5 text-accent/80" />
                        {formatCurrencyCOP(item.totalRevenueInPeriod)}
                      </div>
                      <div className="text-xs text-muted-foreground">Ingresos Totales del Periodo</div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4 px-2 space-y-4 bg-muted/30 rounded-md">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <div className="font-medium text-foreground">Total Ingresos Brutos del Periodo:</div>
                    <div className="md:text-right font-semibold">{formatCurrencyCOP(item.totalRevenueInPeriod)}</div>

                    <div className="font-medium text-foreground">Cuota Bruta Estimada por Miembro:</div>
                    <div className="md:text-right">{formatCurrencyCOP(item.grossMemberShare)}</div>
                    
                    {showDeductionsDetails && (
                      <>
                        <div className="col-span-1 md:col-span-2 mt-2 mb-1 font-semibold text-foreground">(-) Costos Operativos del Negocio:</div>
                        
                        <div className="text-muted-foreground pl-4">Zona Segura (Total Negocio):</div>
                        <div className="md:text-right text-muted-foreground">
                          {formatCurrencyCOP(item.deductionsDetail.zonaSegura)}
                          <span className="text-xs ml-1">({formatCurrencyCOP(DEDUCTION_ZONA_SEGURA_PER_MEMBER)} / miembro)</span>
                        </div>
                        
                        <div className="text-muted-foreground pl-4">Arriendo (Total Negocio):</div>
                        <div className="md:text-right text-muted-foreground">
                          {formatCurrencyCOP(item.deductionsDetail.arriendo)}
                          <span className="text-xs ml-1">({formatCurrencyCOP(DEDUCTION_ARRIENDO_PER_MEMBER)} / miembro)</span>
                        </div>

                        <div className="text-muted-foreground pl-4">Aporte Cooperativa (Total Negocio):</div>
                        <div className="md:text-right text-muted-foreground">
                          {formatCurrencyCOP(item.deductionsDetail.aporteCooperativa)}
                          <span className="text-xs ml-1">({formatCurrencyCOP(DEDUCTION_APORTE_COOPERATIVA_PER_MEMBER)} / miembro)</span>
                        </div>

                        <div className="font-medium text-foreground">Total Costos Operativos:</div>
                        <div className="md:text-right font-semibold">{formatCurrencyCOP(item.deductionsDetail.totalDeductions)}</div>
                        
                        <div className="col-span-1 md:col-span-2 mt-2 mb-1 font-semibold text-foreground">(=) Distribución a Miembros:</div>

                        <div className="font-medium text-foreground">Ingreso Neto a Distribuir (Total):</div>
                         <div className={`md:text-right font-semibold ${item.netRevenueToDistribute < 0 ? 'text-destructive' : 'text-green-600'}`}>
                          {formatCurrencyCOP(item.netRevenueToDistribute)}
                          {item.netRevenueToDistribute < 0 && <AlertCircle className="inline ml-1 h-4 w-4" />}
                        </div>
                        
                        <div className="font-bold text-lg text-foreground mt-2">Cuota Neta Final por Miembro:</div>
                        <div className={`md:text-right font-bold text-lg mt-2 ${item.netMemberShare < 0 ? 'text-destructive' : 'text-accent'}`}>
                          {formatCurrencyCOP(item.netMemberShare)}
                          {item.netMemberShare < 0 && <AlertCircle className="inline ml-1 h-4 w-4" />}
                        </div>
                      </>
                    )}
                     {!showDeductionsDetails && (
                        <>
                           <div className="col-span-1 md:col-span-2 mt-2 font-semibold text-foreground">(=) Distribución a Miembros:</div>
                           <div className="font-bold text-lg text-foreground mt-2">Cuota Neta Final por Miembro:</div>
                           <div className={`md:text-right font-bold text-lg mt-2 text-accent`}>
                             {formatCurrencyCOP(item.netMemberShare)}
                           </div>
                        </>
                    )}
                  </div>
                  
                  <Button 
                    onClick={() => onDownloadInvoice(item)} 
                    variant="outline" 
                    size="sm"
                    className="mt-4 w-full md:w-auto"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Descargar Liquidación PDF
                  </Button>

                  <h4 className="text-md font-semibold pt-3 border-t border-border mt-4 text-foreground flex items-center gap-2">
                    <Group className="h-5 w-5" />
                    Detalle por Grupo (Ingresos Brutos):
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {GROUP_IDS.map(groupId => (
                      <div key={groupId} className="flex items-center justify-between p-2 bg-card rounded-md border">
                        <span className="text-sm font-medium">{(Object.values(GROUPS).find(g => g.id === groupId))?.name || groupId}</span>
                        <span className="font-medium text-sm">{formatCurrencyCOP(item.groupRevenueTotals[groupId])}</span>
                      </div>
                    ))}
                  </div>
                  
                  <h4 className="text-md font-semibold pt-3 border-t border-border mt-4 text-foreground">Detalle por Punto de Venta (Ingresos Brutos):</h4>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {LOCATION_IDS.map(locId => (
                      <div key={locId} className="flex items-center justify-between p-2 bg-card rounded-md border">
                         <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{(Object.values(LOCATIONS).find(l => l.id === locId))?.name || locId}</span>
                          </div>
                        <span className="font-medium text-sm">{formatCurrencyCOP(locationTotalsInPeriod[locId])}</span>
                      </div>
                    ))}
                  </div>

                  <h4 className="text-md font-semibold mt-3 mb-1 text-foreground">Registros Individuales (Ingresos Brutos Diarios):</h4>
                  <ul className="space-y-1 max-h-60 overflow-y-auto pr-1">
                    {item.entries.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(entry => (
                      <li key={entry.id} className="text-sm text-muted-foreground flex justify-between items-center p-1.5 bg-card rounded">
                        <span>{formatDate(entry.date, 'PPP')}</span>
                        <span>{formatCurrencyCOP(LOCATION_IDS.reduce((sum, locId) => sum + entry.revenues[locId], 0))}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
