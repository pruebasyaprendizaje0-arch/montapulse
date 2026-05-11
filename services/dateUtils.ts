/**
 * Date utilities to ensure consistent time handling across different user timezones.
 * All time-sensitive operations (daily points, expiration dates, etc.) should use 
 * Ecuador time (UTC-5) as the source of truth.
 */

/**
 * Returns a Date object representing the current time in Ecuador (America/Guayaquil).
 * The resulting Date object's local time methods (getHours, etc.) will reflect Ecuador time.
 */
export const getEcuadorDate = (): Date => {
  try {
    // This creates a string representation of the date in Ecuador timezone
    // and then parses it into a new Date object.
    const ecuadorString = new Date().toLocaleString("en-US", {
      timeZone: "America/Guayaquil"
    });
    return new Date(ecuadorString);
  } catch (error) {
    console.error("Error calculating Ecuador date:", error);
    // Fallback to local time if timezone is not supported
    return new Date();
  }
};

/**
 * Returns the current date in Ecuador as a YYYY-MM-DD string.
 */
export const getEcuadorDayString = (): string => {
  const date = getEcuadorDate();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Ensures a value is a Date object, converting from Firestore Timestamp if necessary.
 */
export const ensureDate = (val: any): Date => {
  if (!val) return new Date();
  if (typeof val.toDate === 'function') return val.toDate();
  if (val instanceof Date) return val;
  // Handle Firestore-like timestamp objects {seconds, nanoseconds}
  if (val && typeof val === 'object' && 'seconds' in val) {
    return new Date(val.seconds * 1000);
  }
  return new Date(val);
};
