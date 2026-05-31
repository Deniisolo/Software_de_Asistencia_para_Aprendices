import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  buildAsistenciaExcelWorkbook,
  type AsistenciaClaseExportContext,
  type AsistenciaExportRow
} from "@/src/features/instructor/lib/buildAsistenciaExcelWorkbook";
import {
  countAttendanceByEstado,
  formatEstadoLabel
} from "@/src/features/instructor/lib/attendanceStats";

export type { AsistenciaClaseExportContext, AsistenciaExportRow };

function cell(value: string | null | undefined) {
  return value && value.trim() !== "" ? value : "—";
}

function buildFileBaseName(context: AsistenciaClaseExportContext) {
  const datePart = context.claseFecha?.replace(/[^\d-]/g, "") || "sin-fecha";
  return `asistencia-clase-${context.claseId}-${datePart}`;
}

function buildMetadataRows(context: AsistenciaClaseExportContext) {
  const counts = countAttendanceByEstado(context.asistencias);

  return [
    ["Programa", cell(context.programaNombre)],
    ["Competencia", cell(context.competenciaNombre)],
    ["Ficha", cell(context.fichaNumero)],
    ["Clase", `#${context.claseId}`],
    ["Fecha", cell(context.claseFecha)],
    ["Hora inicio", cell(context.claseHoraInicio)],
    ["Ambiente", cell(context.ambiente)],
    ["A tiempo", String(counts.aTiempo)],
    ["Tarde", String(counts.tarde)],
    ["Ausente", String(counts.ausente)],
    ["Total registrados", String(context.asistencias.length)]
  ];
}

function buildTableRows(asistencias: AsistenciaExportRow[]) {
  return asistencias.map((row, index) => [
    String(index + 1),
    cell(row.aprendizNombre ?? row.idAprendiz),
    cell(row.documentoAprendiz),
    cell(row.fecha),
    cell(row.horaIngreso),
    formatEstadoLabel(row.estado)
  ]);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportAsistenciaClaseExcel(context: AsistenciaClaseExportContext) {
  const buffer = await buildAsistenciaExcelWorkbook(context);
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  triggerDownload(blob, `${buildFileBaseName(context)}.xlsx`);
}

export function exportAsistenciaClasePdf(context: AsistenciaClaseExportContext) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const counts = countAttendanceByEstado(context.asistencias);

  doc.setFontSize(16);
  doc.text("Reporte de asistencia por clase", 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Generado: ${new Date().toLocaleString("es-CO")}`, 14, 25);
  doc.setTextColor(0, 0, 0);

  autoTable(doc, {
    startY: 30,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 1.5 },
    columnStyles: {
      0: { cellWidth: 38, fontStyle: "bold" },
      1: { cellWidth: 140 }
    },
    body: buildMetadataRows(context)
  });

  const summaryY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
    ?.finalY;

  doc.setFontSize(11);
  doc.text(
    `Resumen: ${counts.aTiempo} a tiempo · ${counts.tarde} tarde · ${counts.ausente} ausente`,
    14,
    (summaryY ?? 70) + 8
  );

  autoTable(doc, {
    startY: (summaryY ?? 70) + 12,
    head: [["#", "Aprendiz", "Documento", "Fecha", "Hora ingreso", "Estado"]],
    body: buildTableRows(context.asistencias),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [244, 246, 249], textColor: [55, 65, 81] },
    alternateRowStyles: { fillColor: [250, 251, 252] }
  });

  doc.save(`${buildFileBaseName(context)}.pdf`);
}
