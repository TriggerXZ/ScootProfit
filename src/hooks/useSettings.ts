
"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  LOCAL_STORAGE_SETTINGS_KEY,
  DEFAULT_NUMBER_OF_MEMBERS,
  DEFAULT_MONTHLY_GOAL,
  DEFAULT_WEEKLY_GOAL,
  DEFAULT_DEDUCTION_ZONA_SEGURA_PER_MEMBER,
  DEFAULT_DEDUCTION_ARRIENDO_PER_MEMBER,
  DEFAULT_DEDUCTION_APORTE_COOPERATIVA_PER_MEMBER,
} from '@/lib/constants';

export interface AppSettings {
  numberOfMembers: number;
  monthlyGoal: number;
  weeklyGoal: number;
  zonaSeguraDeduction: number;
  arriendoDeduction: number;
  cooperativaDeduction: number;
  goal_la72: number;
  goal_elCubo: number;
  goal_parqueDeLasLuces: number;
  goal_la78: number;
}

const defaultSettings: AppSettings = {
  numberOfMembers: DEFAULT_NUMBER_OF_MEMBERS,
  monthlyGoal: DEFAULT_MONTHLY_GOAL,
  weeklyGoal: DEFAULT_WEEKLY_GOAL,
  zonaSeguraDeduction: DEFAULT_DEDUCTION_ZONA_SEGURA_PER_MEMBER,
  arriendoDeduction: DEFAULT_DEDUCTION_ARRIENDO_PER_MEMBER,
  cooperativaDeduction: DEFAULT_DEDUCTION_APORTE_COOPERATIVA_PER_MEMBER,
  goal_la72: 0,
  goal_elCubo: 0,
  goal_parqueDeLasLuces: 0,
  goal_la78: 0,
};

function getSettingsFromLocalStorage(): AppSettings {
    if (typeof window === 'undefined') {
        return defaultSettings;
    }
    try {
        const storedSettings = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
        if (storedSettings) {
            const parsed = JSON.parse(storedSettings);
            // Merge stored settings with defaults to ensure all keys are present
            const updatedSettings = { ...defaultSettings, ...parsed };

            // Recalculate monthlyGoal based on individual location goals
            const individualGoalsTotal = 
                (updatedSettings.goal_la72 || 0) +
                (updatedSettings.goal_elCubo || 0) +
                (updatedSettings.goal_parqueDeLasLuces || 0) +
                (updatedSettings.goal_la78 || 0);
            
            if (individualGoalsTotal > 0) {
                updatedSettings.monthlyGoal = individualGoalsTotal;
            }

            return updatedSettings;
        }
    } catch (error) {
        console.error("Failed to parse settings from localStorage:", error);
    }
    return defaultSettings;
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSettings = useCallback(() => {
    setIsLoading(true);
    setSettings(getSettingsFromLocalStorage());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshSettings();
    
    const handleStorageChange = (event: StorageEvent) => {
        if (event.key === LOCAL_STORAGE_SETTINGS_KEY) {
            refreshSettings();
        }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };
  }, [refreshSettings]);

  return { settings, isLoading, refreshSettings };
}
