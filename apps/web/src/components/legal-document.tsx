/** Long-form legal text: a title, the date it took effect, then numbered sections. */
export function LegalDocument({ title, effective, children }: { title: string; effective: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto grid max-w-3xl gap-8 px-4 py-12">
      <header className="grid gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm">Effective {effective}</p>
      </header>
      <div className="grid gap-8 text-sm leading-relaxed [&_a]:underline [&_a]:underline-offset-4 [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-medium [&_ul]:grid [&_ul]:gap-1.5">
        {children}
      </div>
    </article>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}
