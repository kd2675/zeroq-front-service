export default function AppLoading({ message = "화면을 준비하고 있습니다." }: { message?: string }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--canvas)] px-5" aria-live="polite">
      <section className="text-center">
        <span className="mx-auto block size-8 animate-spin rounded-full border-2 border-slate-300 border-t-[var(--accent)]" aria-hidden="true" />
        <p className="mt-4 text-sm font-bold text-slate-600">{message}</p>
      </section>
    </main>
  );
}
