"use client";

import { useMemo } from "react";
import styles from "./InstructorAttendanceChart.module.css";

type AsistenciaEstado = {
  estado: string | null;
};

export type AttendanceCounts = {
  aTiempo: number;
  tarde: number;
  ausente: number;
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

type ChartSegment = {
  key: keyof AttendanceCounts;
  label: string;
  value: number;
  color: string;
  className: string;
};

type InstructorAttendanceChartProps = {
  asistencias: AsistenciaEstado[];
  loading?: boolean;
};

const SEGMENT_META: Omit<ChartSegment, "value">[] = [
  { key: "aTiempo", label: "A tiempo", color: "#2e7d32", className: styles.legendATiempo },
  { key: "tarde", label: "Tarde", color: "#f57f17", className: styles.legendTarde },
  { key: "ausente", label: "Ausente", color: "#c62828", className: styles.legendAusente }
];

function buildSegments(counts: AttendanceCounts): ChartSegment[] {
  return SEGMENT_META.map((segment) => ({
    ...segment,
    value: counts[segment.key]
  }));
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad)
  };
}

function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;

  return [
    `M ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`,
    `L ${cx} ${cy}`,
    "Z"
  ].join(" ");
}

export function InstructorAttendanceChart({
  asistencias,
  loading = false
}: InstructorAttendanceChartProps) {
  const counts = useMemo(() => countAttendanceByEstado(asistencias), [asistencias]);
  const segments = useMemo(() => buildSegments(counts), [counts]);
  const total = counts.aTiempo + counts.tarde + counts.ausente;

  const pieSegments = useMemo(() => {
    if (total === 0) return [];

    let currentAngle = 0;
    return segments
      .filter((segment) => segment.value > 0)
      .map((segment) => {
        const sweep = (segment.value / total) * 360;
        const slice = {
          ...segment,
          startAngle: currentAngle,
          endAngle: currentAngle + sweep
        };
        currentAngle += sweep;
        return slice;
      });
  }, [segments, total]);

  if (loading) {
    return (
      <div className={styles.wrap} aria-busy="true" aria-label="Cargando resumen de asistencia">
        <p className={styles.loadingText}>Cargando resumen...</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap} aria-labelledby="asistencia-chart-titulo">
      <h3 id="asistencia-chart-titulo" className={styles.title}>
        Resumen de asistencia
      </h3>

      <div className={styles.content}>
        <div className={styles.chartArea}>
          <svg
            className={styles.chart}
            viewBox="0 0 200 200"
            role="img"
            aria-label={`Gráfico de asistencia: ${counts.aTiempo} a tiempo, ${counts.tarde} tarde, ${counts.ausente} ausente`}
          >
            <circle cx="100" cy="100" r="78" className={styles.chartBg} />
            {total === 0 ? (
              <circle cx="100" cy="100" r="78" className={styles.chartEmpty} />
            ) : (
              pieSegments.map((segment) => (
                <path
                  key={segment.key}
                  d={describeArc(100, 100, 78, segment.startAngle, segment.endAngle)}
                  fill={segment.color}
                  className={styles.slice}
                />
              ))
            )}
            <circle cx="100" cy="100" r="48" className={styles.chartHole} />
            <text x="100" y="94" textAnchor="middle" className={styles.centerTotal}>
              {total}
            </text>
            <text x="100" y="114" textAnchor="middle" className={styles.centerLabel}>
              aprendices
            </text>
          </svg>
        </div>

        <ul className={styles.legend}>
          {segments.map((segment) => {
            const percent = total > 0 ? Math.round((segment.value / total) * 100) : 0;
            return (
              <li key={segment.key} className={styles.legendItem}>
                <span className={`${styles.legendDot} ${segment.className}`} aria-hidden="true" />
                <span className={styles.legendText}>
                  <strong>{segment.label}</strong>
                  <span className={styles.legendMeta}>
                    {segment.value} {segment.value === 1 ? "aprendiz" : "aprendices"}
                    {total > 0 ? ` · ${percent}%` : ""}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={styles.bars} aria-hidden="true">
        {segments.map((segment) => {
          const width = total > 0 ? (segment.value / total) * 100 : 0;
          return (
            <div key={segment.key} className={styles.barRow}>
              <span className={styles.barLabel}>{segment.label}</span>
              <div className={styles.barTrack}>
                <div
                  className={`${styles.barFill} ${segment.className}`}
                  style={{ width: `${width}%` }}
                />
              </div>
              <span className={styles.barValue}>{segment.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
