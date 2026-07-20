export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl p-8 py-16">
      <h1 className="mb-8 text-3xl font-semibold">{title}</h1>
      <div className="prose prose-sm flex flex-col gap-4 text-sm leading-relaxed [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </main>
  );
}
