import { format as formatDateFns, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export function formatCurrencyCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string, formatStr: string = 'PPP'): string {
  try {
    return formatDateFns(parseISO(dateString), formatStr, { locale: es });
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return dateString; // fallback to original string if parsing fails
  }
}

export function getCurrentDateString(): string {
  return formatDateFns(new Date(), 'yyyy-MM-dd');
}
