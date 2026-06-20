/** Normaliza el id de programa almacenado como string en Ficha para usarlo como clave de mapa. */
export function normalizeProgramaFormacionId(id: string | null | undefined): string | null {
  if (id == null) return null;
  const trimmed = String(id).trim();
  if (trimmed === "") return null;
  const n = Number.parseInt(trimmed, 10);
  if (Number.isFinite(n)) return String(n);
  return trimmed;
}
