
"use client";

import React, { useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AggregatedSummarySection } from '@/components/sections/AggregatedSummarySection';
import { useRevenueEntries } from '@/hooks/useRevenueEntries';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import html2pdf from 'html2pdf.js';

export default function ReportsPage() {
  const { allWeeklyTotals, allMonthlyTotals, isLoading } = useRevenueEntries();
  const [activeTab, setActiveTab] = useState('weekly');
  const weeklyReportRef = useRef<HTMLDivElement>(null);
  const monthlyReportRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = () => {
    const elementToPrint = activeTab === 'weekly' ? weeklyReportRef.current : monthlyReportRef.current;
    const reportTitle = activeTab === 'weekly' ? 'Reporte Semanal de Ingresos' : 'Reporte Mensual de Ingresos';
    const filename = activeTab === 'weekly' ? 'reporte_semanal_scootprofit.pdf' : 'reporte_mensual_scootprofit.pdf';

    if (elementToPrint) {
      const options = {
        margin: [15, 15, 15, 15], // top, left, bottom, right in mm
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false }, // Increased scale for better quality
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] as any[] } // Added type assertion
      };
      
      // Create a clone to manipulate for PDF without affecting the displayed page
      const clonedElement = elementToPrint.cloneNode(true) as HTMLElement;

      // Add a title to the PDF
      const titleElement = document.createElement('h1');
      titleElement.innerText = reportTitle;
      titleElement.style.fontSize = '24px';
      titleElement.style.fontWeight = 'bold';
      titleElement.style.textAlign = 'center';
      titleElement.style.marginBottom = '20px';
      titleElement.style.fontFamily = 'Poppins, sans-serif'; // Match existing headline font
      titleElement.style.color = '#2c3e50'; // Match foreground color

      const container = document.createElement('div');
      container.appendChild(titleElement);
      container.appendChild(clonedElement);
      
      // Style the container for html2pdf
      container.style.padding = "20px"; // Add some padding for the PDF content

      html2pdf().from(container).set(options).save();

    } else {
      console.error("Element to print not found for tab:", activeTab);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-headline font-bold text-foreground">Reportes de Ingresos</h1>
        <Button onClick={handleDownloadPDF} variant="outline">
          <FileDown className="mr-2 h-4 w-4" />
          Descargar PDF
        </Button>
      </div>
      
      <Tabs defaultValue="weekly" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 md:w-1/2 lg:w-1/3 mb-6">
          <TabsTrigger value="weekly" className="text-base py-2.5">Semanal</TabsTrigger>
          <TabsTrigger value="monthly" className="text-base py-2.5">Mensual</TabsTrigger>
        </TabsList>
        <TabsContent value="weekly" ref={weeklyReportRef}>
          <AggregatedSummarySection 
            title="Ingresos Semanales" 
            totals={allWeeklyTotals()} 
            isLoading={isLoading}
          />
        </TabsContent>
        <TabsContent value="monthly" ref={monthlyReportRef}>
          <AggregatedSummarySection 
            title="Ingresos Mensuales" 
            totals={allMonthlyTotals()} 
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
