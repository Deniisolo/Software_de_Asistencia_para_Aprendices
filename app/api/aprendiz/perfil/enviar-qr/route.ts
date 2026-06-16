import { NextResponse } from "next/server";
import { getBearerUser } from "@/src/server/lib/auth-request";
import {
  AprendizPortalError,
  AprendizPortalService
} from "@/src/server/services/aprendiz-portal.service";

export async function POST(request: Request) {
  const user = getBearerUser(request);

  if (!user) {
    return NextResponse.json({ ok: false, error: "Token requerido o inválido." }, { status: 401 });
  }

  if (user.rol !== "aprendiz") {
    return NextResponse.json(
      { ok: false, error: "Solo los aprendices pueden acceder a este recurso." },
      { status: 403 }
    );
  }

  const service = new AprendizPortalService();

  try {
    const result = await service.sendQrToEmail(user.id);
    return NextResponse.json({
      ok: true,
      message: `Código QR enviado a ${result.correo}.`,
      correo: result.correo
    });
  } catch (error) {
    if (error instanceof AprendizPortalError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { ok: false, error: "No se pudo enviar el código QR por correo." },
      { status: 500 }
    );
  }
}
