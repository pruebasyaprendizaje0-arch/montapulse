import { ResourceItem, BusinessReservation, BlockedDateRange, ShiftSlot, BusinessServiceItem } from '../types';

const STORAGE_KEY_RESOURCES = 'montapulse_business_resources';
const STORAGE_KEY_RESERVATIONS = 'montapulse_business_reservations';
const STORAGE_KEY_BLOCKED = 'montapulse_business_blocked_dates';
const STORAGE_KEY_SHIFTS = 'montapulse_business_shifts';
const STORAGE_KEY_SERVICES = 'montapulse_business_services';

// Default initial resources tailored like Image 1 "Hostel / Hotel Control Center"
const DEFAULT_RESOURCES: Record<string, ResourceItem[]> = {
  default: [
    {
      id: 'res-1',
      businessId: 'default',
      name: 'Cabaña Familiar',
      type: 'room',
      price: 85,
      pricePeriod: 'noche',
      capacity: 4,
      status: 'available',
      features: ['WiFi', 'Cocina', 'Baño privado', 'Escritorio'],
      isAvailable: true,
      description: 'Hermosa cabaña familiar con vista a los jardines y aire acondicionado.',
      imageUrl: 'https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=600&q=80',
      nextBookingNote: 'Próxima reserva: 20-22 Ago • #RES1028'
    },
    {
      id: 'res-2',
      businessId: 'default',
      name: 'Habitación Privada',
      type: 'room',
      price: 45,
      pricePeriod: 'noche',
      capacity: 2,
      status: 'available',
      features: ['WiFi', 'Baño privado', 'Aire acondicionado'],
      isAvailable: true,
      description: 'Habitación privada matrimonial perfecta para parejas.',
      imageUrl: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=600&q=80',
      nextBookingNote: 'Sin reservas próximas'
    },
    {
      id: 'res-3',
      businessId: 'default',
      name: 'Cama Compartida',
      type: 'room',
      price: 18,
      pricePeriod: 'noche',
      capacity: 6,
      status: 'disabled',
      features: ['WiFi', 'Locker', 'Cocina compartida'],
      isAvailable: false,
      description: 'Cama individual en dormitorio compartido de 6 camas con casillero.',
      imageUrl: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80',
      nextBookingNote: 'Mantenimiento programado: 19-21 Ago'
    }
  ]
};

// Default initial services matching Image 2 "Turno Control Center"
const DEFAULT_SERVICES: BusinessServiceItem[] = [
  { id: 'srv-1', businessId: 'default', name: 'Corte', durationMin: 30, price: 5, icon: 'scissors' },
  { id: 'srv-2', businessId: 'default', name: 'Barba', durationMin: 20, price: 3, icon: 'razor' },
  { id: 'srv-3', businessId: 'default', name: 'Combo', durationMin: 45, price: 7, icon: 'combo' },
  { id: 'srv-4', businessId: 'default', name: 'Clase de Surf', durationMin: 60, price: 25, icon: 'surf' }
];

