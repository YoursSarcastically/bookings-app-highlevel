/* Insights: revenue, visits, retention, sources, class fill, lapsed clients. Charts via recharts (already in the template). */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useStore } from "@/lib/store";
import { getInsights } from "@/lib/api";
import { fmtD, money } from "@/lib/format";
import type { Insights } from "@/lib/types";
import { Avatar, Bars, Card, Empty, Kpi, PageHead, Seg } from "@/components/app/Bits";
import { useOverlays } from "@/components/app/Overlays";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/insights")({
  head: () => ({ meta: [{ title: "Insights — Bookings" }] }),
  component: InsightsPage,
});

function InsightsPage() {
  const { S } = useStore();
  const ov = useOverlays();
  const [days, setDays] = useState(30);
  const [I, setI] = useState<Insights | null>(null);
  const id = S?.id;
  useEffect(() => {
    if (id)
      getInsights(id, days)
        .then(setI)
        .catch(() => setI(null));
  }, [id, days]);
  if (!S) return null;
  const seg = (
    <Seg
      value={days}
      options={[
        [7, "7 days"],
        [30, "30 days"],
        [90, "90 days"],
      ]}
      onChange={setDays}
    />
  );
  if (!I)
    return (
      <PageHead title="Insights" sub="Loading…">
        {seg}
      </PageHead>
    );
  const src = Object.entries(I.by_source).sort((a, b) => b[1] - a[1]) as [string, number][];
  return (
    <>
      <PageHead title="Insights" sub={`Last ${days} days · ${S.name}`}>
        {seg}
      </PageHead>
      <div className="grid grid-cols-4 gap-2.5 max-md:grid-cols-2">
        <Kpi label="Revenue" value={money(I.revenue)} sub={`avg ticket ${money(I.avg_ticket)}`} />
        <Kpi
          label="Visits"
          value={I.visits}
          sub={`${I.unique_clients} clients · ${I.returning} returned`}
        />
        <Kpi
          label="No-show rate"
          value={`${I.noshow_rate}%`}
          sub={
            I.noshow_rate > 10 ? (
              <span className="text-destructive">worth a deposit policy</span>
            ) : (
              "healthy"
            )
          }
        />
        <Kpi
          label="Memberships"
          value={I.active_memberships}
          sub={`${money(I.mrr)} monthly recurring`}
        />
      </div>
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Revenue by day</h2>
          <span className="num text-xs text-muted-foreground">{money(I.revenue)}</span>
        </div>
        <div className="mt-2 h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={I.revenue_by_day} margin={{ top: 6, right: 4, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) => fmtD(d).slice(4)}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `$${v}`}
              />
              <Tooltip
                formatter={(v) => money(Number(v))}
                labelFormatter={(d) => fmtD(String(d))}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--primary)"
                strokeWidth={1.5}
                fill="url(#rev)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <div className="grid grid-cols-3 gap-3.5 max-lg:grid-cols-2 max-md:grid-cols-1">
        <Card>
          <h2 className="mb-2 text-[15px] font-semibold">Where bookings come from</h2>
          {src.length ? <Bars items={src} /> : <Empty title="No bookings yet" />}
        </Card>
        <Card>
          <h2 className="mb-2 text-[15px] font-semibold">Top services</h2>
          {I.top_services.length ? (
            <Bars items={I.top_services} />
          ) : (
            <Empty title="No paid visits yet" />
          )}
        </Card>
        <Card>
          <h2 className="mb-2 text-[15px] font-semibold">Revenue by {S.vocab.staffOne}</h2>
          {I.by_staff.length ? <Bars items={I.by_staff} fmt={money} /> : <Empty title="—" />}
        </Card>
      </div>
      <div className="grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
        {I.class_fill.length ? (
          <Card>
            <h2 className="text-[15px] font-semibold">Class fill rate</h2>
            <div className="mb-2 text-xs text-muted-foreground">Seats filled over classes held</div>
            <Bars
              items={I.class_fill.map((c) => [c.name, c.rate] as [string, number])}
              fmt={(v) => `${v}%`}
            />
          </Card>
        ) : (
          <Card>
            <h2 className="mb-2 text-[15px] font-semibold">Payment methods</h2>
            <Bars items={I.by_method} fmt={money} />
          </Card>
        )}
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Lapsed clients</h2>
            <span className="text-xs text-muted-foreground">
              {I.lapsed_count} with no visit in 45 days
            </span>
          </div>
          {I.lapsed.length ? (
            <div className="mt-1.5">
              {I.lapsed.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between border-b py-1.5 text-xs last:border-b-0"
                >
                  <button
                    className="flex items-center gap-2 hover:underline"
                    onClick={() => ov.client(l.id)}
                  >
                    <Avatar name={l.name} />
                    {l.name}
                  </button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-xs"
                    onClick={() => ov.book({ clientId: l.id })}
                  >
                    Book
                  </Button>
                </div>
              ))}
              {S.hl.linked && (
                <div className="mt-2 text-[11.5px] text-muted-foreground">
                  Email them all from HighLevel → Tools → Email lapsed clients.
                </div>
              )}
            </div>
          ) : (
            <Empty title="Everyone has been in recently" />
          )}
        </Card>
      </div>
    </>
  );
}
