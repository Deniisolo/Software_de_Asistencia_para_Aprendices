import { NextResponse } from "next/server";
import {
  InstructorAsistenciaQrError,
  InstructorAsistenciaQrService
} from "@/src/server/services/instructor-asistencia-qr.service";

function parsePositiveInt(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  return parsed;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      claseId?: unknown;
      qrCode?: unknown;
    };

    const claseId = parsePositiveInt(body.claseId);
    const qrCode = typeof body.qrCode === "string" ? body.qrCode : "";

    if (claseId == null || !qrCode.trim()) {
      return NextResponse.json(
        { ok: false, error: "claseId y qrCode son requeridos." },
        { status: 400 }
      );
    }

    const service = new InstructorAsistenciaQrService();
    const asistencia = await service.registrar({ claseId, qrCode });

    return NextResponse.json({
      ok: true,
      asistencia,
      message: `Asistencia registrada como ${asistencia.estado}.`
    });
  } catch (error) {
    if (error instanceof InstructorAsistenciaQrError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { ok: false, error: "No se pudo registrar la asistencia por QR." },
      { status: 500 }
    );
  }
}
