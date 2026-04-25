import { prisma } from "@/src/server/db/prisma";

export async function createTestInput(dato: string) {
  return prisma.testInput.create({
    data: { dato }
  });
}
