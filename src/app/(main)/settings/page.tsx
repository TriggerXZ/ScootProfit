
"use client";

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Settings, AlertTriangle, Copy, ClipboardPaste, Target } from 'lucide-react';
import { LOCAL_STORAGE_SETTINGS_KEY, LOCAL_STORAGE_REVENUE_KEY, LOCAL_STORAGE_EXPENSES_KEY, LOCATIONS } from '@/lib/constants';
import { useSettings } from '@/hooks/useSettings';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';

const settingsSchema = z.object({
  numberOfMembers: z.number().int().min(1, "El número de miembros debe ser al menos 1."),
  weeklyGoal: z.number().int().min(1, "La meta debe ser un número positivo."),
  zonaSeguraDeduction: z.number().int().nonnegative("El costo debe ser un número positivo."),
  arriendoDeduction: z.number().int().nonnegative("El costo debe ser un número positivo."),
  cooperativaDeduction: z.number().int().nonnegative("El costo debe ser un número positivo."),
  goal_la72: z.number().int().nonnegative("La meta debe ser un número positivo."),
  goal_elCubo: z.number().int().nonnegative("La meta debe ser un número positivo."),
  goal_parqueDeLasLuces: z.number().int().nonnegative("La meta debe ser un número positivo."),
  goal_la78: z.number().int().nonnegative("La meta debe ser un número positivo."),
}).refine(data => {
    const totalGoal = data.goal_la72 + data.goal_elCubo + data.goal_parqueDeLasLuces + data.goal_la78;
    return totalGoal > 0;
}, {
    message: "La suma de las metas por ubicación debe ser mayor que cero.",
    path: ["goal_la72"], // You can associate the error with one of the fields
});

// We remove monthlyGoal from the form validation, it will be calculated
type SettingsFormValues = Omit<z.infer<typeof settingsSchema>, 'monthlyGoal'>;


