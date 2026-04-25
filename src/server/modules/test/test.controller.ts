import { NextResponse } from "next/server";
import { parseCreateTestInput } from "./test.dto";
import { createTest } from "./test.service";

export async function postTestController(request: Request) {
  try {
    const body = await request.json();
    const dto = parseCreateTestInput(body);
    const created = await createTest(dto.dato);

    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno";
    const status = message === "El campo dato es obligatorio" ? 400 : 500;

    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
