import { NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/data";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ email: null }, { status: 401 });
  return NextResponse.json({ email: user.email });
}
