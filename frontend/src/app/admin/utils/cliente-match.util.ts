/**
 * Utilidades para identificar clientes por teléfono y barrios por nombre
 * de forma ESTRICTA, evitando asignar direcciones/barrios de otro cliente.
 */

/** Longitud mínima para considerar un teléfono completo (fijo CO = 7, celular = 10). */
export const MIN_PHONE_DIGITS = 7;

/**
 * Normaliza un teléfono: deja solo dígitos y elimina el indicativo de Colombia (57)
 * cuando el número viene con él (ej: "+57 300 123 4567" -> "3001234567").
 */
export function normalizePhone(value: unknown): string {
  let digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('57')) {
    digits = digits.slice(2);
  }
  return digits;
}

/**
 * Compara dos teléfonos de forma exacta (tras normalizar).
 * Nunca hace coincidencias parciales (endsWith) ni acepta teléfonos vacíos o incompletos.
 */
export function phonesMatch(a: unknown, b: unknown): boolean {
  const pa = normalizePhone(a);
  const pb = normalizePhone(b);
  if (pa.length < MIN_PHONE_DIGITS || pb.length < MIN_PHONE_DIGITS) return false;
  return pa === pb;
}

/** Busca un cliente cuyo teléfono coincida EXACTAMENTE con el número dado. */
export function findClienteByPhone<T extends { telefono?: string | null }>(
  clientes: T[] | null | undefined,
  telefono: unknown
): T | undefined {
  if (normalizePhone(telefono).length < MIN_PHONE_DIGITS) return undefined;
  return (clientes || []).find(c => phonesMatch(c?.telefono, telefono));
}

/** Normaliza texto para comparar: sin tildes, minúsculas, sin espacios dobles ni bordes. */
export function normalizeText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Limpia un texto libre (dirección, nombre): quita espacios dobles, saltos de línea y bordes. */
export function cleanFreeText(value: unknown): string {
  return String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Busca un barrio por nombre ignorando tildes, mayúsculas y espacios. */
export function findBarrioByName<T extends { nombre: string }>(
  barrios: T[] | null | undefined,
  nombre: unknown
): T | undefined {
  const target = normalizeText(nombre);
  if (!target) return undefined;
  return (barrios || []).find(b => normalizeText(b?.nombre) === target);
}
