
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

// Deducciones fijas para el período (costos operativos del negocio)
export const DEDUCTION_ZONA_SEGURA = 20000;
export const DEDUCTION_ARRIENDO = 299000;
export const DEDUCTION_APORTE_COOPERATIVA = 72000;
