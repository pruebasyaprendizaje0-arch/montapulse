
/**
 * Utility for handling time specifically for Ecuador (UTC-5)
 */

export const getEcuadorDate = (): Date => {
  try {
    // Correctly get Ecuador time regardless of local system timezone
    const now = new Date();
    const ecuadorString = now.toLocaleString("en-US", { timeZone: "America/Guayaquil" });
    const ecuadorDate = new Date(ecuadorString);
    
    // In some environments, new Date(string) might return an invalid date if the format is unexpected.
    // As a robust fallback, use the offset-based calculation but ADJUST for system offset.
    if (isNaN(ecuadorDate.getTime())) {
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      return new Date(utc - (5 * 3600000));
    }
    return ecuadorDate;
  } catch (e) {
    console.error("Error calculating Ecuador time:", e);
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc - (5 * 3600000));
  }
};

export const formatEcuadorTime = (date: Date): string => {
  return date.toLocaleTimeString("es-EC", { hour: '2-digit', minute: '2-digit', hour12: false });
};

export const DAY_TRANSLATIONS: Record<string, string> = {
  'monday': 'lunes', 'tuesday': 'martes', 'wednesday': 'miercoles', 'thursday': 'jueves', 'friday': 'viernes', 'saturday': 'sabado', 'sunday': 'domingo',
  'mon': 'lunes', 'tue': 'martes', 'wed': 'miercoles', 'thu': 'jueves', 'fri': 'viernes', 'sat': 'sabado', 'sun': 'domingo',
  '0': 'domingo', '1': 'lunes', '2': 'martes', '3': 'miercoles', '4': 'jueves', '5': 'viernes', '6': 'sabado', '7': 'domingo',
  'miercoles': 'miercoles', 'sabado': 'sabado', 'miércoles': 'miercoles', 'sábado': 'sabado'
};

const DAYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const DAYS_DISPLAY = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const normalizeDay = (day: string | number | undefined | null): string => {
  if (day === undefined || day === null) return '';
  const d = String(day).toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .trim();
  return DAY_TRANSLATIONS[d] || d;
};

export const getEcuadorDayKey = (date: Date): string => {
  return DAYS[date.getDay()];
};

export const getEcuadorDayNameES = (date: Date): string => {
  return DAYS_DISPLAY[date.getDay()];
};

/**
 * Checks if a business is currently open based on its openingHours object.
 * Returns an object with isOpen boolean and a formatted message.
 */
export const isBusinessOpen = (openingHours: any): { isOpen: boolean; message: string; color: string } => {
  if (!openingHours || typeof openingHours !== 'object' || Object.keys(openingHours).length === 0) {
    return { isOpen: false, message: 'Horario no disponible', color: 'slate' };
  }

  const now = getEcuadorDate();
  const currentDayIndex = now.getDay(); 
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

  // 1. Pre-process and normalize keys to ensure we can match correctly
  const normalizedHours: Record<string, any> = {};
  let hasAnySchedule = false;
  
  Object.keys(openingHours).forEach(key => {
    const normKey = normalizeDay(key);
    if (openingHours[key] && typeof openingHours[key] === 'object') {
      normalizedHours[normKey] = openingHours[key];
      // Check if it has open/close times or is explicitly closed
      if (openingHours[key].open || openingHours[key].closed === true || openingHours[key].closed === "true") {
        hasAnySchedule = true;
      }
    }
  });

  if (!hasAnySchedule) {
    return { isOpen: false, message: 'Horario no disponible', color: 'slate' };
  }

  const getMinutes = (timeStr: string) => {
    if (!timeStr || !timeStr.includes(':')) return -1;
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return -1;
    return h * 60 + m;
  };

  /**
   * Checks if it's currently open considering midnight crossings
   */
  const checkCurrentlyOpen = () => {
    // Case A: Open Today?
    const todayKey = DAYS[currentDayIndex];
    const today = normalizedHours[todayKey];
    
    if (today && !today.closed && today.open && today.close) {
      const openTime = getMinutes(today.open);
      const closeTime = getMinutes(today.close);
      
      if (openTime === -1 || closeTime === -1) return { isOpen: false };

      if (closeTime <= openTime) { // e.g. 18:00 to 02:00
        if (currentTimeMinutes >= openTime || currentTimeMinutes < closeTime) {
          return { isOpen: true, closeTime: today.close };
        }
      } else {
        if (currentTimeMinutes >= openTime && currentTimeMinutes < closeTime) {
          return { isOpen: true, closeTime: today.close };
        }
      }
    }

    // Case B: Still open from yesterday? (Across midnight)
    const yesterdayIndex = (currentDayIndex + 6) % 7;
    const yesterdayKey = DAYS[yesterdayIndex];
    const yesterday = normalizedHours[yesterdayKey];

    if (yesterday && !yesterday.closed && yesterday.open && yesterday.close) {
      const openTime = getMinutes(yesterday.open);
      const closeTime = getMinutes(yesterday.close);
      
      if (openTime !== -1 && closeTime !== -1 && closeTime <= openTime) {
        // If it crosses midnight, and we are currently before the yesterday's close time
        if (currentTimeMinutes < closeTime) {
          return { isOpen: true, closeTime: yesterday.close };
        }
      }
    }

    return { isOpen: false };
  };

  const status = checkCurrentlyOpen();

  if (status.isOpen) {
    return { 
      isOpen: true, 
      message: `Abierto hasta las ${status.closeTime}`, 
      color: 'emerald' 
    };
  }

  // 2. If closed, when does it open?
  // Check later today
  const todayKey = DAYS[currentDayIndex];
  const today = normalizedHours[todayKey];
  if (today && !today.closed && today.open) {
    const openTime = getMinutes(today.open);
    if (openTime !== -1 && openTime > currentTimeMinutes) {
      return { 
        isOpen: false, 
        message: `Cerrado - Abre hoy a las ${today.open}`, 
        color: 'amber' 
      };
    }
  }

  // Check next 7 days
  for (let i = 1; i <= 7; i++) {
    const nextIdx = (currentDayIndex + i) % 7;
    const nextKey = DAYS[nextIdx];
    const next = normalizedHours[nextKey];
    
    if (next && !next.closed && next.open) {
      const dayNameDisplay = DAYS_DISPLAY[nextIdx];
      if (i === 1) {
        return { 
          isOpen: false, 
          message: `Cerrado - Abre mañana a las ${next.open}`, 
          color: 'rose' 
        };
      }
      return { 
        isOpen: false, 
        message: `Cerrado - Abre el ${dayNameDisplay} a las ${next.open}`, 
        color: 'rose' 
      };
    }
  }

  return { isOpen: false, message: 'Cerrado', color: 'rose' };
};

/**
 * Provides a default opening hours object (all closed by default)
 */
export const getDefaultOpeningHours = (): Record<string, any> => {
  const hours: any = {};
  ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].forEach(day => {
    hours[day] = { closed: true, open: '08:00', close: '22:00' };
  });
  return hours;
};
