
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
        html2canvas: { scale: 2, useCORS: true, logging: false, width: elementToPrint.scrollWidth, windowWidth: elementToPrint.scrollWidth },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] as any[] } 
      };
      
      const clonedElement = elementToPrint.cloneNode(true) as HTMLElement;
      
      // Expand all accordions
      clonedElement.querySelectorAll('div[data-state="closed"]').forEach(el => {
        el.setAttribute('data-state', 'open');
      });
      clonedElement.querySelectorAll('div[data-radix-collapsible-content]').forEach(el => {
        (el as HTMLElement).style.height = 'auto';
        (el as HTMLElement).style.overflow = 'visible';
      });
       // Remove max-height and overflow from individual record lists for PDF
      clonedElement.querySelectorAll('ul.max-h-60').forEach(ul => {
        (ul as HTMLElement).style.maxHeight = 'none';
        (ul as HTMLElement).style.overflowY = 'visible';
      });


      const titleElement = document.createElement('h1');
      titleElement.innerText = reportTitle;
      titleElement.style.fontSize = '20px'; // Adjusted for A4
      titleElement.style.fontWeight = 'bold';
      titleElement.style.textAlign = 'center';
      titleElement.style.marginBottom = '15px'; // Adjusted for A4
      titleElement.style.fontFamily = 'Poppins, sans-serif'; 
      titleElement.style.color = getComputedStyle(document.documentElement).getPropertyValue('--foreground').trim() || '#2c3e50';

      const container = document.createElement('div');
      container.style.width = '190mm'; // Approx A4 width minus margins
      container.style.margin = '0 auto';
      container.style.fontFamily = 'PT Sans, sans-serif';
      container.style.color = getComputedStyle(document.documentElement).getPropertyValue('--foreground').trim();
      container.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
      
      container.appendChild(titleElement);
      container.appendChild(clonedElement);
      
      document.body.appendChild(container); // Append to body for rendering styles
      await html2pdf().from(container).set(options).save();
      document.body.removeChild(container); // Clean up

    } else {
      console.error("Element to print not found for tab:", activeTab);
    }
  };

  const handleDownloadInvoicePDF = async (item: AggregatedTotal) => {
    const html2pdf = (await import('html2pdf.js')).default;
    const currentDate = format(new Date(), 'PPP', { locale: (await import('date-fns/locale/es')).es });

    const invoiceHTML = `
      <div style="font-family: Arial, sans-serif; width: 100%; max-width: 800px; margin: 20px auto; padding: 20px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
        <h1 style="text-align: center; color: #333; font-size: 24px; margin-bottom: 10px;">Liquidación de Ingresos para Miembro</h1>
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="font-size: 20px; margin: 0;">ScootProfit</h2>
        </div>
        <table style="width: 100%; margin-bottom: 20px; font-size: 14px;">
          <tr>
            <td style="font-weight: bold;">Fecha de Emisión:</td>
            <td>${currentDate}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Período de Liquidación:</td>
            <td>${item.period}</td>
          </tr>
        </table>
        
        <h3 style="border-bottom: 2px solid #eee; padding-bottom: 5px; margin-top: 30px; margin-bottom:15px; font-size: 18px; color: #555;">Detalle de Liquidación</h3>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr style="background-color: #f9f9f9;">
            <td style="padding: 8px; border: 1px solid #ddd;">1. Total Ingresos Brutos del Período (Todos los puntos):</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrencyCOP(item.totalRevenueInPeriod)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;" colspan="2">2. Costos Operativos Fijos del Período:</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; padding-left: 25px;">- Pago Zona Segura:</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrencyCOP(item.deductionsDetail.zonaSegura)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; padding-left: 25px;">- Arriendo:</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrencyCOP(item.deductionsDetail.arriendo)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; padding-left: 25px;">- Aporte Cooperativa:</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrencyCOP(item.deductionsDetail.aporteCooperativa)}</td>
          </tr>
          <tr style="background-color: #f9f9f9;">
            <td style="padding: 8px; border: 1px solid #ddd;">3. Total Costos Operativos Fijos (Sumatoria de 2):</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${formatCurrencyCOP(item.deductionsDetail.totalDeductions)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">4. Ingreso Neto del Período para Distribución (1 - 3):</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${formatCurrencyCOP(item.netRevenueToDistribute)}</td>
          </tr>
          <tr style="background-color: #f9f9f9;">
            <td style="padding: 8px; border: 1px solid #ddd;">5. Número de Miembros Participantes:</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${NUMBER_OF_MEMBERS}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold; font-size: 16px;">6. Monto Neto a Pagar al Miembro (4 / 5):</td>
            <td style="padding: 12px; border: 1px solid #ddd; text-align: right; font-weight: bold; font-size: 16px; color: ${item.netMemberShare >= 0 ? '#28a745' : '#dc3545'};">${formatCurrencyCOP(item.netMemberShare)}</td>
          </tr>
        </table>
        ${item.netRevenueToDistribute < 0 ? '<p style="color: red; text-align: center; margin-top: 20px; font-size: 12px;">Nota: El ingreso neto a distribuir es negativo, lo que indica que los costos operativos superaron los ingresos del período.</p>' : ''}
        <p style="text-align: center; margin-top: 30px; font-size: 12px; color: #777;">Este es un documento generado automáticamente.</p>
      </div>
    `;

    const options = {
      margin: [10, 10, 10, 10], // top, left, bottom, right in mm
      filename: `liquidacion_miembro_${item.period.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      image: { type: 'png', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    html2pdf().from(invoiceHTML).set(options).save();
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
