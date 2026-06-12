type Props = {
  children: React.ReactNode;
};

/** Horizontal rule with centered label; lines stop at the text (no strikethrough). */
export function AuthMethodDivider({ children }: Props) {
  return (
    <div
      className="flex items-center gap-3 py-1"
      role="separator"
      aria-orientation="horizontal"
    >
      <div className="h-px min-w-0 flex-1 bg-border" aria-hidden />
      <span className="shrink-0 text-xs text-muted-foreground">{children}</span>
      <div className="h-px min-w-0 flex-1 bg-border" aria-hidden />
    </div>
  );
}
