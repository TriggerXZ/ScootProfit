
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/DatePicker';
import { LOCATIONS, LOCATION_IDS, LocationId } from '@/lib/constants';
import type { LocationRevenueInput, RevenueEntry } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Coins, Sigma, ArrowUpCircle, ArrowDownCircle, AlertTriangle } from 'lucide-react';
import { formatCurrencyCOP } from '@/lib/formatters';

const revenueSchema = z.string().refine(val => !isNaN(parseFloat(val.replace(/\./g, ''))) && parseFloat(val.replace(/\./g, '')) >= 0, {
  message: "Debe ser un número positivo"
});

const formSchema = z.object({
  date: z.date({ required_error: "La fecha es requerida." }),
  la72: revenueSchema,
  elCubo: revenueSchema,
  parqueDeLasLuces: revenueSchema,
  la78: revenueSchema,
});

type RevenueFormValues = z.infer<typeof formSchema>;

interface RevenueEntryFormProps {
  onSubmitSuccess: (date: string, revenues: LocationRevenueInput) => void;
  getExistingEntry: (date: string) => RevenueEntry | undefined;
  editingEntry: RevenueEntry | null;
  onCancelEdit: () => void;
  averageDailyRevenue: number;
}

const formatInputValue = (value: string | number): string => {
  const numericString = String(value).replace(/[^0-9]/g, '');
  if (numericString === '' || numericString === '0') return "0";
  return parseInt(numericString, 10).toLocaleString('es-CO');
};

const parseInputValue = (value: string): string => {
  return value.replace(/\./g, '');
};


