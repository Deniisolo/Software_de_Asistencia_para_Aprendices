export const APRENDIZ_ESTADOS = ["activo", "inactivo"] as const;

export type AprendizEstado = (typeof APRENDIZ_ESTADOS)[number];

export const APRENDIZ_ESTADO_DEFAULT: AprendizEstado = "activo";

export function normalizeAprendizEstado(value: unknown): AprendizEstado | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return APRENDIZ_ESTADOS.includes(normalized as AprendizEstado)
    ? (normalized as AprendizEstado)
    : null;
}

export function formatAprendizEstadoLabel(estado: string | null | undefined): string {
  const normalized = normalizeAprendizEstado(estado);
  if (normalized === "activo") return "Activo";
  if (normalized === "inactivo") return "Inactivo";
  return estado?.trim() || "—";
}
