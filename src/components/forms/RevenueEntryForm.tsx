
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
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Coins } from 'lucide-react';

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

const formatInputValue = (value: string | number): string => {
  const numericString = String(value).replace(/[^0-9]/g, '');
  if (numericString === '' || numericString === '0') return "0";
  return parseInt(numericString, 10).toLocaleString('es-CO');
};

const parseInputValue = (value: string): string => {
  return value.replace(/\./g, '');
};


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
    const today = new Date();
    setSelectedDate(today);
    setClientToday(today);
  }, []);

  useEffect(() => {
    if (selectedDate) {
      setValue("date", selectedDate);
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const existingEntry = getExistingEntry(dateString);
      if (existingEntry) {
        LOCATION_IDS.forEach(locId => {
          setValue(locId, formatInputValue(existingEntry.revenues[locId]));
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
      la72: parseInputValue(data.la72),
      elCubo: parseInputValue(data.elCubo),
      parqueDeLasLuces: parseInputValue(data.parqueDeLasLuces),
      la78: parseInputValue(data.la78),
    };
    
    onSubmitSuccess(dateString, revenues);

    toast({
      title: "Ingreso Guardado",
      description: `Los ingresos para ${format(data.date, 'PPP', { locale: es })} han sido guardados.`,
    });
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
            <Label htmlFor="date">Fecha del Registro</Label>
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
                  disabled={!clientToday ? () => true : (date) => date > clientToday || date < new Date("2020-01-01")}
                />
              )}
            />
            {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
          </div>

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
