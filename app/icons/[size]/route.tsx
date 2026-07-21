import { ImageResponse } from "next/og";
import { AppIconGlyph } from "@/lib/app-icon";

/**
 * URLs estáveis (não passam pela convenção de arquivo icon.tsx do Next,
 * que adiciona query string de cache-busting) — o manifest.ts referencia
 * exatamente /icons/192, /icons/512, /icons/192-maskable, /icons/512-maskable.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: rawSize } = await params;
  const maskable = rawSize.endsWith("-maskable");
  const size = Number(maskable ? rawSize.replace("-maskable", "") : rawSize);
  if (!Number.isFinite(size) || size <= 0) {
    return new Response("Not found", { status: 404 });
  }
  return new ImageResponse(<AppIconGlyph size={size} maskable={maskable} />, { width: size, height: size });
}
