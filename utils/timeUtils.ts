/**
 * Utility for handling time, dates, business schedules, and event validity
 * specifically for Ecuador (America/Guayaquil, UTC-5).
 */

import type { MontanitaEvent } from '../types.ts';

/** Default duration for events when endAt is omitted or invalid (3 hours in milliseconds) */
export const DEFAULT_EVENT_DURATION_MS = 3 * 60 * 60 * 1000;

export interface EcuadorDateParts {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
  hour: number;  // 0-23
  minute: number;// 0-59
  second: number;// 0-59
}

/**
 * Returns exact date parts for Ecuador (America/Guayaquil, UTC-5) using
 * Intl.DateTimeFormat.formatToParts without depending on server/browser local timezone.
 */
export const getEcuadorDateParts = (baseDate: Date = new Date()): EcuadorDateParts => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });

  const parts = formatter.formatToParts(baseDate);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') {
      map[p.type] = p.value;
    }
  }

  const year = parseInt(map.year, 10) || baseDate.getUTCFullYear();
  const month = parseInt(map.month, 10) || (baseDate.getUTCMonth() + 1);
  const day = parseInt(map.day, 10) || baseDate.getUTCDate();
  let hour = parseInt(map.hour, 10) || 0;
  if (hour === 24) hour = 0;
  const minute = parseInt(map.minute, 10) || 0;
  const second = parseInt(map.second, 10) || 0;

  return { year, month, day, hour, minute, second };
};

/**
 * Returns a Date object whose wall-clock values match the current Ecuador time.
 */
export const getEcuadorDate = (baseDate: Date = new Date()): Date => {
  const parts = getEcuadorDateParts(baseDate);
  return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
};

export const formatEcuadorTime = (date: Date): string => {
  return new Intl.DateTimeFormat("es-EC", {
    timeZone: "America/Guayaquil",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
};

export const DAY_TRANSLATIONS: Record<string, string> = {
  'monday': 'lunes', 'tuesday': 'martes', 'wednesday': 'miercoles', 'thursday': 'jueves', 'friday': 'viernes', 'saturday': 'sabado', 'sunday': 'domingo',
  'mon': 'lunes', 'tue': 'martes', 'wed': 'miercoles', 'thu': 'jueves', 'fri': 'viernes', 'sat': 'sabado', 'sun': 'domingo',
  '0': 'domingo', '1': 'lunes', '2': 'martes', '3': 'miercoles', '4': 'jueves', '5': 'viernes', '6': 'sabado', '7': 'domingo',
  'miercoles': 'miercoles', 'sabado': 'sabado', 'miércoles': 'miercoles', 'sábado': 'sabado'
};

export const DAYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
export const DAYS_DISPLAY = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const normalizeDay = (day: string | number | undefined | null): string => {
  if (day === undefined || day === null) return '';
  const d = String(day).toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  return DAY_TRANSLATIONS[d] || d;
};

export const getEcuadorDayKey = (date: Date = new Date()): string => {
  const parts = getEcuadorDateParts(date);
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));
  return DAYS[d.getUTCDay()];
};

export const getEcuadorDayNameES = (date: Date = new Date()): string => {
  const parts = getEcuadorDateParts(date);
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));
  return DAYS_DISPLAY[d.getUTCDay()];
};

/**
 * Safely parses any date/timestamp format into an absolute UTC epoch timestamp in milliseconds.
 * Supports JavaScript Date, numeric timestamps, ISO/date strings, and Firestore Timestamp objects (with .toDate() or .seconds).
 * Returns null if the value is missing, empty, or cannot be parsed into a valid timestamp.
 */
