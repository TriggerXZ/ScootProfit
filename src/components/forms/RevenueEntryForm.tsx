
"use client";

import React, { useState, useEffect } from 'react';
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
import { formatCurrencyCOP, getCurrentDateString } from '@/lib/formatters';
import { parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';

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
}

export function RevenueEntryForm({ onSubmitSuccess, getExistingEntry }: RevenueEntryFormProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [clientToday, setClientToday] = useState<Date | undefined>(undefined);
  const { toast } = useToast();

  const { control, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<RevenueFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: undefined, // Initialize as undefined to prevent hydration mismatch
      la72: "0",
      elCubo: "0",
      parqueDeLasLuces: "0",
      la78: "0",
    },
  });

  useEffect(() => {
    // Set initial date and today's date on client side
    setSelectedDate(new Date());
    setClientToday(new Date());
  }, []);

  useEffect(() => {
    if (selectedDate) {
      setValue("date", selectedDate);
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const existingEntry = getExistingEntry(dateString);
      if (existingEntry) {
        LOCATION_IDS.forEach(locId => {
          const revenueValue = existingEntry.revenues[locId]?.toString() || "0";
          const formattedValue = parseInt(revenueValue, 10).toLocaleString('es-CO');
          setValue(locId, formattedValue === 'NaN' ? '0' : formattedValue);
        });
      } else {
        LOCATION_IDS.forEach(locId => {
          setValue(locId, "0");
        });
      }
    }
  }, [selectedDate, getExistingEntry, setValue]);


  const processSubmit = (data: RevenueFormValues) => {
    const dateString = format(data.date, 'yyyy-MM-dd');
    const revenues: LocationRevenueInput = {
      la72: data.la72.replace(/\./g, ''),
      elCubo: data.elCubo.replace(/\./g, ''),
      parqueDeLasLuces: data.parqueDeLasLuces.replace(/\./g, ''),
      la78: data.la78.replace(/\./g, ''),
    };
    
    onSubmitSuccess(dateString, revenues);

    toast({
      title: "Ingreso Guardado",
      description: `Los ingresos para ${format(data.date, 'PPP', { locale: es })} han sido guardados.`,
    });
  };
  
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>, fieldName: LocationId) => {
    const rawValue = event.target.value;
    const numericValue = rawValue.replace(/[^0-9]/g, '');
    
    if (numericValue === '') {
      setValue(fieldName, '0');
      return;
    }
    
    const parsedNum = parseInt(numericValue, 10);
    if (isNaN(parsedNum)) {
      setValue(fieldName, '0');
      return;
    }
    
    const formattedValue = parsedNum.toLocaleString('es-CO');
    setValue(fieldName, formattedValue);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Registrar Ingresos Diarios</CardTitle>
        <CardDescription>Ingresa las ganancias para cada punto de alquiler.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(processSubmit)}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="date">Fecha</Label>
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <DatePicker
                  date={field.value}
                  setDate={(date) => {
                    field.onChange(date);
                    setSelectedDate(date);
                  }}
                  disabled={!clientToday ? () => true : (date) => date > clientToday || date < new Date("2000-01-01")}
                />
              )}
            />
            {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
          </div>

          {LOCATION_IDS.map(locId => (
            <div key={locId} className="space-y-2">
              <Label htmlFor={locId} className="capitalize">{(Object.values(LOCATIONS).find(l => l.id === locId))?.name || locId}</Label>
              <Controller
                name={locId as LocationId}
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id={locId}
                    type="text" 
                    placeholder={`Ingresos para ${(Object.values(LOCATIONS).find(l => l.id === locId))?.name || locId}`}
                    onChange={(e) => {
                      handleInputChange(e, locId as LocationId);
                      // field.onChange should ideally be called with the raw numeric string for validation purposes if revenueSchema expects that
                      // However, current setup seems to store formatted string then parse. Keeping as is unless further issues.
                      // field.onChange(e.target.value.replace(/\./g, '')); // Store raw number for validation
                    }}
                    onBlur={(e) => { 
                        const rawValue = e.target.value;
                        const numericValue = rawValue.replace(/[^0-9]/g, '');
                        if (numericValue === '') {
                            setValue(locId, '0');
                        } else {
                            const parsedNum = parseInt(numericValue, 10);
                            if (!isNaN(parsedNum)) {
                                setValue(locId, parsedNum.toLocaleString('es-CO'));
                            } else {
                                setValue(locId, '0');
                            }
                        }
                    }}
                    // Ensure value prop reflects what's in RHF, which should be the formatted string after handleInputChange/onBlur
                    value={field.value === "0" ? "" : (parseInt(String(field.value).replace(/\./g, ''), 10) || 0).toLocaleString('es-CO')}
                    className="text-lg"
                  />
                )}
              />
              {errors[locId as LocationId] && <p className="text-sm text-destructive">{errors[locId as LocationId]?.message}</p>}
            </div>
          ))}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-6" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar Ingresos"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