// Default initial turnos matching Image 2 "Agenda - Jueves 23 Octubre 2026"
const DEFAULT_SHIFTS: ShiftSlot[] = [
  { id: 'sh-1', businessId: 'default', time: '09:00', serviceName: 'Corte', customerName: 'Juan', staffName: 'Barbero: Diego', stationName: 'Silla 2', durationMin: 30, price: 5, status: 'confirmed', dateStr: '2026-10-23' },
  { id: 'sh-2', businessId: 'default', time: '09:30', serviceName: 'Barba', customerName: 'Carlos', staffName: 'Barbero: Diego', stationName: 'Silla 1 • Peluquería', durationMin: 20, price: 3, status: 'in_progress', dateStr: '2026-10-23' },
  { id: 'sh-3', businessId: 'default', time: '10:30', serviceName: 'Combo', customerName: 'Ana', staffName: 'Barbero: Camila', stationName: 'Silla 3', durationMin: 45, price: 7, status: 'completed', dateStr: '2026-10-23' },
  { id: 'sh-4', businessId: 'default', time: '13:00', serviceName: 'Corte', customerName: 'Lucía', staffName: 'Barbero: Diego', stationName: 'Silla 2', durationMin: 30, price: 5, status: 'confirmed', dateStr: '2026-10-23' },
  { id: 'sh-5', businessId: 'default', time: '15:00', serviceName: 'Barba', customerName: 'Pedro', staffName: 'Barbero: Camila', stationName: 'Silla 1', durationMin: 20, price: 3, status: 'confirmed', dateStr: '2026-10-23' },
  { id: 'sh-6', businessId: 'default', time: '16:00', serviceName: 'Combo', customerName: 'Miguel', staffName: 'Barbero: Camila', stationName: 'Silla 3', durationMin: 45, price: 7, status: 'in_progress', dateStr: '2026-10-23' },
  { id: 'sh-7', businessId: 'default', time: '17:00', serviceName: 'Corte', customerName: 'Elena', staffName: 'Barbero: Camila', stationName: 'Silla 1', durationMin: 30, price: 5, status: 'completed', dateStr: '2026-10-23' }
];

const DEFAULT_RESERVATIONS: BusinessReservation[] = [
  {
    id: 'resv-9982',
    reservationCode: 'RES9982',
    businessId: 'default',
    resourceId: 'res-2',
    resourceName: 'Habitación Privada',
    customerName: 'Frank Hernández',
    customerPhone: '+593 99 491 6012',
    customerEmail: 'frank@example.com',
    startDate: '2026-11-01',
    endDate: '2026-11-03',
    guestsCount: 2,
    totalPrice: 90,
    status: 'confirmed',
    paymentStatus: 'pending',
    notes: 'pronto',
    createdAt: Date.now() - 3600000 * 2
  },
  {
    id: 'resv-8417',
    reservationCode: 'RES8417',
    businessId: 'default',
    resourceId: 'res-1',
    resourceName: 'Cabaña Familiar',
    customerName: 'Frank Hernández',
    customerPhone: '+593 99 491 6012',
    customerEmail: 'frank@example.com',
    startDate: '2026-11-01',
    endDate: '2026-11-06',
    guestsCount: 2,
    totalPrice: 425,
    status: 'confirmed',
    paymentStatus: 'pending',
    notes: 'pronto,,,,',
    createdAt: Date.now() - 1800000
  },
  {
    id: 'resv-1028',
    reservationCode: 'RES1028',
    businessId: 'default',
    resourceId: 'res-1',
    resourceName: 'Cabaña Familiar',
    customerName: 'Carlos Mendoza',
    customerPhone: '+593 99 876 5432',
    customerEmail: 'carlos.m@example.com',
    startDate: '2026-08-20',
    endDate: '2026-08-22',
    guestsCount: 4,
    totalPrice: 170,
    status: 'confirmed',
    paymentStatus: 'paid',
    notes: 'Requiere cuna adicional.',
    createdAt: Date.now() - 86400000 * 2
  },
  {
    id: 'resv-1029',
    reservationCode: 'RES1029',
    businessId: 'default',
    resourceId: 'res-2',
    resourceName: 'Habitación Privada',
    customerName: 'Lucía Fernández',
    customerPhone: '+593 98 123 4567',
    customerEmail: 'lucia.f@example.com',
    startDate: '2026-08-19',
    endDate: '2026-08-21',
    guestsCount: 2,
    totalPrice: 90,
    status: 'checked_in',
    paymentStatus: 'paid',
    notes: 'Llegada tarde confirmada por WhatsApp.',
    createdAt: Date.now() - 86400000 * 4
  },
  {
    id: 'resv-5140',
    reservationCode: 'RES5140',
    businessId: 'default',
    resourceId: 'res-2',
    resourceName: 'Habitación Privada',
    customerName: 'Frank Hernández',
    customerPhone: '+593 99 491 6012',
    customerEmail: 'frank@example.com',
    startDate: '2026-11-10',
    endDate: '2026-11-12',
    guestsCount: 2,
    totalPrice: 90,
    status: 'confirmed',
    paymentStatus: 'pending',
    notes: 'Solicitada desde módulo web',
    createdAt: Date.now() - 1200000
  },
  {
    id: 'resv-7365',
    reservationCode: 'RES7365',
    businessId: 'default',
    resourceId: 'res-1',
    resourceName: 'Cabaña Familiar',
    customerName: 'Frank Hernández',
    customerPhone: '+593 99 491 6012',
    customerEmail: 'frank@example.com',
    startDate: '2026-12-01',
    endDate: '2026-12-05',
    guestsCount: 3,
    totalPrice: 340,
    status: 'pending',
    paymentStatus: 'pending',
    notes: '⚠️ Conflicto de fechas: Cabaña solicitada en temporada alta',
    createdAt: Date.now() - 600000
  }
];

