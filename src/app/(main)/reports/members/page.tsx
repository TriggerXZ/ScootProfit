
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRevenueEntries } from '@/hooks/useRevenueEntries';
import { GROUPS, GROUP_IDS } from '@/lib/constants';
import { formatCurrencyCOP } from '@/lib/formatters';
import { Group, Users } from 'lucide-react';

export default function MembersPage() {
    const { allMonthlyTotals } = useRevenueEntries();

    const historicalGroupPerformance = useMemo(() => {
        const groupTotals: { [key in (typeof GROUP_IDS)[number]]: { totalRevenue: number; periods: number } } = {
            grupoCubo: { totalRevenue: 0, periods: 0 },
            grupoLuces: { totalRevenue: 0, periods: 0 },
            grupo78: { totalRevenue: 0, periods: 0 },
            grupo72: { totalRevenue: 0, periods: 0 },
        };

        const totals = allMonthlyTotals();

        totals.forEach(period => {
            GROUP_IDS.forEach(groupId => {
                const revenue = period.groupRevenueTotals[groupId];
                if (revenue > 0) {
                    groupTotals[groupId].totalRevenue += revenue;
                    groupTotals[groupId].periods += 1;
                }
            });
        });

        return GROUP_IDS.map(groupId => {
            const data = groupTotals[groupId];
            const averageRevenue = data.periods > 0 ? data.totalRevenue / data.periods : 0;
            return {
                id: groupId,
                name: GROUPS[groupId.toUpperCase().replace('GRUPO', 'GRUPO_') as keyof typeof GROUPS].name,
                totalRevenue: data.totalRevenue,
                averageRevenue,
                periods: data.periods,
            };
        }).sort((a, b) => b.totalRevenue - a.totalRevenue);

    }, [allMonthlyTotals]);

    return (
        <div className="container mx-auto py-8">
            <Card className="shadow-xl">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Users className="h-7 w-7 text-primary" />
                        <CardTitle className="font-headline text-2xl">Rendimiento Histórico por Grupo</CardTitle>
                    </div>
                    <CardDescription>
                        Un resumen del rendimiento total y promedio de cada grupo a lo largo de todos los períodos registrados.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Grupo</TableHead>
                                <TableHead className="text-right">Ingreso Total Acumulado</TableHead>
                                <TableHead className="text-right">Ingreso Promedio por Período</TableHead>
                                <TableHead className="text-center">Períodos Activos</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {historicalGroupPerformance.map(group => (
                                <TableRow key={group.id}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <Group className="h-4 w-4 text-muted-foreground" />
                                        {group.name}
                                    </TableCell>
                                    <TableCell className="text-right font-semibold text-lg">{formatCurrencyCOP(group.totalRevenue)}</TableCell>
                                    <TableCell className="text-right">{formatCurrencyCOP(group.averageRevenue)}</TableCell>
                                    <TableCell className="text-center">{group.periods}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
