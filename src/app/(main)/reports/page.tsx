
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AggregatedSummarySection } from '@/components/sections/AggregatedSummarySection';
import { GroupPerformanceChart } from '@/components/charts/GroupPerformanceChart';
import { LocationPerformanceChart } from '@/components/charts/LocationPerformanceChart';
import { useRevenueEntries } from '@/hooks/useRevenueEntries';
import { useExpenses } from '@/hooks/useExpenses';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, BarChart2, BrainCircuit, Lightbulb, TrendingDown as TrendingDownIcon, CheckCircle, Languages, Users } from 'lucide-react';
import type { AggregatedTotal, RevenueEntry } from '@/types';
import { formatCurrencyCOP } from '@/lib/formatters';
import { GROUPS, LOCATIONS } from '@/lib/constants';
import { format, getMonth, getYear, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from '@/components/ui/alert-dialog';
import { analyzePerformance, AnalyzePerformanceOutput } from '@/ai/flows/analyze-performance-flow';
import { translateText } from '@/ai/flows/translate-text-flow';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getGroupForLocationOnDate } from '@/lib/calculations';

type TranslatedAnalysis = {
    executiveSummary?: string;
    positiveObservations?: string[];
    areasForImprovement?: string[];
    recommendations?: string[];
    groupComparison?: string;
};