const DEFAULT_BLOCKED_DATES: BlockedDateRange[] = [
  { id: 'b-1', resourceId: 'res-1', resourceName: 'Cabaña Familiar', startDate: '2026-08-20', endDate: '2026-08-22', reason: 'reservado', code: '#RES1028' },
  { id: 'b-2', resourceId: 'res-3', resourceName: 'Cama Compartida', startDate: '2026-08-19', endDate: '2026-08-21', reason: 'mantenimiento', code: 'Mantenimiento' }
];

// Helper to load items
export const getBusinessResources = (businessId: string): ResourceItem[] => {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_RESOURCES}_${businessId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading business resources', e);
  }
  return DEFAULT_RESOURCES.default.map(r => ({ ...r, businessId }));
};

export const saveBusinessResource = (resource: ResourceItem): ResourceItem[] => {
  const current = getBusinessResources(resource.businessId);
  const existsIdx = current.findIndex(r => r.id === resource.id);
  let updated: ResourceItem[];
  if (existsIdx >= 0) {
    updated = [...current];
    updated[existsIdx] = resource;
  } else {
    updated = [resource, ...current];
  }
  localStorage.setItem(`${STORAGE_KEY_RESOURCES}_${resource.businessId}`, JSON.stringify(updated));
  return updated;
};

export const toggleResourceAvailability = (businessId: string, resourceId: string): ResourceItem[] => {
  const current = getBusinessResources(businessId);
  const updated = current.map(r => {
    if (r.id === resourceId) {
      const nextAvailable = !r.isAvailable;
      return {
        ...r,
        isAvailable: nextAvailable,
        status: nextAvailable ? ('available' as const) : ('disabled' as const)
      };
    }
    return r;
  });
  localStorage.setItem(`${STORAGE_KEY_RESOURCES}_${businessId}`, JSON.stringify(updated));
  return updated;
};

export const deleteBusinessResource = (businessId: string, resourceId: string): ResourceItem[] => {
  const current = getBusinessResources(businessId);
  const updated = current.filter(r => r.id !== resourceId);
  localStorage.setItem(`${STORAGE_KEY_RESOURCES}_${businessId}`, JSON.stringify(updated));
  return updated;
};

const GLOBAL_SHIFTS_KEY = 'montapulse_business_shifts_global_v3';

