/**
 * Monograma "B" no verde da marca (#57AF78, mesmo tom usado no resto do
 * site) — placeholder até existir uma logo de verdade. Reaproveitado pelos
 * três lugares que precisam gerar um ícone: app/icon.tsx (favicon),
 * app/apple-icon.tsx e app/icons/[size]/route.tsx (ícones do manifest PWA).
 */
const BRAND_GREEN = "#57AF78";

export function AppIconGlyph({ size, maskable = false }: { size: number; maskable?: boolean }) {
  // Ícone "maskable" precisa de margem de segurança (~20%) pra não cortar o
  // "B" quando o Android aplica a máscara circular/squircle do sistema.
  const fontSize = maskable ? size * 0.42 : size * 0.58;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND_GREEN,
        color: "#ffffff",
        fontSize,
        fontWeight: 700,
        fontFamily: "-apple-system, Helvetica, Arial, sans-serif",
      }}
    >
      B
    </div>
  );
}

export const APP_ICON_SIZES = [192, 512] as const;
