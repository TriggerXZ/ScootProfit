
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Settings } from 'lucide-react';
import { LOCAL_STORAGE_SETTINGS_KEY, DEFAULT_NUMBER_OF_MEMBERS, DEFAULT_MONTHLY_GOAL, DEFAULT_WEEKLY_GOAL } from '@/lib/constants';

const settingsSchema = z.object({
  numberOfMembers: z.number().int().positive("El número debe ser un entero positivo."),
  monthlyGoal: z.number().int().positive("La meta debe ser un número positivo."),
  weeklyGoal: z.number().int().positive("La meta debe ser un número positivo."),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const [currentSettings, setCurrentSettings] = useState({
    numberOfMembers: DEFAULT_NUMBER_OF_MEMBERS,
    monthlyGoal: DEFAULT_MONTHLY_GOAL,
    weeklyGoal: DEFAULT_WEEKLY_GOAL,
  });

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: currentSettings,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedSettings = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        
        const mergedSettings = {
            numberOfMembers: parsedSettings.numberOfMembers || DEFAULT_NUMBER_OF_MEMBERS,
            monthlyGoal: parsedSettings.monthlyGoal || DEFAULT_MONTHLY_GOAL,
            weeklyGoal: parsedSettings.weeklyGoal || DEFAULT_WEEKLY_GOAL,
        };

        setCurrentSettings(mergedSettings);
        reset(mergedSettings);
      } else {
        reset({
            numberOfMembers: DEFAULT_NUMBER_OF_MEMBERS,
            monthlyGoal: DEFAULT_MONTHLY_GOAL,
            weeklyGoal: DEFAULT_WEEKLY_GOAL,
        });
      }
    }
  }, [reset]);

  const processSubmit = (data: SettingsFormValues) => {
    localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(data));
    setCurrentSettings(data);
    toast({
      title: "Configuración Guardada",
      description: "Los cambios han sido guardados exitosamente. Es posible que necesites recargar la página para que se apliquen en todos los cálculos.",
      variant: 'default',
      className: 'bg-green-500 text-white'
    });
  };

  const formatCurrencyForInput = (value: string | number): string => {
    const numericString = String(value).replace(/[^0-9]/g, '');
    if (numericString === '') return "0";
    return parseInt(numericString, 10).toLocaleString('es-CO');
  };

  const parseCurrencyFromInput = (value: string): number => {
      return parseInt(value.replace(/\./g, ''), 10) || 0;
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="w-full max-w-2xl mx-auto shadow-xl border-border">
        <CardHeader>
           <div className="flex items-center gap-3">
            <Settings className="h-7 w-7 text-primary" />
            <CardTitle className="font-headline text-2xl">Configuración</CardTitle>
          </div>
          <CardDescription>Ajusta los parámetros globales y las metas de la aplicación.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(processSubmit)}>
          <CardContent className="space-y-8">
            <div className="space-y-2">
              <Label htmlFor="numberOfMembers">Número de Miembros</Label>
              <Controller
                name="numberOfMembers"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="numberOfMembers"
                    type="number"
                    placeholder="Escribe el número total de miembros"
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                    className="text-lg"
                  />
                )}
              />
              {errors.numberOfMembers && <p className="text-sm text-destructive">{errors.numberOfMembers.message}</p>}
              <p className="text-xs text-muted-foreground mt-1">
                Este valor se usa para calcular la cuota por miembro en los reportes.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="weeklyGoal">Meta de Ingresos Semanal</Label>
               <Controller
                name="weeklyGoal"
                control={control}
                render={({ field }) => (
                  <Input
                    id="weeklyGoal"
                    type="text"
                    inputMode="numeric"
                    placeholder="Escribe la meta semanal"
                    value={formatCurrencyForInput(field.value)}
                    onChange={(e) => field.onChange(parseCurrencyFromInput(e.target.value))}
                    className="text-lg"
                  />
                )}
              />
              {errors.weeklyGoal && <p className="text-sm text-destructive">{errors.weeklyGoal.message}</p>}
              <p className="text-xs text-muted-foreground mt-1">
                Meta para los reportes semanales.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyGoal">Meta de Ingresos (Período de 28 días)</Label>
               <Controller
                name="monthlyGoal"
                control={control}
                render={({ field }) => (
                  <Input
                    id="monthlyGoal"
                    type="text"
                    inputMode="numeric"
                    placeholder="Escribe la meta de ingresos"
                    value={formatCurrencyForInput(field.value)}
                    onChange={(e) => field.onChange(parseCurrencyFromInput(e.target.value))}
                    className="text-lg"
                  />
                )}
              />
              {errors.monthlyGoal && <p className="text-sm text-destructive">{errors.monthlyGoal.message}</p>}
              <p className="text-xs text-muted-foreground mt-1">
                Esta meta se mostrará en el dashboard para seguir el progreso del período actual.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full text-lg py-6" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar Configuración"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
