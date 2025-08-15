
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useRevenueEntries } from '@/hooks/useRevenueEntries';
import { GROUPS, GROUP_IDS, LOCAL_STORAGE_SETTINGS_KEY, DEFAULT_GROUP_GOAL } from '@/lib/constants';
import { formatCurrencyCOP } from '@/lib/formatters';
import type { GroupId } from '@/types';
import { Users, Group, Award, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GroupSettings {
  [key: string]: number;
}

function getGroupGoals(): GroupSettings {
    if (typeof window === 'undefined') {
        return {};
    }
    const storedSettings = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
    if (storedSettings) {
        try {
            const parsed = JSON.parse(storedSettings);
            return {
                grupoCubo: parsed.goalGrupoCubo || DEFAULT_GROUP_GOAL,
                grupoLuces: parsed.goalGrupoLuces || DEFAULT_GROUP_GOAL,
                grupo78: parsed.goalGrupo78 || DEFAULT_GROUP_GOAL,
                grupo72: parsed.goalGrupo72 || DEFAULT_GROUP_GOAL,
            };
        } catch (e) {
            // Fallback to defaults
        }
    }
    return {
        grupoCubo: DEFAULT_GROUP_GOAL,
        grupoLuces: DEFAULT_GROUP_GOAL,
        grupo78: DEFAULT_GROUP_GOAL,
        grupo72: DEFAULT_GROUP_GOAL,
    };
}

export default function MembersPage() {
    const { allMonthlyTotals } = useRevenueEntries();
    const [groupGoals, setGroupGoals] = useState<GroupSettings>({});

    useEffect(() => {
        setGroupGoals(getGroupGoals());
        const handleStorageChange = () => {
            setGroupGoals(getGroupGoals());
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const historicalGroupPerformance = useMemo(() => {
        const groupTotals: { [key in GroupId]: { totalRevenue: number; periods: number } } = {
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
            const goal = groupGoals[groupId] || DEFAULT_GROUP_GOAL;
            const progress = goal > 0 ? (averageRevenue / goal) * 100 : 0;

            return {
                id: groupId,
                name: (GROUPS as any)[groupId.toUpperCase().replace('GRUPO', 'GRUPO_') as any]?.name || groupId,
                totalRevenue: data.totalRevenue,
                averageRevenue,
                periods: data.periods,
                goal,
                progress,
            };
        }).sort((a, b) => b.averageRevenue - a.averageRevenue);

    }, [allMonthlyTotals, groupGoals]);

    const getRankIcon = (rank: number) => {
        if (rank === 0) return <Trophy className="h-6 w-6 text-yellow-500" />;
        if (rank === 1) return <Award className="h-6 w-6 text-slate-400" />;
        if (rank === 2) return <Award className="h-6 w-6 text-yellow-700" />;
        return <div className="w-6 h-6 flex items-center justify-center font-bold text-muted-foreground">{rank + 1}</div>;
    };

    return (
        <div className="container mx-auto py-8">
            <Card className="shadow-xl">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Users className="h-7 w-7 text-primary" />
                        <CardTitle className="font-headline text-2xl">Rendimiento y Metas por Grupo</CardTitle>
                    </div>
                    <CardDescription>
                        Ranking y progreso de cada grupo hacia sus metas de ingresos promedio por período de 28 días.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-16">Ranking</TableHead>
                                <TableHead>Grupo</TableHead>
                                <TableHead className="w-1/3">Progreso Hacia la Meta</TableHead>
                                <TableHead className="text-right">Ingreso Promedio / Período</TableHead>
                                <TableHead className="text-right">Ingreso Total Histórico</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {historicalGroupPerformance.map((group, index) => (
                                <TableRow key={group.id} className={cn(index < 3 && "bg-muted/50")}>
                                    <TableCell className="font-medium flex items-center justify-center">
                                        {getRankIcon(index)}
                                    </TableCell>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <Group className="h-4 w-4 text-muted-foreground" />
                                        {group.name}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <Progress value={group.progress} className="h-3" />
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>{formatCurrencyCOP(group.averageRevenue)}</span>
                                                <span className="font-semibold">{formatCurrencyCOP(group.goal)}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-semibold text-lg">{formatCurrencyCOP(group.averageRevenue)}</TableCell>
                                    <TableCell className="text-right">{formatCurrencyCOP(group.totalRevenue)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
