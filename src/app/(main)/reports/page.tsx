
"use client";

import React, { useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AggregatedSummarySection } from '@/components/sections/AggregatedSummarySection';
import { useRevenueEntries } from '@/hooks/useRevenueEntries';
import { Button } from '@/components/ui/button';
import { FileDown, FileText } from 'lucide-react';
import type { AggregatedTotal } from '@/types';
import { formatCurrencyCOP, formatDate } from '@/lib/formatters';
import { NUMBER_OF_MEMBERS } from '@/lib/constants';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';


export default function ReportsPage() {
  const { allWeeklyTotals, allMonthlyTotals, isLoading } = useRevenueEntries();
  const [activeTab, setActiveTab] = useState('weekly');
  const weeklyReportRef = useRef<HTMLDivElement>(null);
  const monthlyReportRef = useRef<HTMLDivElement>(null);

  const handleDownloadReportPDF = async () => {
    const html2pdf = (await import('html2pdf.js')).default; 

    const elementToPrint = activeTab === 'weekly' ? weeklyReportRef.current : monthlyReportRef.current;
    const reportTitle = activeTab === 'weekly' ? 'Reporte Semanal de Ingresos' : 'Reporte Mensual de Ingresos';
    const filename = activeTab === 'weekly' ? 'reporte_semanal_scootprofit.pdf' : 'reporte_mensual_scootprofit.pdf';

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
          onrendered: function (canvas: HTMLCanvasElement) {
            // This is a spot to potentially manipulate the canvas if needed, but usually not required.
          }
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
      clonedElement.querySelectorAll('ul.max-h-60').forEach(ul => {
        (ul as HTMLElement).style.maxHeight = 'none';
        (ul as HTMLElement).style.overflowY = 'visible';
      });

      const titleElement = document.createElement('h1');
      titleElement.innerText = reportTitle;
      titleElement.style.fontSize = '18px'; 
      titleElement.style.fontWeight = 'bold';
      titleElement.style.textAlign = 'center';
      titleElement.style.marginBottom = '10px'; 
      titleElement.style.fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-headline') || 'Poppins, sans-serif'; 
      titleElement.style.color = getComputedStyle(document.documentElement).getPropertyValue('--foreground').trim() || '#2c3e50';

      const container = document.createElement('div');
      container.style.width = '190mm'; 
      container.style.margin = '0 auto';
      container.style.fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-body') || 'PT Sans, sans-serif';
      container.style.color = getComputedStyle(document.documentElement).getPropertyValue('--foreground').trim();
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

    const invoiceHTML = `
      <div style="font-family: Arial, sans-serif; width: 100%; max-width: 800px; margin: 20px auto; padding: 20px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0,0,0,0.1); font-size: 10pt; line-height: 1.5;">
        <h1 style="text-align: center; color: #333; font-size: 18px; margin-bottom: 10px;">Liquidación de Ingresos para Miembro</h1>
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="font-size: 16px; margin: 0;">ScootProfit</h2>
        </div>
        <table style="width: 100%; margin-bottom: 20px; font-size: 10pt;">
          <tr>
            <td style="font-weight: bold; padding: 4px;">Fecha de Emisión:</td>
            <td style="padding: 4px;">${currentDate}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; padding: 4px;">Período de Liquidación:</td>
            <td style="padding: 4px;">${item.period}</td>
          </tr>
        </table>
        
        <h3 style="border-bottom: 2px solid #eee; padding-bottom: 5px; margin-top: 20px; margin-bottom:10px; font-size: 14px; color: #555;">Detalle de Liquidación</h3>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 10pt;">
          <thead>
            <tr>
              <th style="padding: 6px 8px; border: 1px solid #ddd; text-align: left; background-color: #f0f0f0;">Concepto</th>
              <th style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; background-color: #f0f0f0;">Valor (COP)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 6px 8px; border: 1px solid #ddd;">1. Total Ingresos Brutos del Período (Todos los puntos):</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;">${formatCurrencyCOP(item.totalRevenueInPeriod)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 8px; border: 1px solid #ddd; font-weight: bold;" colspan="2">2. Costos Operativos Fijos del Período:</td>
            </tr>
            <tr style="background-color: #fdfdfd;">
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left;">&nbsp;&nbsp;&nbsp;&nbsp;Pago Zona Segura:</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;">${formatCurrencyCOP(item.deductionsDetail.zonaSegura)}</td>
            </tr>
            <tr style="background-color: #fdfdfd;">
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left;">&nbsp;&nbsp;&nbsp;&nbsp;Arriendo:</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;">${formatCurrencyCOP(item.deductionsDetail.arriendo)}</td>
            </tr>
            <tr style="background-color: #fdfdfd;">
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: left;">&nbsp;&nbsp;&nbsp;&nbsp;Aporte Cooperativa:</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;">${formatCurrencyCOP(item.deductionsDetail.aporteCooperativa)}</td>
            </tr>
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 6px 8px; border: 1px solid #ddd; font-weight: bold;">3. Total Costos Operativos Fijos (Sumatoria de 2):</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${formatCurrencyCOP(item.deductionsDetail.totalDeductions)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 8px; border: 1px solid #ddd; font-weight: bold;">4. Ingreso Neto del Período para Distribución (1 - 3):</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${formatCurrencyCOP(item.netRevenueToDistribute)}</td>
            </tr>
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 6px 8px; border: 1px solid #ddd;">5. Número de Miembros Participantes:</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;">${NUMBER_OF_MEMBERS}</td>
            </tr>
            <tr>
              <td style="padding: 10px 8px; border: 1px solid #ddd; font-weight: bold; font-size: 12pt;">6. Monto Neto a Pagar al Miembro (4 / 5):</td>
              <td style="padding: 10px 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; font-size: 12pt; color: ${item.netRevenueToDistribute >= 0 ? (item.netMemberShare > 0 ? '#28a745' : '#555') : '#dc3545'};">${formatCurrencyCOP(item.netMemberShare)}</td>
            </tr>
          </tbody>
        </table>
        ${item.netRevenueToDistribute < 0 ? '<p style="color: red; text-align: center; margin-top: 15px; font-size: 9pt;">Nota: El ingreso neto a distribuir es negativo, lo que indica que los costos operativos superaron los ingresos del período.</p>' : ''}
        ${item.netRevenueToDistribute >= 0 && item.netMemberShare <= 0 && item.totalRevenueInPeriod > item.deductionsDetail.totalDeductions ? '<p style="color: orange; text-align: center; margin-top: 15px; font-size: 9pt;">Nota: Aunque hubo un ingreso neto positivo para distribuir, la cuota individual por miembro es cero o negativa debido al redondeo o un alto número de miembros.</p>' : ''}
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
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-headline font-bold text-foreground">Reportes de Ingresos</h1>
        <Button onClick={handleDownloadReportPDF} variant="outline">
          <FileDown className="mr-2 h-4 w-4" />
          Descargar Resumen PDF
        </Button>
      </div>
      
      <Tabs defaultValue="weekly" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 md:w-1/2 lg:w-1/3 mb-6">
          <TabsTrigger value="weekly" className="text-base py-2.5">Semanal</TabsTrigger>
          <TabsTrigger value="monthly" className="text-base py-2.5">Mensual</TabsTrigger>
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
        <TabsContent value="monthly">
           <div ref={monthlyReportRef}>
            <AggregatedSummarySection 
              title="Ingresos Mensuales" 
              totals={allMonthlyTotals()} 
              isLoading={isLoading}
              onDownloadInvoice={handleDownloadInvoicePDF}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