export default function ReportsPage() {
  const { allWeeklyTotals, all28DayTotals, allCalendarMonthlyTotals, entries, isLoading: isLoadingRevenues } = useRevenueEntries();
  const { expenses, isLoading: isLoadingExpenses } = useExpenses();
  const [activeTab, setActiveTab] = useState('weekly');
  
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzePerformanceOutput | null>(null);
  const [translatedAnalysis, setTranslatedAnalysis] = useState<TranslatedAnalysis | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);

  const [filterType, setFilterType] = useState<'monthly' | 'allTime'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const { yearOptions, monthOptions } = useMemo(() => {
    if (entries.length === 0) {
      const currentYear = new Date().getFullYear();
      return {
        yearOptions: [currentYear],
        monthOptions: Array.from({ length: 12 }, (_, i) => ({ value: i, label: new Date(0, i).toLocaleString('es-ES', { month: 'long' }) }))
      };
    }
    
    const sortedEntries = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstEntryYear = getYear(parseISO(sortedEntries[0].date));
    const lastEntryYear = getYear(parseISO(sortedEntries[sortedEntries.length - 1].date));
    
    const years = [];
    for (let y = lastEntryYear; y >= firstEntryYear; y--) {
      years.push(y);
    }
    
    const months = Array.from({ length: 12 }, (_, i) => ({
      value: i,
      label: new Date(0, i).toLocaleString('es-ES', { month: 'long' }).replace(/^\w/, (c) => c.toUpperCase()),
    }));

    return { yearOptions: years, monthOptions: months };
  }, [entries]);

  const { groupTotals, locationTotals } = useMemo(() => {
      const groupMap: { [key: string]: number } = {};
      const locationMap: { [key: string]: number } = {};

      let entriesToAnalyze: RevenueEntry[] = [];

      if (filterType === 'allTime') {
          entriesToAnalyze = entries;
      } else {
          entriesToAnalyze = entries.filter(entry => {
              const entryDate = parseISO(entry.date);
              return getMonth(entryDate) === selectedMonth && getYear(entryDate) === selectedYear;
          });
      }

      entriesToAnalyze.forEach(entry => {
          const entryDate = parseISO(entry.date);
          // Aggregate location totals
          for (const [location, revenue] of Object.entries(entry.revenues)) {
              locationMap[location] = (locationMap[location] || 0) + revenue;
          }
          // Aggregate group totals
          for (const [locationId, revenue] of Object.entries(entry.revenues)) {
              const group = getGroupForLocationOnDate(locationId as any, entryDate);
              groupMap[group] = (groupMap[group] || 0) + revenue;
          }
      });

      return { groupTotals: groupMap, locationTotals: locationMap };
  }, [entries, filterType, selectedMonth, selectedYear]);
  
  const isLoading = isLoadingRevenues || isLoadingExpenses;

  const handleAnalyzeClick = async () => {
    setIsAnalysisLoading(true);
    setAnalysisResult(null);
    setTranslatedAnalysis(null);
    setShowAnalysisDialog(true);
    try {
      const groupTotalsString = Object.entries(groupTotals).map(([key, value]) => `${(GROUPS as any)[Object.keys(GROUPS).find(k => GROUPS[k as keyof typeof GROUPS].id === key) as any]?.name || key}: ${formatCurrencyCOP(value)}`).join(', ');
      const locationTotalsString = Object.entries(locationTotals).map(([key, value]) => `${(LOCATIONS as any)[Object.keys(LOCATIONS).find(k => LOCATIONS[k as keyof typeof LOCATIONS].id === key) as any]?.name || key}: ${formatCurrencyCOP(value)}`).join(', ');

      if (!groupTotalsString || !locationTotalsString || Object.keys(groupTotals).length < 1) {
        setAnalysisResult({
            executiveSummary: "No hay suficientes datos para un análisis.",
            positiveObservations: [],
            areasForImprovement: ["Se necesita al menos un período completo de datos para realizar un análisis significativo."],
            recommendations: [],
            groupComparison: "No hay datos suficientes para una comparación."
        });
        return;
      }

      const result = await analyzePerformance({ groupTotals: groupTotalsString, locationTotals: locationTotalsString });
      setAnalysisResult(result);
    } catch (error: any) {
        let errorMessage = "Ocurrió un error al contactar con el servicio de IA. Revisa la configuración de tu clave de API de Gemini o inténtalo de nuevo más tarde.";
        if (error.message && (error.message.includes("overloaded") || error.message.includes("503"))) {
            errorMessage = "El modelo de IA está actualmente sobrecargado. Por favor, inténtalo de nuevo en unos minutos.";
        }
        console.error("Analysis failed", error);
        setAnalysisResult({
            executiveSummary: "Error al realizar el análisis.",
            positiveObservations: [],
            areasForImprovement: [errorMessage],
            recommendations: [],
            groupComparison: "El análisis falló."
        });
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  const handleTranslateAnalysis = async () => {
      if (!analysisResult) return;
      setIsTranslating(true);
      
      const translate = async (text: string) => text ? (await translateText({ text, targetLanguage: 'Spanish' })).translatedText : "";
      const translateArray = (arr: string[]) => Promise.all(arr.map(item => translate(item)));

      try {
          const [summary, positives, improvements, recs, comparison] = await Promise.all([
              translate(analysisResult.executiveSummary),
              translateArray(analysisResult.positiveObservations),
              translateArray(analysisResult.areasForImprovement),
              translateArray(analysisResult.recommendations),
              translate(analysisResult.groupComparison)
          ]);
          setTranslatedAnalysis({
              executiveSummary: summary,
              positiveObservations: positives,
              areasForImprovement: improvements,
              recommendations: recs,
              groupComparison: comparison
          });
      } catch (error) {
          console.error("Translation failed", error);
          let errorMessage = "La traducción no pudo ser completada. Por favor, inténtelo de nuevo.";
          if (error instanceof Error && (error.message.includes("overloaded") || error.message.includes("503"))) {
            errorMessage = "El servicio de traducción está sobrecargado. Inténtalo de nuevo en unos momentos.";
          }
          setTranslatedAnalysis({ executiveSummary: errorMessage });
      } finally {
          setIsTranslating(false);
      }
  };

  const handleDownloadInvoicePDF = async (item: AggregatedTotal) => {
    const html2pdf = (await import('html2pdf.js')).default;
    const { es: localeEs } = await import('date-fns/locale/es');
    const currentDate = format(new Date(), 'PPP', { locale: localeEs });
    const textColor = '#2c3e50';

    const invoiceHTML = `
      <div style="font-family: Arial, sans-serif; width: 100%; max-width: 800px; margin: 20px auto; padding: 20px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0,0,0,0.1); font-size: 10pt; line-height: 1.5; color: ${textColor};">
        <h1 style="text-align: center; color: ${textColor}; font-size: 18px; margin-bottom: 10px;">Liquidación de Ingresos para Miembro</h1>
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="font-size: 16px; margin: 0; color: ${textColor};">ScootProfit</h2>
        </div>
        <table style="width: 100%; margin-bottom: 20px; font-size: 10pt; color: ${textColor};">
          <tr>
            <td style="font-weight: bold; padding: 4px; color: ${textColor};">Fecha de Emisión:</td>
            <td style="padding: 4px; color: ${textColor};">${currentDate}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; padding: 4px; color: ${textColor};">Período de Liquidación:</td>
            <td style="padding: 4px; color: ${textColor};">${item.period}</td>
          </tr>
        </table>
        
        <h3 style="border-bottom: 2px solid #eee; padding-bottom: 5px; margin-top: 20px; margin-bottom:10px; font-size: 14px; color: ${textColor};">Detalle de Liquidación</h3>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 10pt; color: ${textColor};">
          <thead>
            <tr>
              <th style="padding: 6px 8px; border: 1px solid #ddd; text-align: left; background-color: #f0f0f0; color: ${textColor};">Concepto</th>
              <th style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; background-color: #f0f0f0; color: ${textColor};">Valor (COP)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 6px 8px; border: 1px solid #ddd; color: ${textColor};">1. Total Ingresos Brutos del Período (Todos los puntos):</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; color: ${textColor};">${formatCurrencyCOP(item.totalRevenueInPeriod)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 8px; border: 1px solid #ddd; font-weight: bold; color: ${textColor};" colspan="2">2. Costos Operativos Fijos del Período:</td>
            </tr>
            <tr style="background-color: #fdfdfd;">
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left; color: ${textColor};">&nbsp;&nbsp;&nbsp;&nbsp;Pago Zona Segura:</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; color: ${textColor};">${formatCurrencyCOP(item.deductionsDetail.zonaSegura)}</td>
            </tr>
            <tr style="background-color: #fdfdfd;">
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left; color: ${textColor};">&nbsp;&nbsp;&nbsp;&nbsp;Arriendo:</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; color: ${textColor};">${formatCurrencyCOP(item.deductionsDetail.arriendo)}</td>
            </tr>
            <tr style="background-color: #fdfdfd;">
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left; color: ${textColor};">&nbsp;&nbsp;&nbsp;&nbsp;Aporte Cooperativa:</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; color: ${textColor};">${formatCurrencyCOP(item.deductionsDetail.aporteCooperativa)}</td>
            </tr>
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 6px 8px; border: 1px solid #ddd; font-weight: bold; color: ${textColor};">3. Total Costos Operativos Fijos (Sumatoria de 2):</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: ${textColor};">${formatCurrencyCOP(item.deductionsDetail.totalDeductions)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 8px; border: 1px solid #ddd; font-weight: bold; color: ${textColor};">4. Ingreso Neto del Período para Distribución (1 - 3):</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: ${item.netRevenueToDistribute < 0 ? '#dc3545' : textColor};">${formatCurrencyCOP(item.netRevenueToDistribute)}</td>
            </tr>
             <tr>
              <td style="padding: 6px 8px; border: 1px solid #ddd; color: ${textColor};">5. Total Gastos Variables del Período:</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; color: ${textColor};">(${formatCurrencyCOP(item.totalVariableExpenses)})</td>
            </tr>
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 6px 8px; border: 1px solid #ddd; font-weight: bold; color: ${textColor};">6. Beneficio Neto Final del Período (4 - 5):</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: ${item.finalNetProfit < 0 ? '#dc3545' : textColor};">${formatCurrencyCOP(item.finalNetProfit)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 8px; border: 1px solid #ddd; color: ${textColor};">7. Número de Miembros Participantes:</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; color: ${textColor};">${item.numberOfMembers}</td>
            </tr>
            <tr style="background-color: #f0f0f0;">
              <td style="padding: 10px 8px; border: 1px solid #ddd; font-weight: bold; font-size: 12pt; color: ${textColor};">8. Monto Neto a Pagar al Miembro (6 / 7):</td>
              <td style="padding: 10px 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; font-size: 12pt; color: ${item.netMemberShare < 0 ? '#dc3545' : '#28a745'};">${formatCurrencyCOP(item.netMemberShare)}</td>
            </tr>
          </tbody>
        </table>
        ${item.finalNetProfit < 0 ? `<p style="color: red; text-align: center; margin-top: 15px; font-size: 9pt;">Nota: El beneficio neto del período es negativo, lo que indica que los costos y gastos totales superaron los ingresos.</p>` : ''}
        <p style="text-align: center; margin-top: 25px; font-size: 9pt; color: #777;">Este es un documento generado automáticamente.</p>
      </div>
    `;

    const options = {
      margin: [10, 10, 10, 10], 
      filename: `liquidacion_miembro_${item.period.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      image: { type: 'png', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };
    
    try {
      await html2pdf().from(invoiceHTML).set(options).save();
    } catch (error) {
      console.error("Error generating invoice PDF:", error);
      alert("Hubo un error al generar la liquidación PDF. Por favor, inténtalo de nuevo.");
    }
  };


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold text-foreground">Reportes de Ingresos</h1>
        <p className="text-muted-foreground mt-1">Analiza los ingresos semanales, mensuales y el rendimiento por grupo y ubicación.</p>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
                <BarChart2 className="h-6 w-6 text-primary" />
                <CardTitle className="font-headline text-2xl">Análisis de Rendimiento</CardTitle>
            </div>
             <div className="flex items-center gap-2 flex-wrap">
                 <Tabs value={filterType} onValueChange={(value) => setFilterType(value as 'monthly' | 'allTime')} className="w-full sm:w-auto">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="monthly">Mensual</TabsTrigger>
                        <TabsTrigger value="allTime">Histórico</TabsTrigger>
                    </TabsList>
                </Tabs>
                {filterType === 'monthly' && (
                    <>
                        <Select value={String(selectedMonth)} onValueChange={(val) => setSelectedMonth(Number(val))}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Seleccionar mes" />
                            </SelectTrigger>
                            <SelectContent>
                                {monthOptions.map(month => (
                                    <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(Number(val))}>
                            <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Seleccionar año" />
                            </SelectTrigger>
                            <SelectContent>
                                {yearOptions.map(year => (
                                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </>
                )}
                <Button onClick={handleAnalyzeClick} variant="outline" size="sm" disabled={isAnalysisLoading || isLoading || Object.keys(groupTotals).length === 0}>
                    <BrainCircuit className="mr-2 h-4 w-4" />
                    Analizar con IA
                </Button>
            </div>
          </div>
          <CardDescription>
            {filterType === 'monthly'
                ? 'Visualiza los ingresos acumulados por grupo y ubicación para el período seleccionado.'
                : 'Visualiza el rendimiento histórico total por grupo y ubicación.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-8 md:grid-cols-2 pt-4">
          <div className="h-80">
            <h3 className="font-semibold mb-2 text-center">Rendimiento por Grupo</h3>
            <GroupPerformanceChart groupTotals={groupTotals} />
          </div>
          <div className="h-80">
            <h3 className="font-semibold mb-2 text-center">Ingresos por Ubicación</h3>
            <LocationPerformanceChart locationTotals={locationTotals} />
          </div>
        </CardContent>
      </Card>
      
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
          <h2 className="text-2xl font-headline font-bold text-foreground">Desglose de Períodos</h2>
        </div>
        <Tabs defaultValue="weekly" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 md:w-1/2 lg:w-1/3 mb-6">
            <TabsTrigger value="weekly" className="text-base py-2.5">Semanal</TabsTrigger>
            <TabsTrigger value="28-days" className="text-base py-2.5">28 Días</TabsTrigger>
            <TabsTrigger value="monthly" className="text-base py-2.5">Mensual (Calendario)</TabsTrigger>
          </TabsList>
          <TabsContent value="weekly">
              <AggregatedSummarySection 
                title="Ingresos Semanales" 
                totals={allWeeklyTotals(expenses)} 
                isLoading={isLoading}
                onDownloadInvoice={handleDownloadInvoicePDF}
              />
          </TabsContent>
          <TabsContent value="28-days">
              <AggregatedSummarySection 
                title="Ingresos por Períodos de 28 días" 
                totals={all28DayTotals(expenses)} 
                isLoading={isLoading}
                onDownloadInvoice={handleDownloadInvoicePDF}
              />
          </TabsContent>
          <TabsContent value="monthly">
              <AggregatedSummarySection 
                title="Ingresos Mensuales" 
                totals={allCalendarMonthlyTotals(expenses)} 
                isLoading={isLoading}
                onDownloadInvoice={handleDownloadInvoicePDF}
              />
          </TabsContent>
        </Tabs>
      </div>

       <AlertDialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
            <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center justify-between font-headline text-2xl">
                    <div className="flex items-center gap-2">
                        <BrainCircuit className="h-7 w-7 text-primary" />
                        Análisis de Rendimiento con IA
                    </div>
                     {!translatedAnalysis && !isAnalysisLoading && analysisResult && (
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleTranslateAnalysis} 
                            disabled={isTranslating}
                            className="text-xs"
                        >
                            <Languages className="mr-2 h-4 w-4" />
                            {isTranslating ? 'Traduciendo...' : 'Traducir'}
                        </Button>
                     )}
                </AlertDialogTitle>
                <AlertDialogDescription>
                {isAnalysisLoading
                    ? "Analizando el rendimiento histórico de tus grupos y ubicaciones..."
                    : "La IA ha procesado tus datos para generar los siguientes insights:"}
                </AlertDialogDescription>
            </AlertDialogHeader>
            
            {isAnalysisLoading ? (
                <div className="flex justify-center items-center h-48">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            ) : (
                analysisResult && (
                <div className="my-4 text-sm space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                    <div>
                        <h3 className="font-semibold text-foreground mb-2">Resumen Ejecutivo</h3>
                        <p className="text-muted-foreground bg-muted/50 p-3 rounded-md italic">
                           {translatedAnalysis?.executiveSummary || analysisResult.executiveSummary}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                Observaciones Positivas
                            </h3>
                            <ul className="space-y-2">
                                {(translatedAnalysis?.positiveObservations || analysisResult.positiveObservations).map((item, index) => (
                                    <li key={index} className="flex items-start gap-2 p-2 rounded-md bg-green-500/10 text-green-700 italic">
                                        <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                             <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                                <TrendingDownIcon className="h-5 w-5 text-amber-500" />
                                Áreas de Mejora
                            </h3>
                            <ul className="space-y-2">
                                {(translatedAnalysis?.areasForImprovement || analysisResult.areasForImprovement).map((item, index) => (
                                    <li key={index} className="flex items-start gap-2 p-2 rounded-md bg-amber-500/10 text-amber-700 italic">
                                        <TrendingDownIcon className="h-4 w-4 mt-0.5 shrink-0" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                     <div>
                        <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2"><Users className="h-5 w-5 text-indigo-500" />Comparativa de Grupos</h3>
                        <p className="text-muted-foreground bg-indigo-500/10 p-3 rounded-md italic">
                           {translatedAnalysis?.groupComparison || analysisResult.groupComparison}
                        </p>
                    </div>
                    
                    <div>
                        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                            <Lightbulb className="h-5 w-5 text-primary" />
                            Recomendaciones
                        </h3>
                         <ul className="space-y-2">
                            {(translatedAnalysis?.recommendations || analysisResult.recommendations).map((item, index) => (
                                <li key={index} className="flex items-start gap-2 p-2 rounded-md bg-primary/10 text-primary italic">
                                    <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    </div>
                )
            )}
            
            <AlertDialogFooter>
                <AlertDialogAction onClick={() => setShowAnalysisDialog(false)}>Entendido</AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </div>
  );
}
