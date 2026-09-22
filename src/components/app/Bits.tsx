/* Small shared pieces: avatar, status tag, KPI tile, empty state, bar list, page header, confirm dialog, form field. */
import { useState, type ReactNode } from "react";
import { colorFor, initials, isLate } from "@/lib/format";
import type { Appt } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type Tone = "green" | "red" | "amber" | "violet" | "blue";

export function Avatar({
  name,
  color,
  lg,
}: {
  name: string;
  color?: string | null | undefined;
  lg?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full font-semibold text-white",
        lg ? "h-10 w-10 text-sm" : "h-[26px] w-[26px] text-[10px]",
      )}
      style={{ background: color || colorFor(name) }}
    >
      {initials(name)}
    </span>
  );
}
export function Tag({
  tone,
  children,
  className,
  title,
}: {
  tone?: Tone | undefined;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span title={title} className={cn("tag", tone && `tag-${tone}`, className)}>
      {children}
    </span>
  );
}
export function StatusTag({ a }: { a: Appt }) {
  if (a.status === "arrived") return <Tag tone="green">checked in</Tag>;
  if (a.status === "done") return <Tag>paid</Tag>;
  if (a.status === "noshow") return <Tag tone="red">no-show</Tag>;
  if (a.status === "cancelled") return <Tag>cancelled</Tag>;
  return isLate(a) ? <Tag tone="red">late</Tag> : <Tag tone="blue">booked</Tag>;
}
export function Kpi({
  label,
  value,
  sub,
  children,
}: {
  label: string;
  value?: ReactNode;
  sub?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="kpi">
      <div className="l">{label}</div>
      {value !== undefined && <div className="v">{value}</div>}
      {children}
      {sub && <div className="s">{sub}</div>}
    </div>
  );
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-5 py-9 text-center text-[13px] text-muted-foreground">
      <b className="mb-1 block font-semibold text-foreground/80">{title}</b>
      {children}
    </div>
  );
}
export function PageHead({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {sub && <p className="mt-0.5 text-[13px] text-muted-foreground">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-xl border bg-card p-4", className)}>{children}</div>;
}
export function Bars({
  items,
  fmt = (v: number) => String(v),
}: {
  items: [string, number][];
  fmt?: (v: number) => string;
}) {
  const max = Math.max(...items.map((x) => x[1]), 1);
  return (
    <div className="flex flex-col gap-1.5">
      {items.map(([k, v]) => (
        <div key={k}>
          <div className="flex justify-between text-xs">
            <span className="truncate">{k}</span>
            <span className="num text-muted-foreground">{fmt(v)}</span>
          </div>
          <div className="bar">
            <i style={{ width: `${(v / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
/** Segmented control: [value, label] options, one active. */
export function Seg<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex gap-px rounded-lg border bg-card p-0.5">
      {options.map(([k, l]) => (
        <button
          key={String(k)}
          onClick={() => onChange(k)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground",
            value === k && "bg-foreground text-background",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
/** Plain select styled like the inputs. */
export function Sel(p: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...p}
      className={cn("h-8 w-full rounded-lg border bg-card px-2 text-[13px]", p.className)}
    />
  );
}
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string | undefined;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
      {label}
      {hint && <span className="font-normal text-muted-foreground/70"> · {hint}</span>}
      <div className="text-[13px] font-normal text-foreground">{children}</div>
    </label>
  );
}
/** Coloured notice line (policy hints, errors, pass coverage). */
export function Note({
  tone,
  children,
  className,
}: {
  tone: "success" | "danger" | "warning" | "info";
  children: ReactNode;
  className?: string;
}) {
  const cls = {
    success: "bg-success-soft text-success",
    danger: "bg-danger-soft text-danger",
    warning: "bg-warning-soft text-warning",
    info: "bg-info-soft text-info",
  }[tone];
  return <div className={cn("rounded-lg px-3 py-2 text-xs", cls, className)}>{children}</div>;
}

export function Confirm({
  title,
  body,
  action,
  onConfirm,
  onClose,
  destructive = true,
}: {
  title: string;
  body: ReactNode;
  action: string;
  onConfirm: () => Promise<unknown> | void;
  onClose: () => void;
  destructive?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription asChild>
            <div className="text-[13px] text-muted-foreground">{body}</div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onConfirm();
              setBusy(false);
              onClose();
            }}
          >
            {action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
