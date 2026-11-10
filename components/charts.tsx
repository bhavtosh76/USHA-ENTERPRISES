import { formatINR } from "@/lib/utils";

/* Lightweight dependency-free SVG charts (server-rendered). */

export function BarChart({
  data,
  height = 180,
  valueFormatter = (v: number) => formatINR(v),
  color = "#197d4b",
}: {
  data: { label: string; value: number }[];
  height?: number;
  valueFormatter?: (v: number) => string;
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = 100 / Math.max(1, data.length);
  return (
    <div className="w-full">
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d) => {
          const h = Math.max(2, (d.value / max) * (height - 28));
          return (
            <div key={d.label} className="group flex flex-1 flex-col items-center justify-end gap-1.5" style={{ minWidth: 0 }}>
              <span className="hidden text-[10px] font-semibold text-slate-600 group-hover:block">
                {valueFormatter(d.value)}
              </span>
              <div
                className="w-full max-w-[42px] rounded-t-md transition-all group-hover:opacity-80"
                style={{ height: h, background: `linear-gradient(180deg, ${color}, ${color}bb)` }}
                title={`${d.label}: ${valueFormatter(d.value)}`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2 border-t border-slate-100 pt-2">
        {data.map((d) => (
          <div key={d.label} className="flex-1 truncate text-center text-[10px] text-slate-500" style={{ minWidth: 0 }}>
            {d.label}
          </div>
        ))}
      </div>
      <span className="sr-only">Bar width {barW}%</span>
    </div>
  );
}

export function LineChart({
  data,
  height = 200,
  color = "#197d4b",
  fill = true,
  valueFormatter = (v: number) => formatINR(v),
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  fill?: boolean;
  valueFormatter?: (v: number) => string;
}) {
  const w = 600;
  const h = height;
  const pad = 8;
  const max = Math.max(1, ...data.map((d) => d.value));
  const step = data.length > 1 ? (w - pad * 2) / (data.length - 1) : 0;
  const points = data.map((d, i) => {
    const x = pad + i * step;
    const y = h - pad - (d.value / max) * (h - pad * 2 - 14);
    return { x, y, ...d };
  });
  const line = points.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;
  const id = `grad-${color.replace("#", "")}`;
  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" preserveAspectRatio="none" role="img">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={0} x2={w} y1={h - pad - f * (h - pad * 2 - 14)} y2={h - pad - f * (h - pad * 2 - 14)} stroke="#eef2f7" strokeWidth="1" />
        ))}
        {fill ? <polygon points={area} fill={`url(#${id})`} /> : null}
        <polyline points={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p) => (
          <g key={p.label}>
            <circle cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke={color} strokeWidth="2" />
            <title>{`${p.label}: ${valueFormatter(p.value)}`}</title>
          </g>
        ))}
      </svg>
      <div className="mt-1 flex justify-between">
        {data.map((d) => (
          <span key={d.label} className="text-[10px] text-slate-500">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Donut({
  segments,
  size = 150,
  thickness = 18,
  centerLabel,
  centerValue,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#eef2f7" strokeWidth={thickness} />
        {total > 0 &&
          segments.map((s) => {
            const len = (s.value / total) * circumference;
            const el = (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${circumference - len}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                strokeLinecap="butt"
              >
                <title>{`${s.label}: ${s.value}`}</title>
              </circle>
            );
            offset += len;
            return el;
          })}
        {centerValue ? (
          <>
            <text x="50%" y="47%" textAnchor="middle" className="fill-navy-900" style={{ fontSize: 18, fontWeight: 700 }}>
              {centerValue}
            </text>
            <text x="50%" y="59%" textAnchor="middle" className="fill-slate-400" style={{ fontSize: 9 }}>
              {centerLabel}
            </text>
          </>
        ) : null}
      </svg>
      <div className="min-w-0 space-y-1.5">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-[11px]">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="truncate text-slate-600">{s.label}</span>
            <span className="ml-auto font-semibold text-slate-800">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
