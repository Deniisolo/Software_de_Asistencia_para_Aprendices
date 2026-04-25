import { postTestController } from "@/src/server/modules/test/test.controller";

export async function POST(request: Request) {
  return postTestController(request);
}
