/** Mesmo tratamento do header da home (app/app/page.tsx) — chrome
 * consistente pras demais telas do app de descoberta. */
export function AppPageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="border-b border-border p-5">
      <h1 className="text-lg font-bold tracking-tight">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </header>
  );
}
