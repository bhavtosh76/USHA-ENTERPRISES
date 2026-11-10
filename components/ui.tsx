import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ Button */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "bg-navy-900 text-white hover:bg-navy-800 focus-visible:ring-navy-500 shadow-sm",
  secondary:
    "bg-solar-600 text-white hover:bg-solar-700 focus-visible:ring-solar-400 shadow-sm",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-400",
  danger: "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-400",
  outline:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-300",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
};

const sizes: Record<Size, string> = {
  sm: "h-8 gap-1.5 px-3 text-xs",
  md: "h-10 gap-2 px-4 text-sm",
  lg: "h-11 gap-2 px-5 text-sm",
  icon: "h-9 w-9 justify-center",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center rounded-lg font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

/* ------------------------------------------------------------------- Badge */

export type Tone = "neutral" | "info" | "warning" | "success" | "danger" | "brand" | "purple";

const tones: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200",
  info: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200",
  warning: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
  success: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  danger: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
  brand: "bg-navy-50 text-navy-700 ring-1 ring-inset ring-navy-200",
  purple: "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return <span className={cn("chip", tones[tone], className)}>{children}</span>;
}

/* -------------------------------------------------------------------- Card */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("card", className)}>{children}</div>;
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4", className)}>
      <div>
        <h3 className="text-sm font-bold text-navy-900">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* ---------------------------------------------------------------- PageHead */

export function PageHeader({
  title,
  subtitle,
  children,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-solar-600">{eyebrow}</p>
        ) : null}
        <h1 className="text-xl font-bold text-navy-900 sm:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------- Stats */

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "brand",
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  href?: string;
}) {
  const iconTone: Record<Tone, string> = {
    neutral: "bg-slate-100 text-slate-600",
    info: "bg-sky-100 text-sky-700",
    warning: "bg-amber-100 text-amber-700",
    success: "bg-emerald-100 text-emerald-700",
    danger: "bg-rose-100 text-rose-700",
    brand: "bg-navy-100 text-navy-700",
    purple: "bg-violet-100 text-violet-700",
  };
  const body = (
    <div className="card flex items-start justify-between gap-2 p-4 transition hover:border-slate-300 sm:gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-500 sm:text-[11px] sm:tracking-wider">{label}</p>
        <p className="mt-1.5 text-base font-bold leading-tight tracking-tight text-navy-900 tabular-nums sm:text-lg xl:text-2xl">{value}</p>
        {hint ? <p className="mt-1 text-[10px] leading-snug text-slate-500 sm:text-[11px]">{hint}</p> : null}
      </div>
      {icon ? <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg sm:h-10 sm:w-10", iconTone[tone])}>{icon}</span> : null}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

/* ------------------------------------------------------------------- Forms */

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="label">
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
      {!error && hint ? <p className="mt-1 text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  );
}

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={cn("input", props.className)} />;
}

export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={cn("select", props.className)} />;
}

export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea {...props} className={cn("input min-h-[84px]", props.className)} />;
}

/* ------------------------------------------------------------------- Table */

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      {icon ? <div className="mb-1 grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">{icon}</div> : null}
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description ? <p className="max-w-sm text-xs text-slate-500">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function Avatar({ name, src, size = 36 }: { name: string; src?: string | null; size?: number }) {
  const text = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full object-cover ring-2 ring-white"
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      className="grid shrink-0 place-items-center rounded-full bg-navy-100 font-bold text-navy-700 ring-2 ring-white"
    >
      {text || "?"}
    </span>
  );
}

export function Progress({ value, tone = "success" }: { value: number; tone?: "success" | "warning" | "danger" | "brand" }) {
  const colors = {
    success: "bg-solar-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    brand: "bg-navy-600",
  };
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={cn("h-full rounded-full transition-all", colors[tone])} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-slate-100", className)} />;
}

export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{children}</h3>
      {hint ? <span className="text-[11px] text-slate-400">{hint}</span> : null}
    </div>
  );
}

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warning" | "danger" | "success";
  title?: string;
  children: ReactNode;
}) {
  const map = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    danger: "border-rose-200 bg-rose-50 text-rose-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };
  return (
    <div className={cn("rounded-lg border px-4 py-3 text-xs leading-relaxed", map[tone])}>
      {title ? <p className="mb-0.5 text-sm font-bold">{title}</p> : null}
      {children}
    </div>
  );
}
