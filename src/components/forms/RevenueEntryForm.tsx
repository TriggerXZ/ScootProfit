
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
  onSubmitSuccess: () => void;
  getExistingEntry: (date: string) => RevenueEntry | undefined;
}

export function RevenueEntryForm({ onSubmitSuccess, getExistingEntry }: RevenueEntryFormProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { toast } = useToast();

  const { control, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<RevenueFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      la72: "0",
      elCubo: "0",
      parqueDeLasLuces: "0",
      la78: "0",
    },
  });

  useEffect(() => {
    if (selectedDate) {
      setValue("date", selectedDate);
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const existingEntry = getExistingEntry(dateString);
      if (existingEntry) {
        LOCATION_IDS.forEach(locId => {
          setValue(locId, existingEntry.revenues[locId]?.toString() || "0");
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
    
    // Call parent onSubmit, which will then use useRevenueEntries hook
    // This component itself doesn't call addEntry directly from the hook
    // to allow for more flexibility if used in different contexts.
    // Here, we'll assume onSubmitSuccess handles the data saving via the hook.
    onSubmitSuccess(dateString, revenues);


    toast({
      title: "Ingreso Guardado",
      description: `Los ingresos para ${format(data.date, 'PPP', { locale: require('date-fns/locale/es').default })} han sido guardados.`,
    });
    // reset(); // Optionally reset form, or keep values for quick edits
  };
  
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>, fieldName: LocationId) => {
    const rawValue = event.target.value;
    // Remove non-digit characters except for a potential decimal separator
    const numericValue = rawValue.replace(/[^0-9]/g, '');
    // Format with dots for thousands
    const formattedValue = parseInt(numericValue, 10).toLocaleString('es-CO');
    
    setValue(fieldName, numericValue === '' ? '0' : formattedValue === 'NaN' ? '0' : formattedValue);
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
                  disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
                />
              )}
            />
            {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
          </div>

          {LOCATION_IDS.map(locId => (
            <div key={locId} className="space-y-2">
              <Label htmlFor={locId} className="capitalize">{LOCATIONS[locId.toUpperCase() as keyof typeof LOCATIONS]?.name || locId}</Label>
              <Controller
                name={locId as LocationId}
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id={locId}
                    type="text" // Use text to allow formatted input
                    placeholder={`Ingresos para ${LOCATIONS[locId.toUpperCase() as keyof typeof LOCATIONS]?.name || locId}`}
                    onChange={(e) => handleInputChange(e, locId as LocationId)}
                    value={field.value === "0" ? "" : field.value}
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