export default function SettingsPage() {
  const { toast } = useToast();
  const { settings, isLoading, refreshSettings } = useSettings();
  const [dataForCopy, setDataForCopy] = useState('');
  const [dataToPaste, setDataToPaste] = useState('');

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings,
  });

  React.useEffect(() => {
    if (!isLoading) {
      reset(settings);
    }
  }, [settings, isLoading, reset]);

  const processSubmit = (data: SettingsFormValues) => {
    const monthlyGoal = (data.goal_la72 || 0) + (data.goal_elCubo || 0) + (data.goal_parqueDeLasLuces || 0) + (data.goal_la78 || 0);
    const settingsToSave = { ...data, monthlyGoal };

    localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(settingsToSave));
    refreshSettings(); // Refresh the settings in the hook
    toast({
      title: "Configuración Guardada",
      description: "Los cambios han sido guardados exitosamente. Los nuevos cálculos usarán estos valores.",
      variant: 'default',
      className: 'bg-green-500 text-white'
    });
  };

  const getAllDataAsJSON = (): string => {
    const revenues = localStorage.getItem(LOCAL_STORAGE_REVENUE_KEY) || '[]';
    const expenses = localStorage.getItem(LOCAL_STORAGE_EXPENSES_KEY) || '[]';
    const currentSettings = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY) || '{}';

    const dataToExport = {
        revenues: JSON.parse(revenues),
        expenses: JSON.parse(expenses),
        settings: JSON.parse(currentSettings),
    };

    return JSON.stringify(dataToExport, null, 2);
  };
  
  const restoreDataFromJSON = (jsonData: string) => {
    const importedData = JSON.parse(jsonData);

    if (importedData.revenues && importedData.expenses && importedData.settings) {
        localStorage.setItem(LOCAL_STORAGE_REVENUE_KEY, JSON.stringify(importedData.revenues));
        localStorage.setItem(LOCAL_STORAGE_EXPENSES_KEY, JSON.stringify(importedData.expenses));
        localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(importedData.settings));

        toast({
            title: "Importación Exitosa",
            description: "Datos restaurados. La aplicación se recargará.",
        });

        setTimeout(() => window.location.reload(), 1500);
    } else {
        throw new Error("El archivo no tiene el formato esperado.");
    }
  };


  const handleShowDataForCopy = () => {
    setDataForCopy(getAllDataAsJSON());
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(dataForCopy).then(() => {
        toast({ title: "Copiado", description: "Los datos se han copiado al portapapeles." });
    }, () => {
        toast({ title: "Error", description: "No se pudo copiar al portapapeles.", variant: "destructive" });
    });
  };

  const handleRestoreFromText = () => {
    try {
        if(!dataToPaste.trim()) {
            toast({ title: "Error", description: "El campo de texto está vacío.", variant: "destructive" });
            return;
        }
        restoreDataFromJSON(dataToPaste);
    } catch (error: any) {
        toast({
            title: "Error de Restauración",
            description: error.message || "El texto no es un JSON válido o no tiene el formato correcto.",
            variant: "destructive",
        });
    }
  }

  if (isLoading) {
    return <div>Cargando configuración...</div>
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
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
                          value={parseInt(String(field.value), 10).toLocaleString('es-CO')}
                          onChange={(e) => field.onChange(parseInt(e.target.value.replace(/\./g, ''), 10) || 0)}
                          className="text-lg"
                        />
                      )}
                    />
                    {errors.weeklyGoal && <p className="text-sm text-destructive">{errors.weeklyGoal.message}</p>}
                     <p className="text-xs text-muted-foreground mt-1">
                      Usada para el cumplimiento diario en el Dashboard.
                    </p>
                </div>
            </div>

            <div>
              <h3 className="text-lg font-medium font-headline mb-4 flex items-center gap-2"><Target className="h-5 w-5" /> Metas de Ingresos por Ubicación (28 días)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {Object.values(LOCATIONS).map(location => (
                    <div className="space-y-2" key={location.id}>
                        <Label htmlFor={`goal_${location.id}`}>{location.name}</Label>
                        <Controller
                            name={`goal_${location.id}` as keyof SettingsFormValues}
                            control={control}
                            render={({ field }) => (
                            <Input
                                id={`goal_${location.id}`}
                                type="text"
                                inputMode="numeric"
                                placeholder="Escribe la meta"
                                value={parseInt(String(field.value), 10).toLocaleString('es-CO')}
                                onChange={(e) => field.onChange(parseInt(e.target.value.replace(/\./g, ''), 10) || 0)}
                                className="text-lg"
                            />
                            )}
                        />
                        {errors[`goal_${location.id}` as keyof typeof errors] && <p className="text-sm text-destructive">{errors[`goal_${location.id}` as keyof typeof errors]?.message}</p>}
                    </div>
                ))}
              </div>
                {errors.goal_la72?.message && <p className="text-sm text-destructive mt-2">{errors.goal_la72.message}</p>}
                 <p className="text-xs text-muted-foreground mt-2">
                  La meta de ingresos total para el período de 28 días será la suma de estas metas individuales.
                </p>
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
                            value={parseInt(String(field.value), 10).toLocaleString('es-CO')}
                            onChange={(e) => field.onChange(parseInt(e.target.value.replace(/\./g, ''), 10) || 0)}
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
                            value={parseInt(String(field.value), 10).toLocaleString('es-CO')}
                            onChange={(e) => field.onChange(parseInt(e.target.value.replace(/\./g, ''), 10) || 0)}
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
                            value={parseInt(String(field.value), 10).toLocaleString('es-CO')}
                            onChange={(e) => field.onChange(parseInt(e.target.value.replace(/\./g, ''), 10) || 0)}
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

      <Separator />

       <Card className="w-full max-w-2xl mx-auto shadow-xl border-border">
        <CardHeader>
           <div className="flex items-center gap-3">
            <ClipboardPaste className="h-7 w-7 text-primary" />
            <CardTitle className="font-headline text-2xl">Migración Manual (Copiar y Pegar)</CardTitle>
          </div>
          <CardDescription>
            Copia y pega el bloque de texto para mover tus datos entre navegadores o dispositivos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                <h3 className="font-semibold mb-2">1. Copiar Datos Actuales</h3>
                <div className="flex gap-2">
                    <Button onClick={handleShowDataForCopy} variant="outline" className="w-1/2">
                        Generar y Mostrar Datos
                    </Button>
                    <Button onClick={handleCopyToClipboard} disabled={!dataForCopy} className="w-1/2">
                        <Copy className="mr-2 h-4 w-4" />
                        Copiar al Portapapeles
                    </Button>
                </div>
                {dataForCopy && (
                    <Textarea 
                        readOnly
                        value={dataForCopy}
                        className="mt-2 h-32 font-mono text-xs"
                        placeholder="Aquí se mostrarán tus datos..."
                    />
                )}
            </div>
             <div>
                <h3 className="font-semibold mb-2">2. Pegar y Restaurar Datos</h3>
                 <Textarea 
                    value={dataToPaste}
                    onChange={(e) => setDataToPaste(e.target.value)}
                    className="h-32 font-mono text-xs"
                    placeholder="Pega aquí el código de datos de otra instancia de la app..."
                />
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full mt-2" disabled={!dataToPaste}>
                            <ClipboardPaste className="mr-2 h-4 w-4" />
                            Restaurar desde Texto
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-6 w-6 text-destructive" />
                            ¿Estás seguro de restaurar?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción es irreversible y reemplazará todos los datos actuales con el texto que has pegado.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRestoreFromText} className="bg-destructive hover:bg-destructive/90">
                            Sí, reemplazar datos
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </CardContent>
      </Card>

    </div>
  );
}
