
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
import { LOCAL_STORAGE_SETTINGS_KEY } from '@/lib/constants';
import { useSettings } from '@/hooks/useSettings';
import type { AppSettings } from '@/hooks/useSettings';

const settingsSchema = z.object({
  numberOfMembers: z.number().int().min(1, "El número de miembros debe ser al menos 1."),
  monthlyGoal: z.number().int().min(1, "La meta debe ser un número positivo."),
  weeklyGoal: z.number().int().min(1, "La meta debe ser un número positivo."),
  zonaSeguraDeduction: z.number().int().nonnegative("El costo debe ser un número positivo."),
  arriendoDeduction: z.number().int().nonnegative("El costo debe ser un número positivo."),
  cooperativaDeduction: z.number().int().nonnegative("El costo debe ser un número positivo."),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const { settings, isLoading, refreshSettings } = useSettings();

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings,
  });

  useEffect(() => {
    if (!isLoading) {
      reset(settings);
    }
  }, [settings, isLoading, reset]);

  const processSubmit = (data: SettingsFormValues) => {
    localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(data));
    refreshSettings(); // Refresh the settings in the hook
    toast({
      title: "Configuración Guardada",
      description: "Los cambios han sido guardados exitosamente. Los nuevos cálculos usarán estos valores.",
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
  
  if (isLoading) {
    return <div>Cargando configuración...</div>
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="w-full max-w-2xl mx-auto shadow-xl border-border">
        <CardHeader>
           <div className="flex items-center gap-3">
            <Settings className="h-7 w-7 text-primary" />
            <CardTitle className="font-headline text-2xl">Configuración</CardTitle>
          </div>
          <CardDescription>Ajusta los parámetros globales, metas y costos fijos de la aplicación.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(processSubmit)}>
          <CardContent className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  Este valor se usa para calcular la cuota por miembro.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  Esta meta se usa para calcular el cumplimiento diario en el Dashboard.
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
                  Esta meta se usa en la tarjeta de progreso del Dashboard y en los reportes.
                </p>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium font-headline mb-4">Costos Fijos Mensuales (por Miembro)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="zonaSeguraDeduction">Zona Segura</Label>
                    <Controller
                        name="zonaSeguraDeduction"
                        control={control}
                        render={({ field }) => (
                        <Input
                            id="zonaSeguraDeduction"
                            type="text"
                            inputMode="numeric"
                            value={formatCurrencyForInput(field.value)}
                            onChange={(e) => field.onChange(parseCurrencyFromInput(e.target.value))}
                            className="text-lg"
                        />
                        )}
                    />
                    {errors.zonaSeguraDeduction && <p className="text-sm text-destructive">{errors.zonaSeguraDeduction.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="arriendoDeduction">Arriendo</Label>
                    <Controller
                        name="arriendoDeduction"
                        control={control}
                        render={({ field }) => (
                        <Input
                            id="arriendoDeduction"
                            type="text"
                            inputMode="numeric"
                            value={formatCurrencyForInput(field.value)}
                            onChange={(e) => field.onChange(parseCurrencyFromInput(e.target.value))}
                            className="text-lg"
                        />
                        )}
                    />
                    {errors.arriendoDeduction && <p className="text-sm text-destructive">{errors.arriendoDeduction.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="cooperativaDeduction">Aporte Cooperativa</Label>
                    <Controller
                        name="cooperativaDeduction"
                        control={control}
                        render={({ field }) => (
                        <Input
                            id="cooperativaDeduction"
                            type="text"
                            inputMode="numeric"
                            value={formatCurrencyForInput(field.value)}
                            onChange={(e) => field.onChange(parseCurrencyFromInput(e.target.value))}
                            className="text-lg"
                        />
                        )}
                    />
                    {errors.cooperativaDeduction && <p className="text-sm text-destructive">{errors.cooperativaDeduction.message}</p>}
                </div>
              </div>
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
