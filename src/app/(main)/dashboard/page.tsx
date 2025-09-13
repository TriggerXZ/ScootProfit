
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/cards/StatCard';
import { GoalProgressCard } from '@/components/cards/GoalProgressCard';
import { useRevenueEntries } from '@/hooks/useRevenueEntries';
import { useExpenses } from '@/hooks/useExpenses';
import { formatCurrencyCOP, formatDate } from '@/lib/formatters';
import { DatePicker } from '@/components/ui/DatePicker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { WeeklyRevenueChart } from '@/components/charts/WeeklyRevenueChart';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { predictMonthlyIncome, PredictMonthlyIncomeOutput } from '@/ai/flows/predict-income-flow';
import { getHistoricalMonthlyDataString } from '@/lib/calculations';
import { translateText } from '@/ai/flows/translate-text-flow';
import { useSettings } from '@/hooks/useSettings';
import { Edit3, BrainCircuit, Languages, TrendingUp, TrendingDown, Scale, Users } from 'lucide-react';


export default function DashboardPage() {
  const { entries, isLoading: isLoadingRevenues, all28DayTotals, getDailySummary, refreshEntries } = useRevenueEntries();
  const { expenses, isLoading: isLoadingExpenses } = useExpenses();
  const { settings, isLoading: isLoadingSettings } = useSettings();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [dailySummary, setDailySummary] = useState<ReturnType<typeof getDailySummary> | null>(null);
  const [isPredictionLoading, setIsPredictionLoading] = useState(false);
  const [predictionResult, setPredictionResult] = useState<PredictMonthlyIncomeOutput | null>(null);
  const [translatedPrediction, setTranslatedPrediction] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showPredictionDialog, setShowPredictionDialog] = useState(false);
  
  useEffect(() => {
    // Set initial date on client side to avoid hydration mismatch
    setSelectedDate(new Date());
  }, []);

  useEffect(() => {
    if (selectedDate) {
      const summary = getDailySummary(selectedDate);
      setDailySummary(summary);
    }
  }, [selectedDate, getDailySummary, entries]);

  useEffect(() => {
    refreshEntries(); 
  }, [refreshEntries]);
  
  const isLoading = isLoadingRevenues || isLoadingExpenses || isLoadingSettings;

  const { currentMonthData, previousMonthData } = useMemo(() => {
    if (isLoading || entries.length === 0) return { currentMonthData: null, previousMonthData: null };
    const totals = all28DayTotals(expenses);
    const current = totals.length > 0 ? totals[0] : null;
    const previous = totals.length > 1 ? totals[1] : null;
    return { currentMonthData: current, previousMonthData: previous };
  }, [all28DayTotals, isLoading, entries, expenses]);

  const dailyExpensesTotal = useMemo(() => {
      if (!selectedDate) return 0;
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      return expenses
          .filter(e => e.date === dateString)
          .reduce((sum, e) => sum + e.amount, 0);
  }, [selectedDate, expenses]);

  const percentageChange = useMemo(() => {
    if (currentMonthData && previousMonthData && typeof previousMonthData.totalRevenueInPeriod === 'number' && previousMonthData.totalRevenueInPeriod > 0) {
      return ((currentMonthData.totalRevenueInPeriod - previousMonthData.totalRevenueInPeriod) / previousMonthData.totalRevenueInPeriod) * 100;
    }
    return undefined;
  }, [currentMonthData, previousMonthData]);

  const handlePredictClick = async () => {
    setIsPredictionLoading(true);
    setPredictionResult(null);
    setTranslatedPrediction(null);
    setShowPredictionDialog(true);
    try {
      const historicalData = getHistoricalMonthlyDataString(entries, settings);
      if (historicalData.split(',').length < 2) {
         setPredictionResult({
          estimatedIncome: 0,
          analysis: "No hay suficientes datos históricos para realizar una predicción fiable. Se necesitan al menos dos períodos completos de 28 días."
        });
        return;
      }
      const result = await predictMonthlyIncome({ pastIncome: historicalData });
      setPredictionResult(result);
    } catch (error: any) {
      console.error("Prediction failed", error);
      let analysisMessage = "Ocurrió un error al contactar con el servicio de IA. Asegúrate de que tu clave de API de Gemini esté configurada correctamente como una variable de entorno (GEMINI_API_KEY).";
      if (error.message && (error.message.includes("overloaded") || error.message.includes("503"))) {
        analysisMessage = "El modelo de IA está actualmente sobrecargado. Por favor, inténtalo de nuevo en unos minutos.";
      }
      setPredictionResult({
        estimatedIncome: 0,
        analysis: analysisMessage
      });
    } finally {
      setIsPredictionLoading(false);
    }
  };
  
  const handleTranslatePrediction = async () => {
    if (!predictionResult || !predictionResult.analysis) return;
    setIsTranslating(true);
    try {
        const result = await translateText({ text: predictionResult.analysis, targetLanguage: 'Spanish' });
        setTranslatedPrediction(result.translatedText);
    } catch (error: any) {
        console.error("Translation failed", error);
        let errorMessage = "La traducción falló. Por favor, inténtalo de nuevo.";
        if (error.message && (error.message.includes("overloaded") || error.message.includes("503"))) {
            errorMessage = "El servicio de traducción está sobrecargado. Inténtalo de nuevo en unos momentos.";
        }
        setTranslatedPrediction(errorMessage);
    } finally {
        setIsTranslating(false);
    }
  };


  if (isLoading || selectedDate === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-10 w-1/4" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
        </div>
        <Skeleton className="h-80 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
            <h1 className="text-3xl font-headline font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Un resumen de la actividad reciente.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground shrink-0">Ver resumen para:</span>
          <DatePicker date={selectedDate} setDate={setSelectedDate} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Ingresos Período Actual" 
          value={formatCurrencyCOP(currentMonthData?.totalRevenueInPeriod ?? 0)}
          icon={TrendingUp}
          description={currentMonthData?.period ?? "Últimos 28 días"}
          percentageChange={percentageChange}
          comparisonValue={previousMonthData?.totalRevenueInPeriod}
        />
        <StatCard 
          title="Gastos Período Actual" 
          value={formatCurrencyCOP(currentMonthData?.totalVariableExpenses ?? 0)}
          icon={TrendingDown}
          description="Gastos variables registrados"
          comparisonValue={previousMonthData?.totalVariableExpenses}
        />
         <StatCard 
          title="Beneficio Neto Período" 
          value={formatCurrencyCOP(currentMonthData?.finalNetProfit ?? 0)}
          icon={Scale}
          description="Ingresos menos costos y gastos"
          valueClassName={currentMonthData && currentMonthData.finalNetProfit < 0 ? 'text-destructive' : 'text-primary'}
          comparisonValue={previousMonthData?.finalNetProfit}
        />
        <StatCard 
          title="Cuota Neta Miembro" 
          value={formatCurrencyCOP(currentMonthData?.netMemberShare ?? 0)}
          icon={Users}
          description="Beneficio final por miembro"
          valueClassName={currentMonthData && currentMonthData.netMemberShare < 0 ? 'text-destructive' : ''}
          comparisonValue={previousMonthData?.netMemberShare}
        />
      </div>
      
       <div className="grid gap-6 lg:grid-cols-5">
        <Card className="shadow-lg lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-headline text-xl">
              Ingresos de los Últimos 7 Días
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80 pl-2">
            <WeeklyRevenueChart entries={entries} />
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <GoalProgressCard currentPeriod={currentMonthData} />
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-xl">
                Detalle del {selectedDate ? formatDate(format(selectedDate, 'yyyy-MM-dd')) : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dailySummary || dailyExpensesTotal > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="h-5 w-5 text-green-600" />
                            <span className="font-medium text-green-700">Ingresos Totales del Día</span>
                        </div>
                        <span className="font-semibold text-lg text-green-600">{formatCurrencyCOP(dailySummary?.total ?? 0)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg">
                        <div className="flex items-center gap-3">
                            <TrendingDown className="h-5 w-5 text-red-600" />
                            <span className="font-medium text-red-700">Gastos Totales del Día</span>
                        </div>
                        <span className="font-semibold text-lg text-red-600">{formatCurrencyCOP(dailyExpensesTotal)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">No se encontraron movimientos para la fecha seleccionada.</p>
                      <div className="flex justify-center gap-2">
                         <Link href="/entry" passHref>
                            <Button variant="outline" size="sm">
                            <Edit3 className="mr-2 h-4 w-4" /> Registrar Ingresos
                            </Button>
                        </Link>
                         <Link href="/expenses" passHref>
                            <Button variant="outline" size="sm">
                            <TrendingDown className="mr-2 h-4 w-4" /> Registrar Gastos
                            </Button>
                        </Link>
                      </div>
                  </div>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div className="mt-8 text-center flex gap-4 justify-center">
        <Link href="/entry" passHref>
          <Button size="lg" variant="secondary">
            <Edit3 className="mr-2 h-5 w-5" /> Registrar Nuevos Ingresos
          </Button>
        </Link>
         <Button size="lg" onClick={handlePredictClick}>
            <BrainCircuit className="mr-2 h-5 w-5" />
            Obtener Predicción de IA
          </Button>
      </div>

       <AlertDialog open={showPredictionDialog} onOpenChange={setShowPredictionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
                <BrainCircuit className="h-6 w-6 text-primary" />
                Predicción de Ingresos (Próximos 28 días)
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isPredictionLoading
                ? "Analizando datos históricos y tendencias..."
                : "La IA ha analizado el historial de ingresos para generar una estimación para el siguiente período."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {isPredictionLoading ? (
            <div className="flex justify-center items-center h-24">
               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            predictionResult && (
               <div className="my-4 space-y-4">
                  <div>
                    <p className="text-lg text-muted-foreground">Ingreso Estimado:</p>
                    <p className="text-4xl font-bold text-primary">{formatCurrencyCOP(predictionResult.estimatedIncome)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-foreground font-semibold">Análisis de la IA:</p>
                    <p className="text-sm text-muted-foreground italic p-3 bg-muted/50 rounded-md">
                        {translatedPrediction ? `(Traducido) ${translatedPrediction}` : predictionResult.analysis}
                    </p>
                  </div>
                   {!translatedPrediction && (
                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleTranslatePrediction} 
                        disabled={isTranslating}
                    >
                        <Languages className="mr-2 h-4 w-4" />
                        {isTranslating ? 'Traduciendo...' : 'Traducir a Español'}
                    </Button>
                    )}
                </div>
            )
          )}
          
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowPredictionDialog(false)}>Entendido</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