// Turnos / Agenda Service
export const getBusinessShifts = (businessId?: string): ShiftSlot[] => {
  try {
    const raw = localStorage.getItem(GLOBAL_SHIFTS_KEY);
    if (raw) {
      const all: ShiftSlot[] = JSON.parse(raw);
      if (all && all.length > 0) return all;
    }

    let merged: ShiftSlot[] = [...DEFAULT_SHIFTS];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_SHIFTS)) {
        try {
          const itemRaw = localStorage.getItem(key);
          if (itemRaw) {
            const parsed = JSON.parse(itemRaw);
            if (Array.isArray(parsed)) {
              parsed.forEach((item: ShiftSlot) => {
                if (item && item.id && !merged.some(m => m.id === item.id)) {
                  merged.unshift(item);
                }
              });
            }
          }
        } catch (e) {}
      }
    }
    localStorage.setItem(GLOBAL_SHIFTS_KEY, JSON.stringify(merged));
    return merged;
  } catch (e) {
    console.error('Error loading shifts', e);
  }
  return DEFAULT_SHIFTS.map(s => ({ ...s, businessId: businessId || 'default' }));
};

export const saveBusinessShift = (shift: ShiftSlot): ShiftSlot[] => {
  const current = getBusinessShifts(shift.businessId);
  const existsIdx = current.findIndex(s => s.id === shift.id);
  let updated: ShiftSlot[];
  if (existsIdx >= 0) {
    updated = [...current];
    updated[existsIdx] = shift;
  } else {
    updated = [shift, ...current];
  }
  localStorage.setItem(GLOBAL_SHIFTS_KEY, JSON.stringify(updated));
  localStorage.setItem(`${STORAGE_KEY_SHIFTS}_default`, JSON.stringify(updated));
  if (shift.businessId) {
    localStorage.setItem(`${STORAGE_KEY_SHIFTS}_${shift.businessId}`, JSON.stringify(updated));
  }
  return updated;
};

export const updateShiftStatus = (businessId: string, shiftId: string, status: ShiftSlot['status']): ShiftSlot[] => {
  const current = getBusinessShifts(businessId);
  const updated = current.map(s => s.id === shiftId ? { ...s, status } : s);
  localStorage.setItem(GLOBAL_SHIFTS_KEY, JSON.stringify(updated));
  localStorage.setItem(`${STORAGE_KEY_SHIFTS}_default`, JSON.stringify(updated));
  if (businessId) {
    localStorage.setItem(`${STORAGE_KEY_SHIFTS}_${businessId}`, JSON.stringify(updated));
  }
  return updated;
};

export const deleteBusinessShift = (businessId: string, shiftId: string): ShiftSlot[] => {
  const current = getBusinessShifts(businessId);
  const updated = current.filter(s => s.id !== shiftId);
  localStorage.setItem(GLOBAL_SHIFTS_KEY, JSON.stringify(updated));
  localStorage.setItem(`${STORAGE_KEY_SHIFTS}_default`, JSON.stringify(updated));
  if (businessId) {
    localStorage.setItem(`${STORAGE_KEY_SHIFTS}_${businessId}`, JSON.stringify(updated));
  }
  return updated;
};

export const getBusinessServices = (businessId: string): BusinessServiceItem[] => {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_SERVICES}_${businessId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading services', e);
  }
  return DEFAULT_SERVICES.map(s => ({ ...s, businessId }));
};

export const saveBusinessService = (service: BusinessServiceItem): BusinessServiceItem[] => {
  const current = getBusinessServices(service.businessId);
  const existsIdx = current.findIndex(s => s.id === service.id);
  let updated: BusinessServiceItem[];
  if (existsIdx >= 0) {
    updated = [...current];
    updated[existsIdx] = service;
  } else {
    updated = [service, ...current];
  }
  localStorage.setItem(`${STORAGE_KEY_SERVICES}_${service.businessId}`, JSON.stringify(updated));
  return updated;
};

export const deleteBusinessService = (businessId: string, serviceId: string): BusinessServiceItem[] => {
  const current = getBusinessServices(businessId);
  const updated = current.filter(s => s.id !== serviceId);
  localStorage.setItem(`${STORAGE_KEY_SERVICES}_${businessId}`, JSON.stringify(updated));
  return updated;
};

const GLOBAL_RESERVATIONS_KEY = 'montapulse_business_reservations_global_v3';

