
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import { Bot, Send, User, AlertTriangle } from 'lucide-react';
import { useRevenueEntries } from '@/hooks/useRevenueEntries';
import { useExpenses } from '@/hooks/useExpenses';
import { askBusinessAssistant } from '@/ai/flows/assistant-flow';
import { Skeleton } from '@/components/ui/skeleton';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
}

export default function AssistantPage() {
  const { entries: revenueEntries, isLoading: isLoadingRevenues } = useRevenueEntries();
  const { expenses, isLoading: isLoadingExpenses } = useExpenses();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 0 && !isLoadingRevenues && !isLoadingExpenses) {
        setMessages([
            {
                id: uuidv4(),
                role: 'assistant',
                content: "¡Hola! Soy tu asistente de negocios. Tengo acceso a todos tus datos de ingresos y gastos. ¿Qué te gustaría saber? Puedes preguntarme cosas como '¿Cuál fue el día más rentable de la última semana?' o 'Compara el rendimiento del Grupo Cubo y el Grupo 72 en el último período'."
            }
        ]);
    }
  }, [messages.length, isLoadingRevenues, isLoadingExpenses]);

  useEffect(() => {
    // Scroll to the bottom whenever messages change
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;

    const newUserMessage: Message = { id: uuidv4(), role: 'user', content: input };
    setMessages(prev => [...prev, newUserMessage]);
    setInput('');
    setIsThinking(true);

    try {
      const revenueDataString = JSON.stringify(revenueEntries);
      const expenseDataString = JSON.stringify(expenses);

      const result = await askBusinessAssistant({
        question: input,
        revenueData: revenueDataString,
        expenseData: expenseDataString
      });

      const assistantMessage: Message = { id: uuidv4(), role: 'assistant', content: result.answer };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error("Error calling assistant flow:", error);
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'error',
        content: "Lo siento, ocurrió un error al procesar tu solicitud. Por favor, asegúrate de que la API de Gemini esté configurada correctamente e inténtalo de nuevo."
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
    }
  };
  
  const isLoading = isLoadingRevenues || isLoadingExpenses;

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <header className="p-4 border-b">
        <h1 className="text-2xl font-headline font-bold text-foreground flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          Asistente de Negocios IA
        </h1>
        <p className="text-muted-foreground mt-1">
            Chatea con tus datos de ingresos y gastos.
        </p>
      </header>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="p-4 md:p-6 space-y-6">
            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-16 w-3/4" />
                    <Skeleton className="h-16 w-3/4 ml-auto" />
                </div>
            ) : (
                messages.map(message => (
                  <div key={message.id} className={`flex items-start gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}>
                    {message.role !== 'user' && (
                      <Avatar className="w-9 h-9 border">
                        <div className="flex items-center justify-center h-full w-full bg-primary/20">
                           {message.role === 'assistant' ? <Bot className="h-5 w-5 text-primary" /> : <AlertTriangle className="h-5 w-5 text-destructive" />}
                        </div>
                      </Avatar>
                    )}
                    <div className={
                      `max-w-xl p-3 rounded-lg whitespace-pre-wrap ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : message.role === 'assistant'
                          ? 'bg-muted'
                          : 'bg-destructive/10 text-destructive-foreground border border-destructive/20'
                      }`
                    }>
                      <p className="text-sm">{message.content}</p>
                    </div>
                     {message.role === 'user' && (
                      <Avatar className="w-9 h-9 border">
                         <div className="flex items-center justify-center h-full w-full bg-muted">
                           <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </Avatar>
                    )}
                  </div>
                ))
            )}
             {isThinking && (
                <div className="flex items-start gap-4">
                     <Avatar className="w-9 h-9 border">
                        <div className="flex items-center justify-center h-full w-full bg-primary/20">
                           <Bot className="h-5 w-5 text-primary" />
                        </div>
                      </Avatar>
                    <div className="max-w-xl p-3 rounded-lg bg-muted flex items-center space-x-2">
                       <span className="text-sm">Pensando...</span>
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-75"></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-150"></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-300"></div>
                    </div>
                </div>
             )}
          </div>
        </ScrollArea>
      </div>

      <footer className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu pregunta aquí..."
            className="flex-1"
            disabled={isThinking || isLoading}
          />
          <Button type="submit" disabled={isThinking || !input.trim() || isLoading}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Enviar</span>
          </Button>
        </form>
      </footer>
    </div>
  );
}
