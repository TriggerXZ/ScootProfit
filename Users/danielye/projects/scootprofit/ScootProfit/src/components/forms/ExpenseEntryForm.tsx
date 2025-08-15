
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/DatePicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EXPENSE_CATEGORIES } from '@/lib/constants';
import type { Expense } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { DollarSign } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';

const expenseSchema = z.object({
  date: z.date({ required_error: "La fecha es requerida." }),
  description: z.string().min(3, "La descripción es requerida (mínimo 3 caracteres)."),
  amount: z.number().positive("El monto debe ser un número positivo."),
  categoryId: z.string().min(1, "La categoría es requerida."),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface ExpenseEntryFormProps {
  onSubmitSuccess: () => void;
  editingExpense: Expense | null;
  onCancelEdit: () => void;
}

const formatCurrencyForInput = (value: string | number): string => {
    const numericString = String(value).replace(/[^0-9]/g, '');
    if (numericString === '') return "0";
    return parseInt(numericString, 10).toLocaleString('es-CO');
};

const parseCurrencyFromInput = (value: string): number => {
      return parseInt(value.replace(/\./g, ''), 10) || 0;
}


export function ExpenseEntryForm({ onSubmitSuccess, editingExpense, onCancelEdit }: ExpenseEntryFormProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [clientToday, setClientToday] = useState<Date | undefined>(undefined);
  const { toast } = useToast();
  const { addExpense } = useExpenses();

  const { control, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: new Date(),
      description: "",
      amount: 0,
      categoryId: undefined,
    },
  });

  useEffect(() => {
    const today = new Date();
    setClientToday(today);
    if (!editingExpense) {
        setSelectedDate(today);
        setValue("date", today);
    }
  }, [editingExpense, setValue]);
  
  useEffect(() => {
    if (editingExpense) {
      const entryDate = parseISO(editingExpense.date);
      setSelectedDate(entryDate);
      setValue("date", entryDate);
      setValue("description", editingExpense.description);
      setValue("amount", editingExpense.amount);
      setValue("categoryId", editingExpense.categoryId);
    } else {
        const today = new Date();
        setSelectedDate(today);
        reset({
            date: today,
            description: "",
            amount: 0,
            categoryId: undefined,
        });
    }
  }, [editingExpense, setValue, reset]);


  const processSubmit = (data: ExpenseFormValues) => {
    const expenseData = {
        date: format(data.date, 'yyyy-MM-dd'),
        description: data.description,
        amount: data.amount,
        categoryId: data.categoryId,
    };
    
    addExpense(expenseData, editingExpense?.id);

    toast({
      title: editingExpense ? "Gasto Actualizado" : "Gasto Guardado",
      description: `El gasto de ${formatCurrencyForInput(data.amount)} ha sido guardado.`,
    });
    
    onSubmitSuccess();
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">{editingExpense ? 'Editar Gasto' : 'Registrar Gasto Variable'}</CardTitle>
        <CardDescription>{editingExpense ? `Editando un gasto del ${format(parseISO(editingExpense.date), 'PPP', { locale: es })}.` : 'Ingresa los detalles del gasto operativo.'}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(processSubmit)}>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="date">Fecha del Gasto</Label>
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
                    disabled={(date) => {
                      if (!clientToday) return true;
                      return date > clientToday || date < new Date("2020-01-01");
                    }}
                  />
                )}
              />
              {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
            </div>

             <div className="space-y-2">
                <Label htmlFor="amount">Monto</Label>
                <div className="relative">
                   <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Controller
                        name="amount"
                        control={control}
                        render={({ field: { onChange, ...props } }) => (
                          <Input
                            {...props}
                            id="amount"
                            type="text" 
                            inputMode="numeric"
                            placeholder="0"
                            className="pl-10 text-lg"
                            value={formatCurrencyForInput(props.value || 0)}
                            onChange={(e) => onChange(parseCurrencyFromInput(e.target.value))}
                          />
                        )}
                      />
                </div>
                {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
              </div>
          </div>
          
           <div className="space-y-2">
              <Label htmlFor="categoryId">Categoría del Gasto</Label>
               <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map(cat => (
                         <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                    <Textarea
                        {...field}
                        id="description"
                        placeholder="Ej: Reparación de llanta scooter #15"
                        className="text-base"
                    />
                )}
              />
              {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
            </div>

        </CardContent>
        <CardFooter className="flex gap-4">
            {editingExpense && (
              <Button type="button" variant="outline" onClick={onCancelEdit} className="w-full text-lg py-6">
                Cancelar
              </Button>
            )}
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-6" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : (editingExpense ? 'Actualizar Gasto' : 'Guardar Gasto')}
            </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