// Reservations
export const getBusinessReservations = (businessId?: string): BusinessReservation[] => {
  let all: BusinessReservation[] = [...DEFAULT_RESERVATIONS];

  try {
    const raw = localStorage.getItem(GLOBAL_RESERVATIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        all = parsed;
        // Ensure default items exist
        DEFAULT_RESERVATIONS.forEach(def => {
          if (!all.some(m => m.id === def.id)) {
            all.push(def);
          }
        });
      }
    }

    let changed = false;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(STORAGE_KEY_RESERVATIONS) || key.includes('reservation'))) {
        try {
          const itemRaw = localStorage.getItem(key);
          if (itemRaw) {
            const parsed = JSON.parse(itemRaw);
            if (Array.isArray(parsed)) {
              parsed.forEach((item: BusinessReservation) => {
                if (item && item.id && !all.some(m => m.id === item.id)) {
                  all.unshift(item);
                  changed = true;
                }
              });
            }
          }
        } catch (e) {}
      }
    }

    if (changed || !raw) {
      localStorage.setItem(GLOBAL_RESERVATIONS_KEY, JSON.stringify(all));
    }
  } catch (e) {
    console.error('Error loading reservations', e);
  }

  return all;
};

export const saveBusinessReservation = (reservation: BusinessReservation): BusinessReservation[] => {
  const current = getBusinessReservations(reservation.businessId);
  const existsIdx = current.findIndex(r => r.id === reservation.id);
  let updated: BusinessReservation[];
  if (existsIdx >= 0) {
    updated = [...current];
    updated[existsIdx] = reservation;
  } else {
    updated = [reservation, ...current];
  }
  localStorage.setItem(GLOBAL_RESERVATIONS_KEY, JSON.stringify(updated));
  localStorage.setItem(`${STORAGE_KEY_RESERVATIONS}_default`, JSON.stringify(updated));
  if (reservation.businessId) {
    localStorage.setItem(`${STORAGE_KEY_RESERVATIONS}_${reservation.businessId}`, JSON.stringify(updated));
  }
  return updated;
};

export const updateReservationStatus = (businessId: string, reservationId: string, status: BusinessReservation['status']): BusinessReservation[] => {
  const current = getBusinessReservations(businessId);
  const updated = current.map(r => r.id === reservationId ? { ...r, status } : r);
  localStorage.setItem(GLOBAL_RESERVATIONS_KEY, JSON.stringify(updated));
  localStorage.setItem(`${STORAGE_KEY_RESERVATIONS}_default`, JSON.stringify(updated));
  if (businessId) {
    localStorage.setItem(`${STORAGE_KEY_RESERVATIONS}_${businessId}`, JSON.stringify(updated));
  }
  return updated;
};

export const deleteBusinessReservation = (businessId: string, reservationId: string): BusinessReservation[] => {
  const current = getBusinessReservations(businessId);
  const updated = current.filter(r => r.id !== reservationId);
  localStorage.setItem(GLOBAL_RESERVATIONS_KEY, JSON.stringify(updated));
  localStorage.setItem(`${STORAGE_KEY_RESERVATIONS}_default`, JSON.stringify(updated));
  if (businessId) {
    localStorage.setItem(`${STORAGE_KEY_RESERVATIONS}_${businessId}`, JSON.stringify(updated));
  }
  return updated;
};

export const getBlockedDates = (businessId: string): BlockedDateRange[] => {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_BLOCKED}_${businessId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading blocked dates', e);
  }
  return DEFAULT_BLOCKED_DATES;
};

export const saveBlockedDateRange = (businessId: string, range: BlockedDateRange): BlockedDateRange[] => {
  const current = getBlockedDates(businessId);
  const updated = [range, ...current.filter(b => b.id !== range.id)];
  localStorage.setItem(`${STORAGE_KEY_BLOCKED}_${businessId}`, JSON.stringify(updated));
  return updated;
};

