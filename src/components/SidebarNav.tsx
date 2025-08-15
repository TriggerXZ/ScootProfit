
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Edit3, BarChart3, Settings, Users, Download, Receipt } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import React, { useState, useEffect } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/entry', label: 'Registrar Ingresos', icon: Edit3 },
];

const reportNavItems = [
  { href: '/reports', label: 'Resumen de Períodos', icon: BarChart3 },
  { href: '/reports/members', label: 'Rendimiento de Grupos', icon: Users },
  { href: '/reports/export', label: 'Exportar Datos', icon: Download },
];

export function SidebarNav() {
  const pathname = usePathname();
  const isReportsActive = pathname.startsWith('/reports');
  const [accordionValue, setAccordionValue] = useState("");

  useEffect(() => {
    // Set the accordion value on the client side to avoid hydration mismatch
    if (isReportsActive) {
      setAccordionValue("item-1");
    } else {
      setAccordionValue("");
    }
  }, [isReportsActive]);


  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} passHref legacyBehavior>
            <SidebarMenuButton
              isActive={pathname === item.href}
              className={cn(
                "w-full justify-start",
                (pathname === item.href)
                  ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              tooltip={{content: item.label, side: 'right', className: 'bg-popover text-popover-foreground'}}
            >
              <item.icon className="h-5 w-5 mr-3" />
              <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}

      {/* Reports Dropdown */}
      <SidebarMenuItem>
         <Accordion type="single" collapsible value={accordionValue} onValueChange={setAccordionValue} className="w-full">
            <AccordionItem value="item-1" className="border-none">
                <AccordionTrigger 
                    className={cn(
                        "hover:no-underline p-0 flex",
                        (isReportsActive)
                        ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 rounded-md"
                        : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md"
                    )}
                 >
                    <div 
                        className="w-full h-8 px-2 flex items-center gap-2"
                        tooltip-content="Reportes"
                    >
                        <BarChart3 className="h-5 w-5" />
                        <span className="group-data-[collapsible=icon]:hidden">Reportes</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="p-0 pl-4 group-data-[collapsible=icon]:hidden">
                    <SidebarMenuSub>
                        {reportNavItems.map(item => (
                            <SidebarMenuSubItem key={item.href}>
                                <Link href={item.href} passHref legacyBehavior>
                                    <SidebarMenuSubButton isActive={pathname === item.href}>
                                        <item.icon className="h-4 w-4 mr-2"/>
                                        <span>{item.label}</span>
                                    </SidebarMenuSubButton>
                                </Link>
                            </SidebarMenuSubItem>
                        ))}
                    </SidebarMenuSub>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
      </SidebarMenuItem>


       <SidebarMenuItem>
          <Link href="/settings" passHref legacyBehavior>
            <SidebarMenuButton
              isActive={pathname.startsWith("/settings")}
              className={cn(
                "w-full justify-start",
                (pathname.startsWith("/settings"))
                  ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              tooltip={{content: "Configuración", side: 'right', className: 'bg-popover text-popover-foreground'}}
            >
              <Settings className="h-5 w-5 mr-3" />
              <span className="group-data-[collapsible=icon]:hidden">Configuración</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
    </SidebarMenu>
  );
}
