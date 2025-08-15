
"use client";

/**
 * @fileOverview Utility functions for exporting data to CSV format.
 */

/**
 * Converts an array of objects to a CSV string.
 * @param data The array of objects to convert.
 * @param columns An object defining the CSV columns. Keys are the object keys, values are the CSV header names.
 * @returns A string in CSV format.
 */
function convertToCSV<T extends object>(data: T[], columns: Record<keyof T, string>): string {
  const header = Object.values(columns).join(',') + '\n';
  
  const rows = data.map(row => {
    return Object.keys(columns).map(key => {
      let cell = row[key as keyof T] as any;
      if (cell === null || cell === undefined) {
        return '';
      }
      cell = String(cell);
      // Escape commas and quotes
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        cell = `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(',');
  }).join('\n');
  
  return header + rows;
}

/**
 * Triggers a browser download for a CSV file.
 * @param csvString The CSV data as a string.
 * @param filename The desired name for the downloaded file.
 */
export function downloadCSV(csvString: string, filename: string) {
    if (typeof window === 'undefined') return;

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}


/**
 * Processes revenue entries and triggers a CSV download.
 * @param entries The revenue entries to export.
 */
export function exportRevenuesToCSV(entries: any[]) {
    const columns = {
        date: 'Fecha',
        la72: 'La 72',
        elCubo: 'El Cubo',
        parqueDeLasLuces: 'P. de las Luces',
        la78: 'La 78',
        total: 'Total Dia'
    };
    const csvData = convertToCSV(entries, columns);
    downloadCSV(csvData, 'ingresos.csv');
}

/**
 * Processes expense entries and triggers a CSV download.
 * @param expenses The expense entries to export.
 */
export function exportExpensesToCSV(expenses: any[]) {
    const columns = {
        date: 'Fecha',
        description: 'Descripción',
        categoryName: 'Categoría',
        amount: 'Monto'
    };
    const csvData = convertToCSV(expenses, columns);
    downloadCSV(csvData, 'gastos.csv');
}
