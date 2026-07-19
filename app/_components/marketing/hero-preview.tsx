/**
 * Placeholder visual — CSS-only until a real product screenshot exists.
 * Swap the body of the "screen" div below for an <Image> when one is ready;
 * the browser-chrome frame around it is designed to keep working either way.
 */
export function HeroPreview({ previewCaption }: { previewCaption: string }) {
  return (
    <div className="relative mx-auto w-full max-w-3xl">
      <div className="absolute -inset-x-10 -top-10 h-72 rounded-full bg-primary/30 blur-3xl" aria-hidden />
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-neutral-900 shadow-2xl">
        <div className="flex items-center gap-1.5 border-b border-white/10 bg-neutral-900/80 px-4 py-3">
          <span className="size-2.5 rounded-full bg-neutral-700" />
          <span className="size-2.5 rounded-full bg-neutral-700" />
          <span className="size-2.5 rounded-full bg-neutral-700" />
          <span className="ml-3 truncate rounded-md bg-neutral-800 px-3 py-1 text-xs text-neutral-500">
            suabarbearia.aparatus.app
          </span>
        </div>
        {/* screen */}
        <div className="relative grid aspect-[16/9] place-items-center bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:32px_32px]">
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent" />
          <div className="relative flex flex-col items-center gap-3 text-neutral-600">
            <div className="size-14 rounded-full border border-dashed border-neutral-700" />
            <p className="text-xs">{previewCaption}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
