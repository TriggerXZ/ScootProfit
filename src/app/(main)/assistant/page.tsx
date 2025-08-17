'use client';

import { assistantFlow } from '@/ai/flows/assistant-flow';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Message, useChat } from 'ai/react';
import { Send } from 'lucide-react';
import { useState } from 'react';

export default function AssistantPage() {
  const [revenue, setRevenue] = useState('');
  const [expenses, setExpenses] = useState('');

  const { messages, input, handleInputChange, handleSubmit, setMessages } = useChat({
    api: '/api/assistant',
  });

  const handlePresetClick = (preset) => {
    // Implement preset logic here
  };

  return (
    <div className="flex flex-col h-full">
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle>Asistente de IA</CardTitle>
          <CardDescription>
            Chatea con un asistente de IA para analizar tus datos de ScootProfit.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4">
          <div className="flex-1 overflow-y-auto">
            {messages.map((m, index) => (
              <div key={index} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} mb-2`}>
                <div className={`px-4 py-2 rounded-lg ${m.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={input} onChange={handleInputChange} placeholder="Escribe un mensaje..." />
            <Button onClick={handleSubmit}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
