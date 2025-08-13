
"use client";

import React, { useState } from 'react';
import { RevenueEntryForm } from '@/components/forms/RevenueEntryForm';
import { RecentEntriesTable } from '@/components/sections/RecentEntriesTable';
import { useRevenueEntries } from '@/hooks/useRevenueEntries';
import type { LocationRevenueInput, RevenueEntry } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function RevenueEntryPage() {
  const { entries, addEntry, getEntryByDate, deleteEntry, refreshEntries } = useRevenueEntries();
  const [editingEntry, setEditingEntry] = useState<RevenueEntry | null>(null);

  const handleSubmitSuccess = (date: string, revenues: LocationRevenueInput) => {
    addEntry(date, revenues);
    setEditingEntry(null); // Clear editing state after successful submission
    refreshEntries();
  };
  
  const handleEdit = (entry: RevenueEntry) => {
    setEditingEntry(entry);
    // Scroll to the top to make the form visible
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleCancelEdit = () => {
    setEditingEntry(null);
  };
  
  const handleDelete = (id: string) => {
    deleteEntry(id);
    if(editingEntry?.id === id) {
        setEditingEntry(null);
    }
  };


  return (
    <div className="container mx-auto py-8 space-y-8">
      <RevenueEntryForm 
        onSubmitSuccess={handleSubmitSuccess}
        getExistingEntry={getEntryByDate}
        editingEntry={editingEntry}
        onCancelEdit={handleCancelEdit}
      />
      
      <Separator />

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Historial de Registros</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentEntriesTable 
            entries={entries}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>
    </div>
  );
}
