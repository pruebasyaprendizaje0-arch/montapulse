
const DAY_TRANSLATIONS = {
  'monday': 'lunes', 'tuesday': 'martes', 'wednesday': 'miercoles', 'thursday': 'jueves', 'friday': 'viernes', 'saturday': 'sabado', 'sunday': 'domingo',
  'mon': 'lunes', 'tue': 'martes', 'wed': 'miercoles', 'thu': 'jueves', 'fri': 'viernes', 'sat': 'sabado', 'sun': 'domingo',
  '0': 'domingo', '1': 'lunes', '2': 'martes', '3': 'miercoles', '4': 'jueves', '5': 'viernes', '6': 'sabado', '7': 'domingo'
};

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const normalizeDay = (day) => {
  if (day === undefined || day === null) return '';
  const d = String(day).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  return DAY_TRANSLATIONS[d] || d;
};

console.log("miércoles ->", normalizeDay('miércoles'));
console.log("sábado ->", normalizeDay('sábado'));
console.log("Wednesday ->", normalizeDay('Wednesday'));
console.log("3 ->", normalizeDay(3));

const openingHours = {
    'miércoles': { open: '08:00', close: '22:00' },
    'sábado': { open: '10:00', close: '02:00' }
};

const normalizedHours = {};
Object.keys(openingHours).forEach(key => {
    const normKey = normalizeDay(key);
    normalizedHours[normKey] = openingHours[key];
});

console.log("Normalized Keys:", Object.keys(normalizedHours));

const dayIndex = 3; // Wednesday
const dayKey = DAYS[dayIndex];
const normDayKey = normalizeDay(dayKey);
console.log("Day index 3 ->", dayKey, "-> Normalized:", normDayKey);
console.log("Found in normalizedHours?", !!normalizedHours[normDayKey]);
