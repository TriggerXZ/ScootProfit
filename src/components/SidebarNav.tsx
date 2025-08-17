
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Edit3, BarChart3, Settings, ReceiptText, Bot } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/assistant', label: 'Asistente IA', icon: Bot },
  { href: '/entry', label: 'Registrar Ingresos', icon: Edit3 },
  { href: '/expenses', label: 'Registrar Gastos', icon: ReceiptText },
  { href: '/reports', label: 'Reportes', icon: BarChart3 },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {navItems.map((item) => {
          // Special case for root, otherwise check startsWith
          const isActive = item.href === '/dashboard' ? pathname === item.href || pathname === '/' : pathname.startsWith(item.href);

          return (
          <SidebarMenuItem key={item.href}>
              <Link href={item.href} passHref legacyBehavior>
              <SidebarMenuButton
                  isActive={isActive}
                  className={cn(
                  "w-full justify-start",
                  isActive
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
          );
      })}

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