export const deleteBlockedDateRange = (businessId: string, rangeId: string): BlockedDateRange[] => {
  const current = getBlockedDates(businessId);
  const updated = current.filter(b => b.id !== rangeId);
  localStorage.setItem(`${STORAGE_KEY_BLOCKED}_${businessId}`, JSON.stringify(updated));
  return updated;
};

// Availability check helpers
export const checkResourceAvailability = (
  resourceId: string,
  startDate: string,
  endDate: string,
  businessId: string,
  excludeReservationId?: string
): { isAvailable: boolean; reason?: string } => {
  if (!startDate || !endDate || !resourceId) return { isAvailable: true };

  // 1. Check existing confirmed or active reservations
  const resvs = getBusinessReservations(businessId);
  const resource = getBusinessResources(businessId).find(res => res.id === resourceId);
  
  const conflictingResv = resvs.find(r => {
    if (excludeReservationId && r.id === excludeReservationId) return false;
    if (r.status === 'cancelled') return false;

    const matchesResource = r.resourceId === resourceId || (resource && r.resourceName === resource.name);
    if (!matchesResource) return false;

    // Overlap check: startDate < r.endDate && endDate > r.startDate
    const overlap = startDate < r.endDate && endDate > r.startDate;
    return overlap;
  });

  if (conflictingResv) {
    return {
      isAvailable: false,
      reason: `La unidad ya se encuentra reservada por ${conflictingResv.customerName} del ${conflictingResv.startDate} al ${conflictingResv.endDate} (#${conflictingResv.reservationCode}).`
    };
  }

  // 2. Check blocked date ranges
  const blocked = getBlockedDates(businessId);
  const conflictingBlock = blocked.find(b => {
    const matchesResource = b.resourceId === resourceId || (resource && b.resourceName === resource.name) || b.resourceId === 'all' || b.resourceName === 'Todas las unidades';
    if (!matchesResource) return false;

    const overlap = startDate < b.endDate && endDate > b.startDate;
    return overlap;
  });

  if (conflictingBlock) {
    return {
      isAvailable: false,
      reason: `La unidad está bloqueada/mantenimiento (${conflictingBlock.code}) del ${conflictingBlock.startDate} al ${conflictingBlock.endDate}.`
    };
  }

  return { isAvailable: true };
};

export const checkShiftAvailability = (
  time: string,
  dateStr: string,
  businessId: string,
  staffName?: string,
  excludeShiftId?: string
): { isAvailable: boolean; reason?: string } => {
  if (!time || !dateStr) return { isAvailable: true };
  const shifts = getBusinessShifts(businessId);
  const conflicting = shifts.find(s => {
    if (excludeShiftId && s.id === excludeShiftId) return false;
    if (s.status === 'completed' || s.status === 'cancelled') return false;
    if (s.dateStr === dateStr && s.time === time) {
      if (!staffName || !s.staffName || s.staffName === staffName) {
        return true;
      }
    }
    return false;
  });

  if (conflicting) {
    return {
      isAvailable: false,
      reason: `El turno de las ${time} en fecha ${dateStr} ya se encuentra agendado para ${conflicting.customerName}.`
    };
  }
  return { isAvailable: true };
};

export const getEffectiveOSModule = (business?: { category?: string; activeOSModule?: 'hospedaje' | 'turnos' }): 'hospedaje' | 'turnos' => {
  if (business?.activeOSModule) {
    return business.activeOSModule;
  }
  const cat = (business?.category || '').toLowerCase();
  const isTurno = cat.includes('barber') ||
                  cat.includes('surf') ||
                  cat.includes('salud') ||
                  cat.includes('spa') ||
                  cat.includes('estética') ||
                  cat.includes('peluquería') ||
                  cat.includes('masaje') ||
                  cat.includes('bar');
  return isTurno ? 'turnos' : 'hospedaje';
};

