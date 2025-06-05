
"use client";

import React from 'react';
import { RevenueEntryForm } from '@/components/forms/RevenueEntryForm';
import { useRevenueEntries } from '@/hooks/useRevenueEntries';
import type { LocationRevenueInput } from '@/types';

export default function RevenueEntryPage() {
  const { addEntry, getEntryByDate, refreshEntries } = useRevenueEntries();

  const handleSubmitSuccess = (date: string, revenues: LocationRevenueInput) => {
    addEntry(date, revenues);
    refreshEntries(); // Ensure data is up-to-date after adding
  };

  return (
    <div className="container mx-auto py-8">
      <RevenueEntryForm 
        onSubmitSuccess={handleSubmitSuccess}
        getExistingEntry={getEntryByDate}
      />
    </div>
  );
}
