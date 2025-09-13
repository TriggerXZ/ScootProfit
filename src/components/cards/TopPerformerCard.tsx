
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrencyCOP } from '@/lib/formatters';
import { Award, MapPin, Users } from 'lucide-react';

interface Performer {
    name: string;
    total: number;
}

interface TopPerformerCardProps {
  topGroup: Performer | null;
  topLocation: Performer | null;
  periodLabel?: string;
}

export function TopPerformerCard({ topGroup, topLocation, periodLabel }: TopPerformerCardProps) {

  if (!topGroup || !topLocation) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
           <Skeleton className="h-6 w-3/4 mb-2" />
           <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full mt-2" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="shadow-lg">
      <CardHeader>
         <div className="flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            <CardTitle className="font-headline text-xl">Líderes del Período</CardTitle>
          </div>
        <CardDescription>{periodLabel || "Período actual"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded-lg">
            <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-amber-600" />
                <div className='flex flex-col'>
                    <span className="text-xs text-amber-700">Grupo con Mayor Ingreso</span>
                    <span className="font-semibold text-amber-800">{topGroup.name}</span>
                </div>
            </div>
            <span className="font-bold text-lg text-amber-600">{formatCurrencyCOP(topGroup.total)}</span>
        </div>
         <div className="flex items-center justify-between p-3 bg-sky-500/10 rounded-lg">
            <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-sky-600" />
                 <div className='flex flex-col'>
                    <span className="text-xs text-sky-700">Ubicación con Mayor Ingreso</span>
                    <span className="font-semibold text-sky-800">{topLocation.name}</span>
                </div>
            </div>
            <span className="font-bold text-lg text-sky-600">{formatCurrencyCOP(topLocation.total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