export const parseToTimestamp = (val: unknown): number | null => {
  if (val === null || val === undefined || val === '') return null;

  if (typeof val === 'number') {
    return !isNaN(val) && val > 0 ? val : null;
  }

  if (val instanceof Date) {
    const t = val.getTime();
    return !isNaN(t) ? t : null;
  }

  if (typeof val === 'object' && val !== null) {
    if (typeof (val as any).toDate === 'function') {
      try {
        const d = (val as any).toDate();
        if (d instanceof Date && !isNaN(d.getTime())) {
          return d.getTime();
        }
      } catch {
        // Fallback
      }
    }
    if (typeof (val as any).toMillis === 'function') {
      try {
        const ms = (val as any).toMillis();
        if (typeof ms === 'number' && !isNaN(ms) && ms > 0) {
          return ms;
        }
      } catch {
        // Fallback
      }
    }
    if (typeof (val as any).seconds === 'number' && !isNaN((val as any).seconds)) {
      const ms = (val as any).seconds * 1000 + Math.floor(((val as any).nanoseconds || 0) / 1e6);
      return ms > 0 ? ms : null;
    }
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === 'undefined' || trimmed === 'null' || trimmed === 'NaN') {
      return null;
    }
    if (/^\d{10,14}$/.test(trimmed)) {
      const num = Number(trimmed);
      if (!isNaN(num) && num > 0) return num;
    }
    const parsed = Date.parse(trimmed);
    return !isNaN(parsed) ? parsed : null;
  }

  return null;
};

export interface BusinessOpenStatus {
  isOpen: boolean;
  hasValidSchedule: boolean;
  message: string;
  color: 'emerald' | 'amber' | 'rose' | 'slate';
}

/**
 * Checks if a business is currently open based on its openingHours object.
 * Returns an object with isOpen boolean, validity flag, formatted message, and color.
 * If there is no valid schedule for today (and not open from overnight schedule), returns "Horario no disponible".
 */
export const isBusinessOpen = (openingHours: any): BusinessOpenStatus => {
  if (!openingHours || typeof openingHours !== 'object' || Object.keys(openingHours).length === 0) {
    return { isOpen: false, hasValidSchedule: false, message: 'Horario no disponible', color: 'slate' };
  }

  const parts = getEcuadorDateParts();
  const dUtc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));
  const currentDayIndex = dUtc.getUTCDay();
  const currentTimeMinutes = parts.hour * 60 + parts.minute;

  const normalizedHours: Record<string, any> = {};
  Object.keys(openingHours).forEach(key => {
    const normKey = normalizeDay(key);
    if (openingHours[key] && typeof openingHours[key] === 'object') {
      normalizedHours[normKey] = openingHours[key];
    }
  });

  const getMinutes = (timeStr: unknown): number => {
    if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return -1;
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return -1;
    return h * 60 + m;
  };

  const todayKey = DAYS[currentDayIndex];
  const todaySchedule = normalizedHours[todayKey];

  const yesterdayIndex = (currentDayIndex + 6) % 7;
  const yesterdayKey = DAYS[yesterdayIndex];
  const yesterdaySchedule = normalizedHours[yesterdayKey];

  // 1. Check if currently open from yesterday's schedule crossing midnight
  if (yesterdaySchedule && !yesterdaySchedule.closed && yesterdaySchedule.closed !== 'true') {
    const yOpen = getMinutes(yesterdaySchedule.open);
    const yClose = getMinutes(yesterdaySchedule.close);
    if (yOpen !== -1 && yClose !== -1 && yClose <= yOpen) {
      if (currentTimeMinutes < yClose) {
        return {
          isOpen: true,
          hasValidSchedule: true,
          message: `Abierto hasta las ${yesterdaySchedule.close}`,
          color: 'emerald'
        };
      }
    }
  }

  // 2. Check today's schedule
  if (todaySchedule) {
    const isExplicitlyClosed = todaySchedule.closed === true || todaySchedule.closed === 'true';
    if (isExplicitlyClosed) {
      return {
        isOpen: false,
        hasValidSchedule: true,
        message: 'Cerrado hoy',
        color: 'rose'
      };
    }

    const tOpen = getMinutes(todaySchedule.open);
    const tClose = getMinutes(todaySchedule.close);

    if (tOpen !== -1 && tClose !== -1) {
      if (tClose <= tOpen) {
        if (currentTimeMinutes >= tOpen || currentTimeMinutes < tClose) {
          return {
            isOpen: true,
            hasValidSchedule: true,
            message: `Abierto hasta las ${todaySchedule.close}`,
            color: 'emerald'
          };
        }
      } else {
        if (currentTimeMinutes >= tOpen && currentTimeMinutes < tClose) {
          return {
            isOpen: true,
            hasValidSchedule: true,
            message: `Abierto hasta las ${todaySchedule.close}`,
            color: 'emerald'
          };
        }
      }

      if (tOpen > currentTimeMinutes) {
        return {
          isOpen: false,
          hasValidSchedule: true,
          message: `Cerrado - Abre hoy a las ${todaySchedule.open}`,
          color: 'amber'
        };
      }

      for (let i = 1; i <= 7; i++) {
        const nextIdx = (currentDayIndex + i) % 7;
        const nextKey = DAYS[nextIdx];
        const nextSched = normalizedHours[nextKey];
        if (nextSched && !nextSched.closed && nextSched.closed !== 'true' && nextSched.open) {
          const nextOpen = getMinutes(nextSched.open);
          if (nextOpen !== -1) {
            const dayName = DAYS_DISPLAY[nextIdx];
            return {
              isOpen: false,
              hasValidSchedule: true,
              message: i === 1 ? `Cerrado - Abre mañana a las ${nextSched.open}` : `Cerrado - Abre el ${dayName} a las ${nextSched.open}`,
              color: 'rose'
            };
          }
        }
      }

      return {
        isOpen: false,
        hasValidSchedule: true,
        message: 'Cerrado',
        color: 'rose'
      };
    }
  }

  // 3. Incomplete or missing schedule for today -> Horario no disponible
  return {
    isOpen: false,
    hasValidSchedule: false,
    message: 'Horario no disponible',
    color: 'slate'
  };
};

