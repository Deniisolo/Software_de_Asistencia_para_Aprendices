import ExcelJS from "exceljs";
import {
  countAttendanceByEstado,
  formatEstadoLabel
} from "@/src/features/instructor/lib/attendanceStats";
import {
  borderRange,
  estadoStyle,
  PAGE_COLORS,
  paintCell,
  sectionTitle,
  tableHeader,
  thinBorder
} from "@/src/features/instructor/lib/asistenciaExcelTheme";

export type AsistenciaExportRow = {
  aprendizNombre: string | null;
  documentoAprendiz: string | null;
  fecha: string | null;
  horaIngreso: string | null;
  estado: string | null;
  idAprendiz: string | null;
};

export type AsistenciaClaseExportContext = {
  claseId: number;
  claseFecha: string | null;
  claseHoraInicio: string | null;
  ambiente: string | null;
  programaNombre: string | null;
  competenciaNombre: string | null;
  fichaNumero: string | null;
  asistencias: AsistenciaExportRow[];
};

function cell(value: string | null | undefined) {
  return value && value.trim() !== "" ? value : "—";
}

export async function buildAsistenciaExcelWorkbook(context: AsistenciaClaseExportContext) {
  const counts = countAttendanceByEstado(context.asistencias);
  const total = counts.aTiempo + counts.tarde + counts.ausente;
  const generatedAt = new Date().toLocaleString("es-CO");

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema de Asistencia";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Asistencia", {
    views: [{ showGridLines: false, state: "frozen", ySplit: 3 }]
  });

  ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1 };
  ws.columns = [
    { width: 24 },
    { width: 32 },
    { width: 16 },
    { width: 14 },
    { width: 14 },
    { width: 14 }
  ];

  ws.mergeCells("A1:F2");
  const banner = ws.getCell("A1");
  banner.value = "Reporte de asistencia por clase";
  banner.font = { name: "Calibri", bold: true, size: 16, color: { argb: PAGE_COLORS.white } };
  banner.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PAGE_COLORS.primary } };
  banner.alignment = { vertical: "middle", horizontal: "center" };
  banner.border = thinBorder;
  ws.getRow(1).height = 26;
  ws.getRow(2).height = 26;

  ws.mergeCells("A3:F3");
  paintCell(ws.getCell("A3"), {
    value: [
      `Clase #${context.claseId}`,
      context.claseFecha ? `Fecha ${context.claseFecha}` : null,
      context.claseHoraInicio ? `Hora ${context.claseHoraInicio}` : null,
      `Generado ${generatedAt}`
    ]
      .filter(Boolean)
      .join("  ·  "),
    size: 10,
    color: PAGE_COLORS.subtitle,
    bg: PAGE_COLORS.panel,
    align: "center",
    border: thinBorder
  });
  ws.getRow(3).height = 22;

  let row = 5;
  sectionTitle(ws, row, "Informacion de la clase");
  row += 1;

  const infoStart = row;
  const infoRows: Array<[string, string]> = [
    ["Programa de formacion", cell(context.programaNombre)],
    ["Competencia", cell(context.competenciaNombre)],
    ["Ficha", cell(context.fichaNumero)],
    ["Ambiente", cell(context.ambiente)]
  ];

  infoRows.forEach(([label, value], index) => {
    const current = ws.getRow(row);
    current.height = 22;
    paintCell(current.getCell(1), {
      value: label,
      bold: true,
      color: PAGE_COLORS.label,
      bg: PAGE_COLORS.tableHeaderBg,
      border: thinBorder
    });
    paintCell(current.getCell(2), {
      value,
      color: PAGE_COLORS.heading,
      bg: index % 2 === 0 ? PAGE_COLORS.panel : PAGE_COLORS.stripe,
      border: thinBorder
    });
    ws.mergeCells(row, 2, row, 6);
    for (let col = 3; col <= 6; col += 1) {
      paintCell(current.getCell(col), {
        bg: index % 2 === 0 ? PAGE_COLORS.panel : PAGE_COLORS.stripe,
        border: thinBorder
      });
    }
    row += 1;
  });
  borderRange(ws, infoStart, row - 1, 1, 6);

  row += 1;
  sectionTitle(ws, row, "Resumen de asistencia");
  row += 1;

  const summaryStart = row;
  const summaryHeader = ws.getRow(row);
  summaryHeader.values = ["Estado", "Cantidad", "Porcentaje"];
  tableHeader(summaryHeader);
  row += 1;

  [
    ["A tiempo", counts.aTiempo],
    ["Tarde", counts.tarde],
    ["Ausente", counts.ausente]
  ].forEach(([label, amount], index) => {
    const current = ws.getRow(row);
    current.height = 22;
    const colors = estadoStyle(String(label));
    const percent = total > 0 ? `${Math.round((Number(amount) / total) * 100)}%` : "0%";

    paintCell(current.getCell(1), {
      value: label,
      bold: true,
      color: colors.text,
      bg: colors.bg,
      border: thinBorder
    });
    paintCell(current.getCell(2), {
      value: amount,
      bold: true,
      align: "center",
      bg: index % 2 === 0 ? PAGE_COLORS.panel : PAGE_COLORS.stripe,
      border: thinBorder
    });
    paintCell(current.getCell(3), {
      value: percent,
      align: "center",
      color: PAGE_COLORS.subtitle,
      bg: index % 2 === 0 ? PAGE_COLORS.panel : PAGE_COLORS.stripe,
      border: thinBorder
    });
    row += 1;
  });
  borderRange(ws, summaryStart, row - 1, 1, 3);

  row += 1;
  sectionTitle(ws, row, "Detalle de aprendices");
  row += 1;

  const detailStart = row;
  const detailHeader = ws.getRow(row);
  detailHeader.values = ["#", "Aprendiz", "Documento", "Fecha", "Hora ingreso", "Estado"];
  tableHeader(detailHeader);
  row += 1;

  if (context.asistencias.length === 0) {
    ws.mergeCells(row, 1, row, 6);
    paintCell(ws.getCell(row, 1), {
      value: "No hay asistencia registrada para esta clase.",
      color: PAGE_COLORS.subtitle,
      bg: PAGE_COLORS.stripe,
      align: "center",
      border: thinBorder
    });
    borderRange(ws, detailStart, row, 1, 6);
  } else {
    context.asistencias.forEach((item, index) => {
      const current = ws.getRow(row);
      current.height = 22;
      const estadoLabel = formatEstadoLabel(item.estado);
      const colors = estadoStyle(estadoLabel);
      const values: ExcelJS.CellValue[] = [
        index + 1,
        cell(item.aprendizNombre ?? item.idAprendiz),
        cell(item.documentoAprendiz),
        cell(item.fecha),
        cell(item.horaIngreso),
        estadoLabel
      ];

      values.forEach((value, colIndex) => {
        const col = colIndex + 1;
        const isEstado = col === 6;
        paintCell(current.getCell(col), {
          value,
          bold: isEstado,
          color: isEstado ? colors.text : PAGE_COLORS.heading,
          bg: isEstado ? colors.bg : index % 2 === 0 ? PAGE_COLORS.panel : PAGE_COLORS.stripe,
          align: col === 1 ? "center" : "left",
          border: thinBorder
        });
      });
      row += 1;
    });
    borderRange(ws, detailStart, row - 1, 1, 6);
  }

  return workbook.xlsx.writeBuffer();
}