export function RevenueEntryForm({ onSubmitSuccess, getExistingEntry, editingEntry, onCancelEdit, averageDailyRevenue }: RevenueEntryFormProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [clientToday, setClientToday] = useState<Date | undefined>(undefined);
  const [isExisting, setIsExisting] = useState(false);
  const { toast } = useToast();

  const { control, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<RevenueFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: undefined,
      la72: "0",
      elCubo: "0",
      parqueDeLasLuces: "0",
      la78: "0",
    },
  });

  const watchedRevenues = watch(LOCATION_IDS);

  const dailyTotal = useMemo(() => {
    return watchedRevenues.reduce((sum, value) => {
      const parsedValue = parseFloat(parseInputValue(value || "0"));
      return sum + (isNaN(parsedValue) ? 0 : parsedValue);
    }, 0);
  }, [watchedRevenues]);
  
  const isAboveAverage = useMemo(() => {
    if (averageDailyRevenue === 0 || dailyTotal === 0) return null;
    return dailyTotal > averageDailyRevenue;
  }, [dailyTotal, averageDailyRevenue]);

  useEffect(() => {
    const today = new Date();
    setClientToday(today);
    if (!editingEntry) {
        setSelectedDate(today);
        setValue("date", today);
    }
  }, []); // Run only on mount
  
  useEffect(() => {
    if (editingEntry) {
      const entryDate = parseISO(editingEntry.date);
      setSelectedDate(entryDate);
      setValue("date", entryDate, { shouldValidate: true });
      LOCATION_IDS.forEach(locId => {
        setValue(locId, formatInputValue(editingEntry.revenues[locId]));
      });
      setIsExisting(true);
    } else {
        // When not editing, reset to a clean state for the selected date
        const today = new Date();
        setSelectedDate(today);
        reset({
            date: today,
            la72: "0", elCubo: "0", parqueDeLasLuces: "0", la78: "0",
        });
        setIsExisting(false);
    }
  }, [editingEntry, setValue, reset]);

  useEffect(() => {
    if (selectedDate && !editingEntry) {
      setValue("date", selectedDate, { shouldValidate: true });
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const existingEntryForDate = getExistingEntry(dateString);
      if (existingEntryForDate) {
        LOCATION_IDS.forEach(locId => {
          setValue(locId, formatInputValue(existingEntryForDate.revenues[locId]));
        });
        setIsExisting(true);
      } else {
        LOCATION_IDS.forEach(locId => {
          setValue(locId, "0");
        });
        setIsExisting(false);
      }
    }
  }, [selectedDate, getExistingEntry, setValue, editingEntry]);


  const processSubmit = (data: RevenueFormValues) => {
    const dateString = format(data.date, 'yyyy-MM-dd');
    const revenues: LocationRevenueInput = {
      la72: parseInputValue(data.la72),
      elCubo: parseInputValue(data.elCubo),
      parqueDeLasLuces: parseInputValue(data.parqueDeLasLuces),
      la78: parseInputValue(data.la78),
    };
    
    const isUpdating = !!editingEntry || isExisting;
    
    onSubmitSuccess(dateString, revenues);

    toast({
      title: isUpdating ? "Ingreso Actualizado" : "Ingreso Guardado",
      description: `Los ingresos para ${format(data.date, 'PPP', { locale: es })} han sido guardados.`,
    });
    
    if (editingEntry) {
        onCancelEdit(); // This will clear the editing state from parent
    } else {
        // Not in explicit edit mode, so reset form and advance date
        const nextDay = addDays(data.date, 1);
        if (clientToday && nextDay <= clientToday) {
            setSelectedDate(nextDay);
        } else {
            setSelectedDate(clientToday);
        }
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">{editingEntry ? 'Editar Ingreso' : 'Registrar Ingresos Diarios'}</CardTitle>
        <CardDescription>{editingEntry ? `Editando los ingresos del ${format(parseISO(editingEntry.date), 'PPP', { locale: es })}.` : 'Ingresa las ganancias para cada punto de alquiler.'}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(processSubmit)}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="date">Fecha del Registro</Label>
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <DatePicker
                  date={field.value}
                  setDate={(date) => {
                    if (!editingEntry) { // Only allow date changes if not in explicit edit mode
                        field.onChange(date);
                        setSelectedDate(date);
                    }
                  }}
                  disabled={(date) => {
                    if (editingEntry) return true; // Disable calendar if in explicit edit mode
                    if (!clientToday) return true;
                    return date > clientToday || date < new Date("2020-01-01");
                  }}
                />
              )}
            />
            {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
          </div>
          
          {isExisting && !editingEntry && (
              <div className="flex items-start gap-3 p-3 text-sm text-amber-800 bg-amber-500/20 rounded-md border border-amber-500/40">
                  <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-amber-600" />
                  <p><b>Atención:</b> Ya existen datos para esta fecha. Al guardar, se sobrescribirán los valores anteriores. Para editar un día específico sin cambiar la fecha, haz clic en el botón de editar en la tabla de historial.</p>
              </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {LOCATION_IDS.map(locId => (
              <div key={locId} className="space-y-2">
                <Label htmlFor={locId} className="capitalize">{(Object.values(LOCATIONS).find(l => l.id === locId))?.name || locId}</Label>
                <div className="relative">
                   <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Controller
                        name={locId as LocationId}
                        control={control}
                        render={({ field }) => (
                          <Input
                            id={locId}
                            type="text" 
                            inputMode="numeric"
                            placeholder="0"
                            className="pl-10 text-lg"
                            value={field.value}
                            onChange={(e) => field.onChange(formatInputValue(e.target.value))}
                            onBlur={(e) => {
                                if (e.target.value.trim() === '') {
                                    field.onChange('0');
                                }
                            }}
                          />
                        )}
                      />
                </div>
                {errors[locId as LocationId] && <p className="text-sm text-destructive">{errors[locId as LocationId]?.message}</p>}
              </div>
            ))}
          </div>

          <div className="pt-4 mt-2">
             <div className="flex items-center justify-between p-4 bg-muted/70 rounded-lg border">
                <div className="flex items-center gap-3">
                    <Sigma className="h-6 w-6 text-primary" />
                    <span className="font-semibold text-lg text-foreground">Total del Día</span>
                </div>
                 <div className="text-right">
                    <span className="font-bold text-2xl text-primary font-headline">{formatCurrencyCOP(dailyTotal)}</span>
                     {isAboveAverage !== null && (
                         <div className={`flex items-center justify-end gap-1 text-xs mt-1 ${isAboveAverage ? 'text-green-500' : 'text-red-500'}`}>
                            {isAboveAverage ? <ArrowUpCircle className="h-4 w-4" /> : <ArrowDownCircle className="h-4 w-4" />}
                            <span>vs. promedio de 7 días ({formatCurrencyCOP(averageDailyRevenue)})</span>
                        </div>
                     )}
                </div>
            </div>
          </div>

        </CardContent>
        <CardFooter className="flex gap-4">
            {editingEntry && (
              <Button type="button" variant="outline" onClick={onCancelEdit} className="w-full text-lg py-6">
                Cancelar
              </Button>
            )}
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-6" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : (editingEntry || isExisting ? 'Actualizar Ingreso' : 'Guardar Ingresos')}
            </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
