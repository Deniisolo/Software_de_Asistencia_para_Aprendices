import { NextResponse } from "next/server";
import {
  InstructorAsistenciaExportError,
  InstructorAsistenciaExportService
} from "@/src/server/services/instructor-asistencia-export.service";

function parsePositiveInt(value: string | null): number | null {
  if (value == null || value === "") return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  return parsed;
}

export async function GET(request: Request) {
  const claseId = parsePositiveInt(new URL(request.url).searchParams.get("claseId"));

  if (claseId == null) {
    return NextResponse.json({ ok: false, error: "claseId requerido" }, { status: 400 });
  }

  try {
    const service = new InstructorAsistenciaExportService();
    const { buffer, filename } = await service.generateExcelBuffer(claseId);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    if (error instanceof InstructorAsistenciaExportError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { ok: false, error: "No se pudo generar el archivo Excel." },
      { status: 500 }
    );
  }
}
