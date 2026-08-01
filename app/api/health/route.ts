import { NextResponse } from "next/server";

/** Liveness público e barato; não revela topologia, versão ou filas. */
export function GET() {
  return NextResponse.json(
    { status: "ok" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
