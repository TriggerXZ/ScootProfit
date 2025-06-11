
export const LOCATIONS = {
  LA72: { id: 'la72', name: 'La 72' },
  EL_CUBO: { id: 'elCubo', name: 'El Cubo' },
  PARQUE_DE_LAS_LUCES: { id: 'parqueDeLasLuces', name: 'Parque de las Luces' },
  LA78: { id: 'la78', name: 'La 78' },
} as const;

export type LocationId = keyof typeof LOCATIONS extends infer T ? T extends string ? typeof LOCATIONS[T]['id'] : never : never;


export const LOCATION_IDS = Object.values(LOCATIONS).map(loc => loc.id) as LocationId[];

export const NUMBER_OF_MEMBERS = 20;

export const LOCAL_STORAGE_REVENUE_KEY = 'scootProfitEntries';

// Deducciones FIJAS MENSUALES: Contribución POR MIEMBRO a los costos operativos totales del negocio.
// Para obtener el costo total mensual del negocio para cada categoría, multiplicar por NUMBER_OF_MEMBERS.
export const DEDUCTION_ZONA_SEGURA_PER_MEMBER = 20000; // Contribución por miembro al costo de Zona Segura
export const DEDUCTION_ARRIENDO_PER_MEMBER = 299000; // Contribución por miembro al costo de Arriendo
export const DEDUCTION_APORTE_COOPERATIVA_PER_MEMBER = 72000; // Contribución por miembro al Aporte Cooperativa
