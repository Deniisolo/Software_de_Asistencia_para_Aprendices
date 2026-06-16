import type { AuthUserPayload } from "@/src/server/config/types/auth.types";

export type HomeUserRole = "aprendiz" | "instructor" | "administrador";

export type HomeNavLink = {
  label: string;
  href: string;
  /** Si es true, solo coincide con la ruta exacta (util para "Inicio"). */
  exact?: boolean;
};

/** Ruta base del panel por rol (login y marca del navbar). */
export const HOME_PATH_BY_ROLE: Record<HomeUserRole, string> = {
  aprendiz: "/home/aprendiz",
  instructor: "/home/instructor/asistencia",
  administrador: "/home/administrador"
};

const ROLE_LABEL: Record<HomeUserRole, string> = {
  aprendiz: "Aprendiz",
  instructor: "Instructor",
  administrador: "Administrador"
};

/**
 * Enlaces del navbar por rol. Solo instructor tiene entradas por ahora;
 * amplía aquí aprendiz / administrador cuando existan pantallas.
 */
export const NAV_LINKS_BY_ROLE: Record<HomeUserRole, HomeNavLink[]> = {
  aprendiz: [{ label: "Inicio", href: "/home/aprendiz", exact: true }],
  instructor: [
    { label: "Asistencia", href: "/home/instructor/asistencia" },
    { label: "Aprendices", href: "/home/instructor/aprendices" },
    { label: "Clases", href: "/home/instructor/clases" },
    { label: "Fichas", href: "/home/instructor/fichas" }
  ],
  administrador: [
    { label: "Inicio", href: "/home/administrador", exact: true },
    { label: "Centros", href: "/home/administrador/centros" },
    { label: "Ambientes", href: "/home/administrador/ambientes" },
    { label: "Programas", href: "/home/administrador/programas" },
    { label: "Competencias", href: "/home/administrador/competencias" },
    { label: "Asignaciones", href: "/home/administrador/programa-competencias" },
    { label: "Usuarios", href: "/home/administrador/usuarios" },
    { label: "Fichas", href: "/home/administrador/fichas" },
    { label: "Instructores", href: "/home/administrador/instructor-fichas" }
  ]
};

export function normalizeHomeRole(rol: string | undefined): HomeUserRole | null {
  const r = rol?.trim().toLowerCase();
  if (r === "aprendiz" || r === "instructor" || r === "administrador") return r;
  return null;
}

export function homeRoleFromPathname(pathname: string): HomeUserRole | null {
  if (pathname.startsWith("/home/aprendiz")) return "aprendiz";
  if (pathname.startsWith("/home/instructor")) return "instructor";
  if (pathname.startsWith("/home/administrador")) return "administrador";
  return null;
}

export function labelForHomeRole(role: HomeUserRole): string {
  return ROLE_LABEL[role];
}

export function resolveHomeRole(
  pathname: string,
  payload: AuthUserPayload | null
): HomeUserRole | null {
  const fromToken = normalizeHomeRole(payload?.rol);
  if (fromToken) return fromToken;
  return homeRoleFromPathname(pathname);
}
