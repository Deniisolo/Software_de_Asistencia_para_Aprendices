import { NextResponse } from "next/server";
import {
  InstructorAprendicesCrudService,
  type AprendizUpdateInput
} from "@/src/server/services/instructor-aprendices-crud.service";
import { normalizeAprendizEstado } from "@/src/lib/aprendizEstado";

type RouteContext = { params: Promise<{ usuarioId: string }> };

function str(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t === "" ? undefined : value;
}

function parseBodyInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function PUT(request: Request, ctx: RouteContext) {
  const service = new InstructorAprendicesCrudService();
  const { usuarioId } = await ctx.params;
  const usuarioIdUsuario = Number.parseInt(usuarioId, 10);
  if (!Number.isFinite(usuarioIdUsuario) || usuarioIdUsuario < 1) {
    return NextResponse.json({ ok: false, error: "usuarioId invalido" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const input: AprendizUpdateInput = {};

    if ("nombre" in body) input.nombre = str(body.nombre) ?? "";
    if ("apellido" in body) input.apellido = str(body.apellido) ?? "";
    if ("correoElectronico" in body) input.correoElectronico = str(body.correoElectronico) ?? "";
    if ("telefono" in body) input.telefono = str(body.telefono) ?? "";
    if ("numeroDocumento" in body) input.numeroDocumento = str(body.numeroDocumento) ?? "";
    if ("idTipoDocumento" in body) input.idTipoDocumento = str(body.idTipoDocumento) ?? "";
    if ("idGenero" in body) input.idGenero = str(body.idGenero) ?? "";
    if ("usemame" in body) input.usemame = str(body.usemame) ?? "";
    if ("contrasenia" in body && typeof body.contrasenia === "string") {
      input.contrasenia = body.contrasenia;
    }
    if ("idProgramaFormacion" in body) {
      const raw = body.idProgramaFormacion;
      if (raw === null || raw === "") input.idProgramaFormacion = null;
      else if (typeof raw === "string") input.idProgramaFormacion = raw.trim();
      else if (typeof raw === "number") input.idProgramaFormacion = String(raw);
    }
    if ("fichaIdFicha" in body) {
      const n = parseBodyInt(body.fichaIdFicha);
      if (n != null) input.fichaIdFicha = n;
    }
    if ("qrCode" in body) input.qrCode = str(body.qrCode) ?? null;
    if ("estado" in body) {
      const estado = normalizeAprendizEstado(body.estado);
      if (!estado) {
        return NextResponse.json(
          { ok: false, error: "Estado invalido. Use activo o inactivo" },
          { status: 400 }
        );
      }
      input.estado = estado;
    }

    if (Object.keys(input).length === 0) {
      return NextResponse.json({ ok: false, error: "Sin campos para actualizar" }, { status: 400 });
    }

    const row = await service.updateAprendiz(usuarioIdUsuario, input);
    return NextResponse.json({ ok: true, aprendiz: row });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo actualizar el aprendiz";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

export async function DELETE(_request: Request, ctx: RouteContext) {
  const service = new InstructorAprendicesCrudService();
  const { usuarioId } = await ctx.params;
  const usuarioIdUsuario = Number.parseInt(usuarioId, 10);
  if (!Number.isFinite(usuarioIdUsuario) || usuarioIdUsuario < 1) {
    return NextResponse.json({ ok: false, error: "usuarioId invalido" }, { status: 400 });
  }

  try {
    await service.deleteAprendizCompleto(usuarioIdUsuario);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo eliminar el aprendiz";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
