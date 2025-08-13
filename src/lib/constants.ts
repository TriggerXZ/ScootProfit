
export const LOCATIONS = {
  LA72: { id: 'la72', name: 'La 72' },
  EL_CUBO: { id: 'elCubo', name: 'El Cubo' },
  PARQUE_DE_LAS_LUCES: { id: 'parqueDeLasLuces', name: 'P. de las Luces' },
  LA78: { id: 'la78', name: 'La 78' },
} as const;

export type LocationId = keyof typeof LOCATIONS extends infer T ? T extends string ? typeof LOCATIONS[T]['id'] : never : never;

export const LOCATION_IDS = Object.values(LOCATIONS).map(loc => loc.id) as LocationId[];

export const DEFAULT_NUMBER_OF_MEMBERS = 20;
export const DEFAULT_MONTHLY_GOAL = 120000000; // Default goal of 120 million COP
export const WEEKLY_GOAL = 25000000; // Weekly goal of 25 million COP

export const LOCAL_STORAGE_REVENUE_KEY = 'scootProfitEntries';
export const LOCAL_STORAGE_SETTINGS_KEY = 'scootProfitSettings';

// Deducciones FIJAS MENSUALES: Contribución POR MIEMBRO a los costos operativos totales del negocio.
// Para obtener el costo total mensual del negocio para cada categoría, multiplicar por NUMBER_OF_MEMBERS.
export const DEDUCTION_ZONA_SEGURA_PER_MEMBER = 20000; // Contribución por miembro al costo de Zona Segura
export const DEDUCTION_ARRIENDO_PER_MEMBER = 299000; // Contribución por miembro al costo de Arriendo
export const DEDUCTION_APORTE_COOPERATIVA_PER_MEMBER = 72000; // Contribución por miembro al Aporte Cooperativa

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
