"use client";

import React from 'react';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Coins } from 'lucide-react';
import { useTheme } from 'next-themes';

// Dynamically import SidebarNav only on the client-side to prevent hydration errors.
const ClientSidebarNav = dynamic(() => import('@/components/SidebarNav').then(mod => mod.SidebarNav), {
  ssr: false,
});


export function AppLayout({ children }: { children: React.ReactNode }) {
  const { setTheme, resolvedTheme } = useTheme();

  return (
    <SidebarProvider defaultOpen>
      <Sidebar className="bg-sidebar text-sidebar-foreground">
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
            <Coins className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-headline font-semibold text-sidebar-foreground">ScootProfit</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <ClientSidebarNav />
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 backdrop-blur-md px-4 md:px-6">
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
          <div className="flex-1"></div> {/* Spacer */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