export interface EcuadorEventDateInfo {
  dateStr: string;
  timeStr: string;
  fullStr: string;
  dateFormatted: string;
  timeFormatted: string;
  fullFormatted: string;
  isExpired: boolean;
  isToday: boolean;
  isOngoing: boolean;
  isValid: boolean;
  statusLabel: string;
  statusColor: 'emerald' | 'rose' | 'amber' | 'blue' | 'slate';
}

/**
 * Robustly formats event dates in Ecuador timezone (America/Guayaquil, UTC-5)
 * and computes real status using absolute universal timestamps.
 */
export const formatEcuadorEventDate = (
  dateVal: unknown,
  endDateVal?: unknown,
  explicitStatus?: string
): EcuadorEventDateInfo => {
  const startMs = parseToTimestamp(dateVal);
  const endMsParsed = parseToTimestamp(endDateVal);

  if (startMs === null) {
    const isCancelled = explicitStatus === 'cancelled' || explicitStatus === 'cancelado';
    return {
      dateStr: 'Fecha por confirmar',
      timeStr: 'Hora por confirmar',
      fullStr: 'Fecha y hora por confirmar',
      dateFormatted: 'Fecha por confirmar',
      timeFormatted: 'Hora por confirmar',
      fullFormatted: 'Fecha y hora por confirmar',
      isExpired: false,
      isToday: false,
      isOngoing: false,
      isValid: false,
      statusLabel: isCancelled ? 'Cancelado' : 'Fecha no válida',
      statusColor: isCancelled ? 'rose' : 'slate'
    };
  }

  const endMs = endMsParsed !== null ? endMsParsed : startMs + DEFAULT_EVENT_DURATION_MS;
  const nowMs = Date.now();

  const isExpired = nowMs > endMs;
  const isOngoing = nowMs >= startMs && nowMs <= endMs;

  const startParts = getEcuadorDateParts(new Date(startMs));
  const nowParts = getEcuadorDateParts(new Date(nowMs));

  const isToday = startParts.year === nowParts.year &&
                  startParts.month === nowParts.month &&
                  startParts.day === nowParts.day;

  const dateStr = new Intl.DateTimeFormat('es-EC', {
    timeZone: 'America/Guayaquil',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(startMs));

  const timeStr = new Intl.DateTimeFormat('es-EC', {
    timeZone: 'America/Guayaquil',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(startMs));

  let fullStr = `${dateStr} a las ${timeStr}`;
  if (endMsParsed !== null) {
    const endTimeStr = new Intl.DateTimeFormat('es-EC', {
      timeZone: 'America/Guayaquil',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date(endMsParsed));
    fullStr += ` - ${endTimeStr}`;
  }

  let statusLabel = 'Confirmado';
  let statusColor: 'emerald' | 'rose' | 'amber' | 'blue' | 'slate' = 'blue';

  const lowerStatus = (explicitStatus || '').toLowerCase();
  if (lowerStatus === 'cancelled' || lowerStatus === 'cancelado' || lowerStatus === 'deactivated') {
    statusLabel = 'Cancelado';
    statusColor = 'rose';
  } else if (isOngoing) {
    statusLabel = 'En Vivo Ahora';
    statusColor = 'emerald';
  } else if (isExpired) {
    statusLabel = 'Finalizado';
    statusColor = 'slate';
  } else if (isToday) {
    statusLabel = 'Hoy';
    statusColor = 'amber';
  }

  return {
    dateStr,
    timeStr,
    fullStr,
    dateFormatted: dateStr,
    timeFormatted: timeStr,
    fullFormatted: fullStr,
    isExpired,
    isToday,
    isOngoing,
    isValid: true,
    statusLabel,
    statusColor
  };
};

/**
 * Single centralized policy to decide if an event is publicly active and valid.
 * An event is public and active if:
 * 1. It has an id, non-empty title, and a valid start date.
 * 2. It is not cancelled, deactivated, in draft, or explicitly unconfirmed.
 * 3. It is not expired (using universal timestamp comparison).
 */
export const isEventPublicAndActive = (event?: MontanitaEvent | null, nowMs: number = Date.now()): boolean => {
  if (!event || !event.id || !event.title || typeof event.title !== 'string' || event.title.trim() === '') {
    return false;
  }

  const startMs = parseToTimestamp(event.startAt);
  if (startMs === null) return false;

  const VALID_EXPLICIT_STATUSES = ['published', 'confirmed', 'active'];
  const INVALID_STATUSES = ['draft', 'cancelled', 'cancelado', 'expired', 'deactivated', 'readonly', 'pending', 'archived', 'rejected'];

  const rawStatus = (event.status || '').toString().trim().toLowerCase();
  
  if (rawStatus) {
    if (INVALID_STATUSES.includes(rawStatus) || !VALID_EXPLICIT_STATUSES.includes(rawStatus)) {
      return false;
    }
  } else {
    // If status field is omitted in legacy documents, check legacy flags
    if ((event as any).isPublished === false || (event as any).published === false) {
      return false;
    }
  }

  const endMs = parseToTimestamp(event.endAt) ?? (startMs + DEFAULT_EVENT_DURATION_MS);
  if (nowMs > endMs) {
    return false;
  }

  return true;
};

export interface EventPriceInfo {
  isFree: boolean;
  hasPrice: boolean;
  price: number | null;
  currency: string;
  displayLabel: string | null;
}

/**
 * Unified event price resolution rule:
 * - isFree === true or price === 0 -> "Gratuito"
 * - price > 0 -> "$X USD"
 * - no price / undefined -> displayLabel is null (never falsely claim it is free)
 */
export const formatEventPrice = (event?: Partial<MontanitaEvent> | null): EventPriceInfo => {
  if (!event) {
    return { isFree: false, hasPrice: false, price: null, currency: 'USD', displayLabel: null };
  }

  const currency = event.currency || 'USD';
  const isExplicitlyFree = event.isFree === true || event.price === 0 || (event as any).price === '0';
  if (isExplicitlyFree) {
    return { isFree: true, hasPrice: false, price: 0, currency, displayLabel: 'Gratuito' };
  }

  const numPrice = typeof event.price === 'number' ? event.price : (event.price ? Number(event.price) : NaN);
  if (!isNaN(numPrice) && numPrice > 0) {
    return {
      isFree: false,
      hasPrice: true,
      price: numPrice,
      currency,
      displayLabel: `$${numPrice} ${currency}`
    };
  }

  return {
    isFree: false,
    hasPrice: false,
    price: null,
    currency,
    displayLabel: null
  };
};

export const getDefaultOpeningHours = (): Record<string, any> => {
  const hours: any = {};
  ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].forEach(day => {
    hours[day] = { closed: true, open: '08:00', close: '22:00' };
  });
  return hours;
};
