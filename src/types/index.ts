
export interface LocationRevenueInput {
  la72: string; // Input as string for form handling
  elCubo: string;
  parqueDeLasLuces: string;
  la78: string;
}

export interface LocationRevenue {
  la72: number;
  elCubo: number;
  parqueDeLasLuces: number;
  la78: number;
}

export interface RevenueEntry {
  id: string; // YYYY-MM-DD
  date: string; // YYYY-MM-DD
  revenues: LocationRevenue;
}

export interface DailyTotal {
  date: string;
  total: number;
  memberShare: number;
  locationTotals: LocationRevenue;
}

export interface AggregatedTotal {
  period: string; // e.g., "Week of YYYY-MM-DD", "Month of YYYY-MM"
  total: number;
  memberShare: number;
  entries: RevenueEntry[];
}
