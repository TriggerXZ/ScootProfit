'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, User, Bot } from 'lucide-react';
import { useRevenueEntries } from '@/hooks/useRevenueEntries';
import { useExpenses } from '@/hooks/useExpenses';
import { getHistoricalMonthlyDataString } from '@/lib/calculations';
import { askBusinessAssistant } from '@/ai/flows/assistant-flow';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrencyCOP } from '@/lib/formatters';
import { getMonth, getYear, parseISO } from 'date-fns';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { entries, isLoading: isLoadingEntries } = useRevenueEntries();
  const { expenses, isLoading: isLoadingExpenses } = useExpenses();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);
  
  const getExpenseDataString = () => {
    const monthlyExpenses: { [key: string]: number } = {};
    expenses.forEach(expense => {
      const date = parseISO(expense.date);
      const monthKey = `${getYear(date)}-${getMonth(date)}`;
      monthlyExpenses[monthKey] = (monthlyExpenses[monthKey] || 0) + expense.amount;
    });

    return Object.entries(monthlyExpenses)
      .map(([key, total]) => {
        const [year, month] = key.split('-');
        const monthName = new Date(Number(year), Number(month)).toLocaleString('es-ES', { month: 'long' });
        return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)}: ${formatCurrencyCOP(total)}`;
      })
      .join(', ');
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const revenueData = getHistoricalMonthlyDataString(entries);
      const expenseData = getExpenseDataString();

      const result = await askBusinessAssistant({
        question: input,
        revenueData: revenueData || "No hay datos de ingresos disponibles.",
        expenseData: expenseData || "No hay datos de gastos disponibles.",
      });
      
      const assistantMessage: Message = { role: 'assistant', content: result.answer };
      setMessages((prev) => [...prev, assistantMessage]);

    } catch (error) {
      console.error("Error asking assistant:", error);
      const errorMessage: Message = { role: 'assistant', content: "Lo siento, ocurrió un error al procesar tu pregunta. Por favor, intenta de nuevo." };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 h-[calc(100vh-8rem)] flex flex-col">
      <Card className="flex-1 flex flex-col shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <Bot className="text-primary" /> Asistente de Negocios IA
          </CardTitle>
          <CardDescription>
            Haz una pregunta sobre tus ingresos o gastos y la IA te dará un análisis.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
            <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
                 <div className="space-y-6">
                    {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`flex items-start gap-3 ${
                        message.role === 'user' ? 'justify-end' : ''
                        }`}
                    >
                        {message.role === 'assistant' && (
                        <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                            <Bot className="h-5 w-5" />
                            </AvatarFallback>
                        </Avatar>
                        )}
                        <div
                        className={`rounded-lg px-4 py-3 max-w-lg ${
                            message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                        >
                        <p className="text-sm">{message.content}</p>
                        </div>
                        {message.role === 'user' && (
                        <Avatar className="h-9 w-9">
                            <AvatarFallback>
                            <User className="h-5 w-5" />
                            </AvatarFallback>
                        </Avatar>
                        )}
                    </div>
                    ))}
                    {isLoading && (
                         <div className="flex items-start gap-3">
                            <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                <Bot className="h-5 w-5" />
                                </AvatarFallback>
                            </Avatar>
                            <div className="rounded-lg px-4 py-3 max-w-lg bg-muted flex items-center gap-2">
                                <span className="h-2 w-2 bg-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="h-2 w-2 bg-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="h-2 w-2 bg-foreground rounded-full animate-bounce"></span>
                            </div>
                        </div>
                    )}
                 </div>
            </ScrollArea>
        </CardContent>
        <div className="p-4 border-t">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ej: ¿Cuál fue el mes con mayores ingresos?"
              className="flex-1 text-base"
              disabled={isLoading || isLoadingEntries || isLoadingExpenses}
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
