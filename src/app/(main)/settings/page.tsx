
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
import { Settings, Download, Upload, AlertTriangle, Copy, ClipboardPaste } from 'lucide-react';
import { LOCAL_STORAGE_SETTINGS_KEY, LOCAL_STORAGE_REVENUE_KEY, LOCAL_STORAGE_EXPENSES_KEY } from '@/lib/constants';
import { useSettings } from '@/hooks/useSettings';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';

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
    localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(data));
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
  
  const handleExportData = () => {
    try {
        const dataStr = getAllDataAsJSON();
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        const date = new Date().toISOString().split('T')[0];
        link.download = `scootprofit_backup_${date}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast({
            title: "Exportación Exitosa",
            description: "Todos tus datos han sido guardados en un archivo JSON.",
        });
    } catch (error) {
        console.error("Error exporting data:", error);
        toast({
            title: "Error de Exportación",
            description: "No se pudieron exportar los datos. Revisa la consola para más detalles.",
            variant: "destructive",
        });
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result;
            if (typeof text !== 'string') throw new Error("File content is not readable");
            restoreDataFromJSON(text);
        } catch (error: any) {
            console.error("Error importing data:", error);
            toast({
                title: "Error de Importación",
                description: error.message || "El archivo está dañado o no tiene el formato correcto.",
                variant: "destructive",
            });
        }
    };
    reader.readAsText(file);
    event.target.value = '';
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
                      value={parseInt(String(field.value), 10).toLocaleString('es-CO')}
                      onChange={(e) => field.onChange(parseInt(e.target.value.replace(/\./g, ''), 10) || 0)}
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
                      value={parseInt(String(field.value), 10).toLocaleString('es-CO')}
                      onChange={(e) => field.onChange(parseInt(e.target.value.replace(/\./g, ''), 10) || 0)}
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
            <Upload className="h-7 w-7 text-primary" />
            <CardTitle className="font-headline text-2xl">Migración de Datos (Archivos)</CardTitle>
          </div>
          <CardDescription>
            Crea una copia de seguridad de todos tus datos (ingresos, gastos y configuración) o restaura desde un archivo.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold">Exportar Datos</h3>
            <p className="text-sm text-muted-foreground">
              Guarda todos tus datos en un único archivo JSON. Mantenlo en un lugar seguro.
            </p>
            <Button onClick={handleExportData} variant="outline" className="mt-2">
              <Download className="mr-2 h-4 w-4" />
              Descargar Copia de Seguridad
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="font-semibold">Importar Datos</h3>
            <p className="text-sm text-muted-foreground">
              Selecciona un archivo de copia de seguridad para restaurar tus datos.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="mt-2">
                  <Upload className="mr-2 h-4 w-4" />
                  Restaurar desde Archivo
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                    ¿Estás seguro?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción es irreversible. Se borrarán todos los datos actuales de la aplicación y se reemplazarán con los datos del archivo que selecciones. Asegúrate de haber seleccionado el archivo correcto.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction asChild>
                     <Label htmlFor="import-file" className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer">
                        Sí, reemplazar datos
                        <Input id="import-file" type="file" accept=".json" className="hidden" onChange={handleImportData} />
                     </Label>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
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


    