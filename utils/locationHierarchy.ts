export interface ParishInfo {
  name: string;
  localities: string[];
}

export interface CantonInfo {
  name: string;
  parishes: Record<string, ParishInfo>;
}

export interface ProvinceInfo {
  name: string;
  cantons: Record<string, CantonInfo>;
}

export const ECUADOR_LOCATION_HIERARCHY: Record<string, ProvinceInfo> = {
  'Santa Elena': {
    name: 'Santa Elena',
    cantons: {
      'Santa Elena': {
        name: 'Santa Elena',
        parishes: {
          'Manglaralto': {
            name: 'Manglaralto',
            localities: ['Montañita', 'Olón', 'Manglaralto', 'Ayangue', 'Curía', 'San Pedro', 'Las Núñez', 'Valdivia', 'San José']
          },
          'Colonche': {
            name: 'Colonche',
            localities: ['Colonche', 'Punta Blanca', 'San Pablo', 'Palmar', 'Monteverde']
          },
          'Chanduy': {
            name: 'Chanduy',
            localities: ['Chanduy', 'Puerto Chanduy', 'Engabao', 'Tugaduaja']
          },
          'Santa Elena (Matriz)': {
            name: 'Santa Elena (Matriz)',
            localities: ['Santa Elena Centro', 'Ballenita']
          },
          'Atahualpa': {
            name: 'Atahualpa',
            localities: ['Atahualpa']
          },
          'Anconcito': {
            name: 'Anconcito',
            localities: ['Anconcito']
          }
        }
      },
      'Salinas': {
        name: 'Salinas',
        parishes: {
          'Salinas (Matriz)': {
            name: 'Salinas (Matriz)',
            localities: ['Salinas', 'Chipipe', 'San Lorenzo', 'Costa de Oro']
          },
          'José Luis Tamayo': {
            name: 'José Luis Tamayo',
            localities: ['Muey', 'Punta Carnero']
          }
        }
      },
      'La Libertad': {
        name: 'La Libertad',
        parishes: {
          'La Libertad': {
            name: 'La Libertad',
            localities: ['La Libertad Centro', 'Barrio Cordero', 'Barrio 28 de Mayo']
          }
        }
      }
    }
  },
  'Manabí': {
    name: 'Manabí',
    cantons: {
      'Puerto López': {
        name: 'Puerto López',
        parishes: {
          'Puerto López': {
            name: 'Puerto López',
            localities: ['Puerto López', 'Agua Blanca']
          },
          'Machalilla': {
            name: 'Machalilla',
            localities: ['Machalilla']
          },
          'Salango': {
            name: 'Salango',
            localities: ['Salango']
          }
        }
      },
      'Manta': {
        name: 'Manta',
        parishes: {
          'Manta': {
            name: 'Manta',
            localities: ['Manta Centro', 'El Murciélago', 'Tarqui', 'San Mateo', 'Santa Marianita']
          }
        }
      },
      'Portoviejo': {
        name: 'Portoviejo',
        parishes: {
          'Crucita': {
            name: 'Crucita',
            localities: ['Crucita']
          },
          'Portoviejo': {
            name: 'Portoviejo',
            localities: ['Portoviejo Centro']
          }
        }
      }
    }
  },
  'Guayas': {
    name: 'Guayas',
    cantons: {
      'Guayaquil': {
        name: 'Guayaquil',
        parishes: {
          'Tarqui': {
            name: 'Tarqui',
            localities: ['Urdesa', 'Puerto Santa Ana', 'Kennedy', 'Ceibos']
          },
          'Guayaquil Centro': {
            name: 'Guayaquil Centro',
            localities: ['Malecón 2000', 'Las Peñas', '9 de Octubre']
          },
          'Samborondón': {
            name: 'Samborondón',
            localities: ['La Puntilla', 'Samborondón Centro']
          }
        }
      },
      'Playas': {
        name: 'Playas',
        parishes: {
          'General Villamil': {
            name: 'General Villamil',
            localities: ['Playas Centro', 'Data de Posorja', 'Engabao']
          }
        }
      }
    }
  },
  'Pichincha': {
    name: 'Pichincha',
    cantons: {
      'Quito': {
        name: 'Quito',
        parishes: {
          'Iñaquito': {
            name: 'Iñaquito',
            localities: ['La Carolina', 'González Suárez', 'La Pradera']
          },
          'Cumbayá': {
            name: 'Cumbayá',
            localities: ['Cumbayá Centro', 'Miravalle']
          },
          'Centro Histórico': {
            name: 'Centro Histórico',
            localities: ['Plaza Grande', 'San Francisco', 'La Ronda']
          }
        }
      }
    }
  },
  'Galápagos': {
    name: 'Galápagos',
    cantons: {
      'Santa Cruz': {
        name: 'Santa Cruz',
        parishes: {
          'Puerto Ayora': {
            name: 'Puerto Ayora',
            localities: ['Puerto Ayora', 'Bellavista']
          }
        }
      },
      'San Cristóbal': {
        name: 'San Cristóbal',
        parishes: {
          'Puerto Baquerizo Moreno': {
            name: 'Puerto Baquerizo Moreno',
            localities: ['Puerto Baquerizo Moreno', 'Progreso']
          }
        }
      }
    }
  }
};

export const getProvinces = (): string[] => Object.keys(ECUADOR_LOCATION_HIERARCHY);

export const getCantons = (provinceName: string): string[] => {
  const prov = ECUADOR_LOCATION_HIERARCHY[provinceName];
  return prov ? Object.keys(prov.cantons) : ['Santa Elena'];
};

export const getParishes = (provinceName: string, cantonName: string): string[] => {
  const prov = ECUADOR_LOCATION_HIERARCHY[provinceName];
  if (!prov) return ['Manglaralto'];
  const canton = prov.cantons[cantonName];
  return canton ? Object.keys(canton.parishes) : ['Manglaralto'];
};

export const getLocalities = (provinceName: string, cantonName: string, parishName: string): string[] => {
  const prov = ECUADOR_LOCATION_HIERARCHY[provinceName];
  if (!prov) return ['Montañita', 'Olón', 'Manglaralto'];
  const canton = prov.cantons[cantonName];
  if (!canton) return ['Montañita', 'Olón', 'Manglaralto'];
  const parish = canton.parishes[parishName];
  return parish ? parish.localities : ['Montañita', 'Olón', 'Manglaralto'];
};
