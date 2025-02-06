import { NextResponse } from "next/server";
import { getUserSession } from "../../../lib/session";

export async function GET() {
  const session = await getUserSession();
  return NextResponse.json(session);
}
