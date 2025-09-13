
"use client";

import React, { useState } from 'react';
import type { RevenueEntry } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrencyCOP, formatDate } from '@/lib/formatters';
import { calculateDailyTotal } from '@/lib/calculations';
import { Edit, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/useSettings';

interface RecentEntriesTableProps {
  entries: RevenueEntry[];
  onEdit: (entry: RevenueEntry) => void;
  onDelete: (id: string) => void;
}

export function RecentEntriesTable({ entries, onEdit, onDelete }: RecentEntriesTableProps) {
    const [entryToDelete, setEntryToDelete] = useState<RevenueEntry | null>(null);
    const { toast } = useToast();
    const { settings, isLoading: isLoadingSettings } = useSettings();

    const handleDeleteClick = (entry: RevenueEntry) => {
        setEntryToDelete(entry);
    };

    const confirmDelete = () => {
        if (entryToDelete) {
            onDelete(entryToDelete.id);
            toast({
                title: "Registro Eliminado",
                description: `Los ingresos para ${formatDate(entryToDelete.date, 'PPP')} han sido eliminados.`,
            });
            setEntryToDelete(null);
        }
    };

    if (entries.length === 0) {
        return <p className="text-muted-foreground text-center py-4">No hay registros para mostrar.</p>;
    }

  return (
    <>
        <ScrollArea className="h-96 w-full">
            <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Ingreso Total del Día</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {entries.map((entry) => {
                        const dailyTotal = isLoadingSettings ? { total: 0 } : calculateDailyTotal(entry, settings);
                        return (
                            <TableRow key={entry.id}>
                                <TableCell className="font-medium">{formatDate(entry.date, 'PPP')}</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrencyCOP(dailyTotal.total)}</TableCell>
                                <TableCell className="text-center space-x-2">
                                    <Button variant="outline" size="icon" onClick={() => onEdit(entry)}>
                                        <Edit className="h-4 w-4" />
                                        <span className="sr-only">Editar</span>
                                    </Button>
                                    <Button variant="destructive" size="icon" onClick={() => handleDeleteClick(entry)}>
                                        <Trash2 className="h-4 w-4" />
                                         <span className="sr-only">Eliminar</span>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </ScrollArea>
        <AlertDialog open={!!entryToDelete} onOpenChange={(open) => !open && setEntryToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <div className="flex justify-center mb-2">
                        <AlertTriangle className="h-10 w-10 text-destructive"/>
                    </div>
                    <AlertDialogTitle className="text-center">¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription className="text-center">
                        Esta acción no se puede deshacer. Esto eliminará permanentemente el registro de ingresos para la fecha <br/>
                        <span className="font-semibold text-foreground">{entryToDelete ? formatDate(entryToDelete.date, 'PPP') : ''}</span>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setEntryToDelete(null)}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                        Sí, eliminar registro
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}

    