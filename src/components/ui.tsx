import {
  ArrowDown,
  ArrowUpRight,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" to="/" aria-label="Tradexa home">
      <span className="brand-mark">
        <img src="/tradexa-logo.png" alt="" width="32" height="32" />
      </span>
      {!compact && (
        <span>
          tradexa<span className="brand-dot">.</span>
        </span>
      )}
    </Link>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "blue" | "amber" | "red";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function SectionTitle({
  eyebrow,
  title,
  detail,
}: {
  eyebrow?: string;
  title: string;
  detail?: string;
}) {
  return (
    <div className="section-title">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      {detail && <p>{detail}</p>}
    </div>
  );
}
export function Chart({
  values,
  preview = false,
  labels = true,
}: {
  values: number[];
  preview?: boolean;
  labels?: boolean;
}) {
  if (values.length < 2)
    return (
      <div className="chart-empty">
        <span className="empty-chart-icon">&#8769;</span>
        <strong>Your story starts here</strong>
        <p>
          Your portfolio performance will appear when account data is available.
        </p>
      </div>
    );
  const min = Math.min(...values),
    range = Math.max(...values) - min || 1;
  const points = values.map(
    (v, i) =>
      `${((i / (values.length - 1)) * 760).toFixed(2)},${(165 - ((v - min) / range) * 130).toFixed(2)}`,
  );
  const path = `M${points.join(" L")}`;
  return (
    <div className="chart-wrap">
      <svg
        viewBox="0 0 760 190"
        role="img"
        aria-label={
          preview
            ? "Illustrative portfolio curve, sample data"
            : "Portfolio performance chart"
        }
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient
            id={preview ? "preview-fill" : "portfolio-fill"}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor="#4f8cff" stopOpacity=".25" />
            <stop offset="100%" stopColor="#4f8cff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[30, 75, 120, 165].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="760"
            y2={y}
            stroke="#22304b"
            strokeDasharray="4 5"
          />
        ))}
        <path
          d={`${path} L760,190 L0,190 Z`}
          fill={`url(#${preview ? "preview-fill" : "portfolio-fill"})`}
        />
        <path
          d={path}
          fill="none"
          stroke="#6e9eff"
          strokeWidth="2.8"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {labels && (
        <div className="chart-labels">
          <span>Start of period</span>
          <span>{preview ? "Illustrative preview" : "Latest snapshot"}</span>
        </div>
      )}
    </div>
  );
}
export function AssetIcon({ symbol }: { symbol: string }) {
  const values: Record<string, [string, string]> = {
    BTC: ["\u20bf", "orange"],
    ETH: ["\u039e", "violet"],
    XAU: ["Au", "gold"],
    XAG: ["Ag", "silver"],
    WTI: ["\u25c9", "blue"],
    SOL: ["\u25ce", "green"],
  };
  const [text, color] = values[symbol] ?? [symbol.slice(0, 2), "blue"];
  return <span className={`asset-icon ${color}`}>{text}</span>;
}
export function Change({ value }: { value: number }) {
  return (
    <span className={value >= 0 ? "positive change" : "negative change"}>
      {value >= 0 ? <ArrowUpRight size={14} /> : <ArrowDown size={14} />}{" "}
      {Math.abs(value).toFixed(2)}%
    </span>
  );
}
export function Empty({
  title,
  detail,
  icon,
}: {
  title: string;
  detail: string;
  icon?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon || <ShieldCheck size={30} />}
      <h3>{title}</h3>
      <p>{detail}</p>
    </div>
  );
}
export function PageHeading({
  label,
  title,
  detail,
  action,
}: {
  label?: string;
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {label && <div className="eyebrow">{label}</div>}
        <h1>{title}</h1>
        {detail && <p>{detail}</p>}
      </div>
      {action}
    </div>
  );
}
export function TextLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <Link className="text-link" to={to}>
      {children}
      <ChevronRight size={15} />
    </Link>
  );
}
