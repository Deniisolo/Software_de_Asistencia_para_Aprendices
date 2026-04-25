export type CreateTestInputDto = {
  dato: string;
};

export function parseCreateTestInput(input: unknown): CreateTestInputDto {
  const body = input as { dato?: string };
  const dato = body.dato?.trim();

  if (!dato) {
    throw new Error("El campo dato es obligatorio");
  }

  return { dato };
}
