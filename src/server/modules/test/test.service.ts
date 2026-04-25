import { createTestInput } from "./test.repository";

export async function createTest(dato: string) {
  return createTestInput(dato);
}
