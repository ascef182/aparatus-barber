/**
 * Aplica o tema escuro de marketing (.theme-marketing, ver app/globals.css)
 * às páginas públicas deste grupo (termos, privacidade, DPA, impressum,
 * diretório) — mesma paleta dark Spotify-style (#121212/#181818/#1ED760)
 * da landing em app/page.tsx, sem herdar o verde "Minimal Premium" do
 * dashboard autenticado. Conteúdo das páginas não muda.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="theme-marketing bg-background text-foreground min-h-screen">
      {children}
    </div>
  );
}
