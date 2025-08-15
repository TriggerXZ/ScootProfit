
export const LOCATIONS = {
  LA72: { id: 'la72', name: 'La 72' },
  EL_CUBO: { id: 'elCubo', name: 'El Cubo' },
  PARQUE_DE_LAS_LUCES: { id: 'parqueDeLasLuces', name: 'P. de las Luces' },
  LA78: { id: 'la78', name: 'La 78' },
} as const;

export type LocationId = keyof typeof LOCATIONS extends infer T ? T extends string ? typeof LOCATIONS[T]['id'] : never : never;

export const LOCATION_IDS = Object.values(LOCATIONS).map(loc => loc.id) as LocationId[];

export const LOCAL_STORAGE_REVENUE_KEY = 'scootProfitEntries';
export const LOCAL_STORAGE_EXPENSE_KEY = 'scootProfitExpenses';
export const LOCAL_STORAGE_SETTINGS_KEY = 'scootProfitSettings';


// --- DEFAULT VALUES ---
// These are used as fallbacks if no custom settings are found in localStorage.

export const DEFAULT_NUMBER_OF_MEMBERS = 20;
export const DEFAULT_MONTHLY_GOAL = 120000000; // Default goal of 120 million COP
export const DEFAULT_WEEKLY_GOAL = 25000000; // Default goal of 25 million COP
export const DEFAULT_GROUP_GOAL = 30000000; // Default goal of 30 million COP per group per 28-day period

// Default Deductions FIJAS MENSUALES: Contribución POR MIEMBRO a los costos operativos totales del negocio.
export const DEFAULT_DEDUCTION_ZONA_SEGURA_PER_MEMBER = 20000;
export const DEFAULT_DEDUCTION_ARRIENDO_PER_MEMBER = 299000;
export const DEFAULT_DEDUCTION_APORTE_COOPERATIVA_PER_MEMBER = 72000;


// --- Group Rotation Constants ---

export const GROUPS = {
  GRUPO_CUBO: { id: 'grupoCubo', name: 'Grupo Cubo' },
  GRUPO_LUCES: { id: 'grupoLuces', name: 'Grupo Luces' },
  GRUPO_78: { id: 'grupo78', name: 'Grupo 78' },
  GRUPO_72: { id: 'grupo72', name: 'Grupo 72' },
} as const;

export type GroupId = keyof typeof GROUPS extends infer T ? T extends string ? typeof GROUPS[T]['id'] : never : never;

export const GROUP_IDS = Object.values(GROUPS).map(g => g.id) as GroupId[];

// The date when the rotation schedule began.
// IMPORTANT: This should be a Tuesday, as the business weeks start on Tuesdays.
export const ROTATION_START_DATE = '2024-06-04';

// Initial assignment of groups to locations for the week of ROTATION_START_DATE.
// The order of locations here MUST match LOCATION_IDS for the rotation logic to work.
export const INITIAL_ROTATION_ASSIGNMENT: readonly GroupId[] = [
  GROUPS.GRUPO_LUCES.id,    // Assigned to la72
  GROUPS.GRUPO_78.id,       // Assigned to elCubo
  GROUPS.GRUPO_72.id,       // Assigned to parqueDeLasLuces
  GROUPS.GRUPO_CUBO.id,     // Assigned to la78
];


// --- Expense Constants ---
export const EXPENSE_CATEGORIES = [
    { id: 'reparacion', name: 'Reparación y Mantenimiento' },
    { id: 'repuestos', name: 'Repuestos' },
    { id: 'combustible', name: 'Combustible' },
    { id: 'accesorios', name: 'Accesorios (cascos, etc.)' },
    { id: 'limpieza', name: 'Limpieza' },
    { id: 'administrativo', name: 'Gastos Administrativos' },
    { id: 'marketing', name: 'Marketing y Publicidad' },
    { id: 'otros', name: 'Otros' },
];
