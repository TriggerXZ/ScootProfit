
"use client";

import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AggregatedSummarySection } from '@/components/sections/AggregatedSummarySection';
import { GroupPerformanceChart } from '@/components/charts/GroupPerformanceChart';
import { LocationPerformanceChart } from '@/components/charts/LocationPerformanceChart';
import { useRevenueEntries } from '@/hooks/useRevenueEntries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileDown, FileText, BarChart2, BrainCircuit, Lightbulb, TrendingDown as TrendingDownIcon, CheckCircle, Languages, Users } from 'lucide-react';
import type { AggregatedTotal } from '@/types';
import { formatCurrencyCOP } from '@/lib/formatters';
import { DEFAULT_NUMBER_OF_MEMBERS, LOCATION_IDS, GROUP_IDS, LOCATIONS, GROUPS } from '@/lib/constants';
import { format, getMonth, getYear, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from '@/components/ui/alert-dialog';
import { analyzePerformance, AnalyzePerformanceOutput } from '@/ai/flows/analyze-performance-flow';
import { translateText } from '@/ai/flows/translate-text-flow';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


type TranslatedAnalysis = {
    executiveSummary?: string;
    positiveObservations?: string[];
    areasForImprovement?: string[];
    recommendations?: string[];
    groupComparison?: string;
};


export default function ReportsPage() {
  const { entries, allWeeklyTotals, all28DayTotals, allCalendarMonthlyTotals, isLoading } = useRevenueEntries();
  const [activeTab, setActiveTab] = useState('weekly');
  const weeklyReportRef = useRef<HTMLDivElement>(null);
  const monthly28DayReportRef = useRef<HTMLDivElement>(null);
  const monthlyCalendarReportRef = useRef<HTMLDivElement>(null);

  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzePerformanceOutput | null>(null);
  const [translatedAnalysis, setTranslatedAnalysis] = useState<TranslatedAnalysis | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  const { yearOptions, monthOptions } = useMemo(() => {
    if (!isClient || entries.length === 0) return { yearOptions: [new Date().getFullYear()], monthOptions: [] };
    const years = new Set<number>();
    const months = new Set<string>();
    entries.forEach(entry => {
        const date = parseISO(entry.date);
        years.add(getYear(date));
        if (getYear(date) === selectedYear) {
           months.add(format(date, 'yyyy-MM'));
        }
    });
    const sortedYears = Array.from(years).sort((a,b) => b - a);
    const sortedMonths = Array.from(months).sort().reverse().map(mStr => {
        const date = parseISO(`${mStr}-01`);
        return { value: getMonth(date), label: format(date, 'MMMM', { locale: es }).replace(/^\w/, c => c.toUpperCase()) };
    });

    return { yearOptions: sortedYears, monthOptions: sortedMonths };
  }, [entries, selectedYear, isClient]);

  const { groupTotals, locationTotals } = useMemo(() => {
    const monthlyPeriod = allCalendarMonthlyTotals().find(period => {
      if (period.entries.length === 0) return false;
      const periodDate = parseISO(period.entries[0].date);
      return getMonth(periodDate) === selectedMonth && getYear(periodDate) === selectedYear;
    });
    
    const groupMap: { [key: string]: number } = {};
    const locationMap: { [key: string]: number } = {};

    if(monthlyPeriod) {
        for (const [group, revenue] of Object.entries(monthlyPeriod.groupRevenueTotals)) {
          groupMap[group] = (groupMap[group] || 0) + revenue;
        }
        monthlyPeriod.entries.forEach(entry => {
          for (const [location, revenue] of Object.entries(entry.revenues)) {
            locationMap[location] = (locationMap[location] || 0) + revenue;
          }
        });
    }

    return { groupTotals: groupMap, locationTotals: locationMap };
  }, [selectedMonth, selectedYear, allCalendarMonthlyTotals]);

  const handleAnalyzeClick = async () => {
    setIsAnalysisLoading(true);
    setAnalysisResult(null);
    setTranslatedAnalysis(null);
    setShowAnalysisDialog(true);
    try {
      const groupTotalsString = GROUP_IDS.map(id => `${(GROUPS[id.toUpperCase().replace('GRUPO', 'GRUPO_') as keyof typeof GROUPS] as any).name}: ${formatCurrencyCOP(groupTotals[id] || 0)}`).join(', ');
      const locationTotalsString = LOCATION_IDS.map(id => {
        const locationName = (Object.values(LOCATIONS).find(l => l.id === id))?.name || id;
        return `${locationName}: ${formatCurrencyCOP(locationTotals[id] || 0)}`;
      }).join(', ');


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


  const handleDownloadReportPDF = async () => {
    const html2pdf = (await import('html2pdf.js')).default; 
    
    let elementToPrint: HTMLDivElement | null = null;
    let reportTitle = '';
    let filename = '';

    if (activeTab === 'weekly') {
        elementToPrint = weeklyReportRef.current;
        reportTitle = 'Reporte Semanal de Ingresos';
        filename = 'reporte_semanal_scootprofit.pdf';
    } else if (activeTab === 'monthly28') {
        elementToPrint = monthly28DayReportRef.current;
        reportTitle = 'Reporte Mensual de Ingresos (Periodos de 28 días)';
        filename = 'reporte_mensual_28dias_scootprofit.pdf';
    } else if (activeTab === 'monthlyCalendar') {
        elementToPrint = monthlyCalendarReportRef.current;
        reportTitle = 'Reporte Mensual de Ingresos (Calendario)';
        filename = 'reporte_mensual_calendario_scootprofit.pdf';
    }


    if (elementToPrint) {
      const options = {
        margin: [15, 10, 15, 10], 
        filename: filename,
        image: { type: 'png', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          logging: false, 
          width: elementToPrint.scrollWidth, 
          windowWidth: elementToPrint.scrollWidth,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] as any[] } 
      };
      
      const clonedElement = elementToPrint.cloneNode(true) as HTMLElement;
      
      clonedElement.querySelectorAll('div[data-state="closed"]').forEach(el => {
        el.setAttribute('data-state', 'open');
        const content = el.closest('div[data-radix-accordion-item]')?.querySelector('div[data-radix-collapsible-content]');
        if (content) {
            (content as HTMLElement).style.height = 'auto';
            (content as HTMLElement).style.overflow = 'visible';
            (content as HTMLElement).style.display = 'block'; 
        }
      });
      clonedElement.querySelectorAll('div[data-radix-collapsible-content]').forEach(el => {
        (el as HTMLElement).style.height = 'auto';
        (el as HTMLElement).style.overflow = 'visible';
         (el as HTMLElement).style.display = 'block'; 
      });

      const titleElement = document.createElement('h1');
      titleElement.innerText = reportTitle;
      titleElement.style.fontSize = '18px'; 
      titleElement.style.fontWeight = 'bold';
      titleElement.style.textAlign = 'center';
      titleElement.style.marginBottom = '10px'; 
      titleElement.style.fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-headline') || 'Poppins, sans-serif'; 
      const textColor = '#2c3e50';
      titleElement.style.color = textColor;

      const container = document.createElement('div');
      container.style.width = '190mm'; 
      container.style.margin = '0 auto';
      container.style.fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-body') || 'PT Sans, sans-serif';
      container.style.color = textColor;
      container.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
      container.style.lineHeight = '1.5';
      container.style.fontSize = '10pt'; 
      
      container.appendChild(titleElement);
      container.appendChild(clonedElement);
      
      document.body.appendChild(container); 
      
      try {
        await html2pdf().from(container).set(options).save();
      } catch (error) {
        console.error("Error generating PDF:", error);
        alert("Hubo un error al generar el PDF. Por favor, inténtalo de nuevo.");
      } finally {
        document.body.removeChild(container); 
      }

    } else {
      console.error("Element to print not found for tab:", activeTab);
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
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 6px 8px; border: 1px solid #ddd; color: ${textColor};">5. Número de Miembros Participantes:</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; color: ${textColor};">${DEFAULT_NUMBER_OF_MEMBERS}</td>
            </tr>
            <tr>
              <td style="padding: 10px 8px; border: 1px solid #ddd; font-weight: bold; font-size: 12pt; color: ${textColor};">6. Monto Neto a Pagar al Miembro (4 / 5):</td>
              <td style="padding: 10px 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; font-size: 12pt; color: ${item.netRevenueToDistribute >= 0 && item.netMemberShare > 0 ? '#28a745' : '#dc3545'};">${formatCurrencyCOP(item.netMemberShare)}</td>
            </tr>
          </tbody>
        </table>
        ${item.netRevenueToDistribute < 0 ? `<p style="color: red; text-align: center; margin-top: 15px; font-size: 9pt;">Nota: El ingreso neto a distribuir es negativo, lo que indica que los costos operativos superaron los ingresos del período.</p>` : ''}
        ${item.netRevenueToDistribute >= 0 && item.netMemberShare <= 0 && item.totalRevenueInPeriod > item.deductionsDetail.totalDeductions ? `<p style="color: orange; text-align: center; margin-top: 15px; font-size: 9pt;">Nota: Aunque hubo un ingreso neto positivo para distribuir, la cuota individual por miembro es cero o negativa debido al redondeo o un alto número de miembros.</p>` : ''}
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
           <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
                <BarChart2 className="h-6 w-6 text-primary" />
                <CardTitle className="font-headline text-2xl">Análisis de Rendimiento</CardTitle>
            </div>
            <div className="flex items-center gap-2">
               <Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(Number(val))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                   {yearOptions.map(year => (
                      <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                   ))}
                </SelectContent>
              </Select>
              <Select value={String(selectedMonth)} onValueChange={(val) => setSelectedMonth(Number(val))}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Mes" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(month => (
                    <SelectItem key={month.value} value={String(month.value)}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
             <Button onClick={handleAnalyzeClick} variant="outline" size="sm" disabled={isAnalysisLoading || isLoading || Object.keys(groupTotals).length === 0}>
                <BrainCircuit className="mr-2 h-4 w-4" />
                Analizar con IA
            </Button>
          </div>
          </div>
          <CardDescription>Visualiza los ingresos acumulados por grupo y ubicación para el período seleccionado.</CardDescription>
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
          <TabsList className="grid w-full grid-cols-3 md:w-1/2 lg:w-1/2 mb-6">
            <TabsTrigger value="weekly" className="text-base py-2.5">Semanal</TabsTrigger>
            <TabsTrigger value="monthly28" className="text-base py-2.5">28 Días</TabsTrigger>
            <TabsTrigger value="monthlyCalendar" className="text-base py-2.5">Mensual</TabsTrigger>
          </TabsList>
          <TabsContent value="weekly">
            <div ref={weeklyReportRef}>
              <AggregatedSummarySection 
                title="Ingresos Semanales" 
                totals={allWeeklyTotals()} 
                isLoading={isLoading}
                onDownloadInvoice={handleDownloadInvoicePDF}
              />
            </div>
          </TabsContent>
          <TabsContent value="monthly28">
            <div ref={monthly28DayReportRef}>
              <AggregatedSummarySection 
                title="Ingresos Mensuales (Períodos de 28 días)" 
                totals={all28DayTotals()} 
                isLoading={isLoading}
                onDownloadInvoice={handleDownloadInvoicePDF}
              />
            </div>
          </TabsContent>
          <TabsContent value="monthlyCalendar">
            <div ref={monthlyCalendarReportRef}>
              <AggregatedSummarySection 
                title="Ingresos Mensuales (Calendario)" 
                totals={allCalendarMonthlyTotals()} 
                isLoading={isLoading}
                onDownloadInvoice={handleDownloadInvoicePDF}
              />
            </div>
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

    