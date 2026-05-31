import ExcelJS from "exceljs";

/** Colores alineados con InstructorHomeFilters.module.css */
export const PAGE_COLORS = {
  pageBg: "FFFAFBFC",
  panel: "FFFFFFFF",
  heading: "FF111827",
  subtitle: "FF6B7280",
  label: "FF374151",
  summary: "FF4B5563",
  primary: "FF2563EB",
  tableHeaderBg: "FFF4F6F9",
  border: "FFE8ECF2",
  borderLight: "FFEEF1F5",
  onTime: "FF2E7D32",
  onTimeBg: "FFE8F5E9",
  late: "FFF57F17",
  lateBg: "FFFFF8E1",
  absent: "FFC62828",
  absentBg: "FFFFEBEE",
  white: "FFFFFFFF",
  stripe: "FFFAFBFC"
} as const;

export const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: PAGE_COLORS.border } },
  left: { style: "thin", color: { argb: PAGE_COLORS.border } },
  bottom: { style: "thin", color: { argb: PAGE_COLORS.border } },
  right: { style: "thin", color: { argb: PAGE_COLORS.border } }
};

export function paintCell(
  cellRef: ExcelJS.Cell,
  options: {
    value?: ExcelJS.CellValue;
    bold?: boolean;
    size?: number;
    color?: string;
    bg?: string;
    align?: "left" | "center" | "right";
    border?: Partial<ExcelJS.Borders>;
  } = {}
) {
  if (options.value !== undefined) cellRef.value = options.value;
  cellRef.font = {
    bold: options.bold,
    size: options.size ?? 11,
    color: { argb: options.color ?? PAGE_COLORS.heading },
    name: "Calibri"
  };
  cellRef.alignment = {
    vertical: "middle",
    horizontal: options.align ?? "left",
    wrapText: true
  };
  if (options.bg) {
    cellRef.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: options.bg }
    };
  }
  if (options.border) cellRef.border = options.border;
}

export function sectionTitle(worksheet: ExcelJS.Worksheet, row: number, text: string) {
  worksheet.mergeCells(row, 1, row, 6);
  paintCell(worksheet.getCell(row, 1), {
    value: text,
    bold: true,
    size: 12,
    color: PAGE_COLORS.heading,
    bg: PAGE_COLORS.tableHeaderBg,
    border: thinBorder
  });
  worksheet.getRow(row).height = 24;
}

export function tableHeader(row: ExcelJS.Row) {
  row.height = 22;
  row.eachCell({ includeEmpty: true }, (cell, col) => {
    if (col > 6) return;
    paintCell(cell, {
      bold: true,
      color: PAGE_COLORS.label,
      bg: PAGE_COLORS.tableHeaderBg,
      align: col === 1 ? "center" : "left",
      border: thinBorder
    });
  });
}

export function estadoStyle(label: string) {
  if (label === "A tiempo") return { text: PAGE_COLORS.onTime, bg: PAGE_COLORS.onTimeBg };
  if (label === "Tarde") return { text: PAGE_COLORS.late, bg: PAGE_COLORS.lateBg };
  if (label === "Ausente") return { text: PAGE_COLORS.absent, bg: PAGE_COLORS.absentBg };
  return { text: PAGE_COLORS.heading, bg: PAGE_COLORS.panel };
}

export function borderRange(
  worksheet: ExcelJS.Worksheet,
  r1: number,
  r2: number,
  c1: number,
  c2: number
) {
  for (let row = r1; row <= r2; row += 1) {
    for (let col = c1; col <= c2; col += 1) {
      const cell = worksheet.getCell(row, col);
      cell.border = { ...cell.border, ...thinBorder };
    }
  }
}
