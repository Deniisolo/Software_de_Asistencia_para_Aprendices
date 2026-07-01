import { NextResponse } from "next/server";
import {
  InstructorAprendicesCrudService,
  type AprendizCreateInput
} from "@/src/server/services/instructor-aprendices-crud.service";
import { normalizeAprendizEstado } from "@/src/lib/aprendizEstado";

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

export async function GET() {
  const service = new InstructorAprendicesCrudService();
  try {
    const data = await service.listGestion();
    return NextResponse.json({ ok: true, ...data });
  } catch {
    return NextResponse.json({ ok: false, error: "Error al listar aprendices" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const service = new InstructorAprendicesCrudService();
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const fichaIdFicha = parseBodyInt(body.fichaIdFicha);
    const idProgramaFormacion = str(body.idProgramaFormacion) ?? "";

    if (fichaIdFicha == null) {
      return NextResponse.json({ ok: false, error: "fichaIdFicha es obligatorio" }, { status: 400 });
    }

    const input: AprendizCreateInput = {
      nombre: str(body.nombre) ?? "",
      apellido: str(body.apellido) ?? "",
      correoElectronico: str(body.correoElectronico) ?? "",
      telefono: str(body.telefono) ?? "",
      numeroDocumento: str(body.numeroDocumento) ?? "",
      idTipoDocumento: str(body.idTipoDocumento) ?? "CC",
      idGenero: str(body.idGenero) ?? "M",
      usemame: str(body.usemame) ?? "",
      contrasenia: typeof body.contrasenia === "string" ? body.contrasenia : "",
      tipoDocumentoIdTipoDocumento:
        typeof body.tipoDocumentoIdTipoDocumento === "number"
          ? body.tipoDocumentoIdTipoDocumento
          : typeof body.tipoDocumentoIdTipoDocumento === "string"
            ? Number.parseInt(body.tipoDocumentoIdTipoDocumento, 10)
            : undefined,
      idProgramaFormacion,
      fichaIdFicha
    };

    const estado = normalizeAprendizEstado(body.estado);
    if (estado) input.estado = estado;

    if (input.tipoDocumentoIdTipoDocumento != null && !Number.isFinite(input.tipoDocumentoIdTipoDocumento)) {
      delete input.tipoDocumentoIdTipoDocumento;
    }

    const row = await service.createAprendizCompleto(input);
    return NextResponse.json({ ok: true, aprendiz: row });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo crear el aprendiz";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
