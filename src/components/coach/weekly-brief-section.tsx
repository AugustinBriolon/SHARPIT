export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-label">{title}</p>
      <div className="text-foreground text-sm leading-relaxed">{children}</div>
    </div>
  );
}
