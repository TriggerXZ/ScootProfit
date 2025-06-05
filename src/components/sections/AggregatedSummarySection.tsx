
"use client";

import React from 'react';
import type { AggregatedTotal, RevenueEntry } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { formatCurrencyCOP, formatDate } from '@/lib/formatters';
import { LOCATIONS, LOCATION_IDS } from '@/lib/constants';
import { calculateLocationTotalsForPeriod } from '@/lib/calculations';
import { CalendarDays, MapPin, Users } from 'lucide-react';

interface AggregatedSummarySectionProps {
  title: string;
  totals: AggregatedTotal[];
  isLoading: boolean;
}

export function AggregatedSummarySection({ title, totals, isLoading }: AggregatedSummarySectionProps) {
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
        <CardDescription>Resumen de ingresos agregados.</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {totals.map((item, index) => {
            const locationTotalsInPeriod = calculateLocationTotalsForPeriod(item.entries);
            return (
              <AccordionItem value={`item-${index}`} key={item.period}>
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex justify-between items-center w-full pr-4">
                    <span className="text-lg font-medium flex items-center">
                      <CalendarDays className="mr-2 h-5 w-5 text-primary" />
                      {item.period}
                    </span>
                    <div className="text-right">
                      <div className="text-xl font-semibold text-accent">{formatCurrencyCOP(item.total)}</div>
                      <div className="text-xs text-muted-foreground flex items-center justify-end gap-1 mt-1">
                        <Users className="h-3 w-3" />
                        <span>Cuota Miembro: {formatCurrencyCOP(item.memberShare)}</span>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4 px-2 space-y-3 bg-muted/30 rounded-md">
                   <h4 className="text-md font-semibold mb-2 text-foreground">Detalle por Punto de Venta:</h4>
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
                  <h4 className="text-md font-semibold mt-3 mb-1 text-foreground">Registros Individuales:</h4>
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
