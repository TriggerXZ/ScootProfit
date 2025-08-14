
"use client";

import React, { useState } from 'react';
import type { Expense } from '@/types';
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
import { Edit, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EXPENSE_CATEGORIES } from '@/lib/constants';

interface RecentExpensesTableProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

export function RecentExpensesTable({ expenses, onEdit, onDelete }: RecentExpensesTableProps) {
    const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
    const { toast } = useToast();

    const handleDeleteClick = (expense: Expense) => {
        setExpenseToDelete(expense);
    };

    const confirmDelete = () => {
        if (expenseToDelete) {
            onDelete(expenseToDelete.id);
            toast({
                title: "Gasto Eliminado",
                description: `El gasto de ${expenseToDelete.description} ha sido eliminado.`,
            });
            setExpenseToDelete(null);
        }
    };

    if (expenses.length === 0) {
        return <p className="text-muted-foreground text-center py-4">No hay gastos para mostrar.</p>;
    }

  return (
    <>
        <ScrollArea className="h-96 w-full">
            <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {expenses.map((expense) => {
                        const category = EXPENSE_CATEGORIES.find(c => c.id === expense.categoryId);
                        return (
                            <TableRow key={expense.id}>
                                <TableCell className="font-medium">{formatDate(expense.date, 'PPP')}</TableCell>
                                <TableCell>{expense.description}</TableCell>
                                <TableCell>{category ? category.name : 'N/A'}</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrencyCOP(expense.amount)}</TableCell>
                                <TableCell className="text-center space-x-2">
                                    <Button variant="outline" size="icon" onClick={() => onEdit(expense)}>
                                        <Edit className="h-4 w-4" />
                                        <span className="sr-only">Editar</span>
                                    </Button>
                                    <Button variant="destructive" size="icon" onClick={() => handleDeleteClick(expense)}>
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
        <AlertDialog open={!!expenseToDelete} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <div className="flex justify-center mb-2">
                        <AlertTriangle className="h-10 w-10 text-destructive"/>
                    </div>
                    <AlertDialogTitle className="text-center">¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription className="text-center">
                        Esta acción no se puede deshacer. Esto eliminará permanentemente el gasto: <br/>
                        <span className="font-semibold text-foreground">{expenseToDelete ? expenseToDelete.description : ''}</span>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setExpenseToDelete(null)}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                        Sí, eliminar gasto
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
