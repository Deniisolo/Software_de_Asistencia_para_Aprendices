export type AttendanceCounts = {
  aTiempo: number;
  tarde: number;
  ausente: number;
};

type AsistenciaEstado = {
  estado: string | null;
};

export function countAttendanceByEstado(rows: AsistenciaEstado[]): AttendanceCounts {
  const counts: AttendanceCounts = { aTiempo: 0, tarde: 0, ausente: 0 };

  for (const row of rows) {
    const estado = row.estado?.trim().toLowerCase() ?? "";
    if (estado === "presente") {
      counts.aTiempo += 1;
    } else if (estado === "tarde" || estado === "tardanza") {
      counts.tarde += 1;
    } else if (estado === "ausente") {
      counts.ausente += 1;
    }
  }

  return counts;
}

export function formatEstadoLabel(estado: string | null | undefined) {
  const value = estado?.trim().toLowerCase() ?? "";
  if (value === "presente") return "A tiempo";
  if (value === "tarde" || value === "tardanza") return "Tarde";
  if (value === "ausente") return "Ausente";
  return estado ?? "—";
}
