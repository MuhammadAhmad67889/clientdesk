import { NextResponse } from "next/server";
import { checkHealth } from "../../../lib/health";
import { getPrisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

/** Liveness check for monitoring: 200 when the database answers,
 * 503 when it does not. No authentication, so an uptime monitor can
 * call it without a session — it reveals nothing about any account. */
export async function GET() {
  const result = await checkHealth(() => getPrisma().$queryRaw`SELECT 1`);
  return NextResponse.json(result, { status: result.status === "ok" ? 200 : 503 });
}
