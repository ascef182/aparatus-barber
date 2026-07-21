import { Typewriter } from "@/app/_components/ui/typewriter"

interface AuthSplitLayoutProps {
  children: React.ReactNode
  quote: string
  quoteAuthor: string
}

/**
 * Layout compartilhado de /sign-in e /sign-up: formulário à esquerda,
 * painel decorativo com citação (Typewriter) à direita em telas md+.
 */
export function AuthSplitLayout({ children, quote, quoteAuthor }: AuthSplitLayoutProps) {
  return (
    <div className="grid min-h-screen w-full md:grid-cols-2">
      <div className="flex items-center justify-center p-6 py-12">{children}</div>

      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary/15 via-background to-accent/40 md:block">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 1px, transparent 12px)",
            color: "var(--border)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
        <div className="relative z-10 flex h-full flex-col items-center justify-end p-10 pb-14">
          <blockquote className="max-w-sm space-y-2 text-center text-foreground">
            <p className="text-lg font-medium">
              &ldquo;
              <Typewriter key={quote} text={quote} speed={35} />
              &rdquo;
            </p>
            <cite className="block text-sm font-light text-muted-foreground not-italic">
              — {quoteAuthor}
            </cite>
          </blockquote>
        </div>
      </div>
    </div>
  )
}
