export const generateSlug = (text: string): string => {
  return text
    .toString()
    .normalize('NFD')                   // Elimina acentos/diacríticos
    .replace(/[\u0300-\u036f]/g, '')    // Quita las marcas de acentos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')               // Reemplaza espacios con guiones
    .replace(/[^\w-]+/g, '')            // Elimina caracteres no alfanuméricos excepto guiones
    .replace(/--+/g, '-');              // Reemplaza múltiples guiones por uno solo
};
