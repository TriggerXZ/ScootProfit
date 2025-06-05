
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useRevenueEntries } from '@/hooks/useRevenueEntries';
import { predictMonthlyIncome, PredictMonthlyIncomeInput, PredictMonthlyIncomeOutput } from '@/ai/flows/predict-monthly-income';
import { getHistoricalMonthlyDataString } from '@/lib/calculations';
import { formatCurrencyCOP } from '@/lib/formatters';
import { Brain, Lightbulb, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';

export function PredictionSection() {
  const { entries, isLoading: entriesLoading } = useRevenueEntries();
  const [historicalData, setHistoricalData] = useState('');
  const [seasonalTrends, setSeasonalTrends] = useState('');
  const [predictionResult, setPredictionResult] = useState<PredictMonthlyIncomeOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (entries.length > 0) {
      setHistoricalData(getHistoricalMonthlyDataString(entries));
    }
  }, [entries]);

  const handlePredict = async () => {
    setIsLoading(true);
    setError(null);
    setPredictionResult(null);

    const input: PredictMonthlyIncomeInput = {
      historicalData,
      seasonalTrends: seasonalTrends || undefined,
    };

    try {
      const result = await predictMonthlyIncome(input);
      setPredictionResult(result);
    } catch (e) {
      console.error("Prediction error:", e);
      setError("Error al generar la predicción. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  if (entriesLoading) {
     return (
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-1/3" />
        </CardContent>
      </Card>
     );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-7 w-7 text-primary" />
          <CardTitle className="font-headline text-2xl">Predicción de Ingresos Mensuales</CardTitle>
        </div>
        <CardDescription>Estima ingresos futuros basado en datos históricos y tendencias estacionales.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="historicalData" className="font-semibold">Datos Históricos Mensuales (auto-generado)</Label>
          <Textarea
            id="historicalData"
            value={historicalData}
            onChange={(e) => setHistoricalData(e.target.value)}
            placeholder="Ej: Enero:1000000,Febrero:1200000..."
            rows={4}
            className="mt-1 bg-muted/50"
            readOnly={entries.length > 0}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {entries.length > 0 ? "Generado automáticamente de tus registros. Edita solo si es necesario." : "Ingresa datos manualmente si no hay registros."}
          </p>
        </div>
        <div>
          <Label htmlFor="seasonalTrends" className="font-semibold">Tendencias Estacionales (Opcional)</Label>
          <Textarea
            id="seasonalTrends"
            value={seasonalTrends}
            onChange={(e) => setSeasonalTrends(e.target.value)}
            placeholder="Ej: Incremento en vacaciones, disminución en temporada de lluvias..."
            rows={3}
            className="mt-1"
          />
        </div>
        <Button onClick={handlePredict} disabled={isLoading || !historicalData} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3">
          {isLoading ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Procesando...
            </div>
          ) : "Predecir Ingresos"}
        </Button>
      </CardContent>

      {error && (
        <CardFooter>
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardFooter>
      )}

      {predictionResult && (
        <CardFooter className="flex flex-col gap-4 items-start">
          <Alert variant="default" className="bg-primary/10 border-primary/30">
             <div className="flex items-center gap-2 mb-2">
               <TrendingUp className="h-6 w-6 text-primary" />
               <AlertTitle className="font-headline text-xl text-primary">Predicción Generada</AlertTitle>
             </div>
            <AlertDescription className="space-y-3">
              <p className="text-2xl font-bold text-accent">
                Ingreso Estimado: {formatCurrencyCOP(predictionResult.predictedIncome)}
              </p>
              <div>
                <h4 className="font-semibold text-foreground/80 flex items-center gap-1"><Lightbulb className="h-4 w-4 text-yellow-500" /> Razonamiento:</h4>
                <p className="text-sm text-foreground/70 whitespace-pre-wrap">{predictionResult.reasoning}</p>
              </div>
            </AlertDescription>
          </Alert>
        </CardFooter>
      )}
    </Card>
  );
}
