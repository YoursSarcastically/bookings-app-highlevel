/* Front desk: one list of what is left today, in order, with check-in and pay one tap away. */
import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import {
  activePass,
  classesOn,
  first,
  fmtD,
  fmtT,
  isLate,
  mins,
  money,
  nowMins,
  sum,
  today,
} from "@/lib/format";
import type { Appt, Klass } from "@/lib/types";
import { Avatar, Card, Empty, Kpi, PageHead, Tag } from "@/components/app/Bits";
import { useOverlays } from "@/components/app/Overlays";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/frontdesk")({
  head: () => ({ meta: [{ title: "Front desk — Bookings" }] }),
  component: FrontDesk,
});

function FrontDesk() {
  const { S, act, L } = useStore();
  const ov = useOverlays();
  if (!S) return null;
  const T = today();
  const all = S.appts.filter((a) => a.date === T && a.status !== "cancelled");
  const sales = S.sales.filter((x) => x.date === T);
  const live = all.filter((a) => ["booked", "arrived"].includes(a.status));
  const done = all
    .filter((a) => ["done", "noshow"].includes(a.status))
    .sort((a, b) => (a.time < b.time ? 1 : -1));
  const cls = classesOn(S, T).filter((c) => mins(c.time) + c.dur >= nowMins() - 30);
  const rows: { t: string; a?: Appt; c?: Klass }[] = [
    ...live.map((a) => ({ t: a.status === "arrived" ? "00:00" : a.time, a })),
    ...cls.map((c) => ({ t: c.time, c })),
  ].sort((x, y) => (x.t < y.t ? -1 : 1));
  const wl = S.waitlist.filter((w) => w.date === T && w.status !== "booked");
  const inStaff = S.staff.filter((x) => x.clockIn).length;

  const Row = ({ a }: { a: Appt }) => {
    const c = S.clients.find((x) => x.id === a.clientId),
      sv = S.services.find((x) => x.id === a.serviceId),
      st = S.staff.find((x) => x.id === a.staffId);
    if (!c || !sv || !st) return null;
    const late = isLate(a);
    const p = activePass(S, c, sv);
    return (
      <div className="item item-link" onClick={() => ov.appt(a.id)}>
        <span
          className={cn(
            "t-col",
            a.status === "arrived" && "font-semibold text-success",
            late && "font-semibold text-destructive",
          )}
        >
          {a.status === "arrived" ? "here" : late ? "late" : fmtT(a.time)}
        </span>
        <Avatar name={c.name} color={st.color} />
        <div className="min-w-0 flex-1 truncate">
          <b className="font-semibold">{c.name}</b>{" "}
          <span className="text-xs text-muted-foreground">
            · {sv.name}
            {a.addons.length
              ? ` + ${a.addons.length} add-on${a.addons.length > 1 ? "s" : ""}`
              : ""}{" "}
            · {first(st.name)}
            {p && (
              <>
                {" "}
                · <span className="text-info">pass</span>
              </>
            )}
            {a.notes && <span title={a.notes}> · note</span>}
          </span>
        </div>
        {c.card && <Tag title="Card on file">•••• {c.card.last4}</Tag>}
        <span className="num text-xs text-muted-foreground">
          {p ? "—" : money(a.total)}
          {a.deposit > 0 && (
            <span className="text-muted-foreground/70"> ({money(a.deposit)} paid)</span>
          )}
        </span>
        {a.status === "booked" ? (
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              void act(() => api.post(L(`/appointments/${a.id}/checkin`)), `${c.name} checked in`);
            }}
          >
            Check in
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              ov.pay(a.id);
            }}
          >
            Pay
          </Button>
        )}
      </div>
    );
  };
  const ClassRow = ({ c }: { c: Klass }) => {
    const n = (S.attend[`${c.id}_${T}`] ?? []).length;
    const w = S.waitlist.filter(
      (x) => x.classId === c.id && x.date === T && x.status !== "booked",
    ).length;
    return (
      <div className="item item-link" onClick={() => ov.roster(c.id, T)}>
        <span className="t-col font-semibold text-info">{fmtT(c.time)}</span>
        <div className="min-w-0 flex-1 truncate">
          <b className="font-semibold">{c.name}</b>{" "}
          <span className="text-xs text-muted-foreground">
            · {n}/{c.cap} seats · {first(S.staff.find((s) => s.id === c.staffId)?.name ?? "")}
            {w ? ` · ${w} waiting` : ""}
          </span>
        </div>
        <div className="bar w-[90px]">
          <i style={{ width: `${Math.min(100, (n / c.cap) * 100)}%` }} />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            ov.roster(c.id, T);
          }}
        >
          Roster
        </Button>
      </div>
    );
  };

  return (
    <>
      <PageHead title="Front desk" sub={`${fmtD(T)} · ${S.name}`}>
        <Button variant="outline" onClick={() => ov.book({ walkin: true })}>
          Walk-in
        </Button>
        <Button variant="outline" onClick={ov.newClient}>
          New client
        </Button>
        <Button onClick={() => ov.book()}>Book</Button>
      </PageHead>
      <div className="grid grid-cols-4 gap-2.5 max-md:grid-cols-2">
        <Kpi
          label="Sales today"
          value={money(sum(sales, (x) => x.total + x.tip))}
          sub={`${money(sum(sales, (x) => x.tip))} in tips`}
        />
        <Kpi
          label="Visits"
          value={
            <>
              {done.filter((a) => a.status === "done").length}
              <span className="text-sm font-medium text-muted-foreground"> / {all.length}</span>
            </>
          }
          sub={`${live.length} still to come`}
        />
        <Kpi
          label="Team in"
          value={
            <>
              {inStaff}
              <span className="text-sm font-medium text-muted-foreground"> / {S.staff.length}</span>
            </>
          }
          sub={`${S.vocab.staff.toLowerCase()} clocked in`}
        />
        <Kpi
          label="Online booking"
          sub={wl.length ? `${wl.length} on today’s waitlist` : "no one waiting"}
        >
          <div className="mt-2">
            {S.status === "open" ? (
              <Tag tone="green">open</Tag>
            ) : S.status === "busy" ? (
              <Tag tone="amber">paused today</Tag>
            ) : (
              <Tag tone="red">closed today</Tag>
            )}
          </div>
        </Kpi>
      </div>
      <Card className="overflow-hidden p-0">
        {rows.length ? (
          rows.map((r) =>
            r.a ? <Row key={r.a.id} a={r.a} /> : r.c ? <ClassRow key={r.c.id} c={r.c} /> : null,
          )
        ) : (
          <Empty title="Nothing left today">
            Bookings from the public page land here the moment they are made.
          </Empty>
        )}
      </Card>
      {wl.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="item bg-secondary/60">
            <b>Waitlist today</b>
            <span className="text-xs text-muted-foreground">· {wl.length} waiting</span>
          </div>
          {wl.map((w) => {
            const c = S.clients.find((x) => x.id === w.clientId);
            const target = w.classId
              ? S.classes.find((x) => x.id === w.classId)
              : S.services.find((x) => x.id === w.serviceId);
            return (
              <div key={w.id} className="item">
                <span className="t-col">
                  {w.status === "offered" ? <Tag tone="amber">offered</Tag> : "waiting"}
                </span>
                <div className="min-w-0 flex-1 truncate">
                  <b>{c?.name}</b>{" "}
                  <span className="text-xs text-muted-foreground">
                    · {target?.name || "any opening"}
                    {w.staffId &&
                      ` with ${first(S.staff.find((s) => s.id === w.staffId)?.name ?? "")}`}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    w.classId
                      ? void act(
                          () => api.post(L(`/waitlist/${w.id}/book`)),
                          "Checked in from the waitlist",
                        )
                      : ov.book({
                          clientId: w.clientId,
                          serviceId: w.serviceId ?? undefined,
                          staffId: w.staffId ?? undefined,
                          date: w.date,
                        })
                  }
                >
                  Book now
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => act(() => api.del(L(`/waitlist/${w.id}`)))}
                >
                  Remove
                </Button>
              </div>
            );
          })}
        </Card>
      )}
      {done.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none py-2 text-[13px] font-medium text-muted-foreground">
            Done today · {done.length} ·{" "}
            {money(
              sum(
                sales.filter((s) => s.appointmentId),
                (x) => x.total + x.tip,
              ),
            )}
          </summary>
          <Card className="overflow-hidden p-0">
            {done.map((a) => {
              const c = S.clients.find((x) => x.id === a.clientId),
                sv = S.services.find((x) => x.id === a.serviceId);
              return (
                <div key={a.id} className="item item-link" onClick={() => ov.appt(a.id)}>
                  <span className={cn("t-col", a.status === "noshow" && "text-destructive")}>
                    {a.status === "done" ? "paid" : "no-show"}
                  </span>
                  <div className="min-w-0 flex-1 truncate">
                    <b>{c?.name}</b>{" "}
                    <span className="text-xs text-muted-foreground">
                      · {sv?.name} · {fmtT(a.time)}
                    </span>
                  </div>
                  <span className="num text-xs text-muted-foreground">
                    {a.status === "done"
                      ? `${a.total ? money(a.total) : "pass"}${a.tip ? ` + ${money(a.tip)}` : ""}`
                      : a.fee
                        ? `fee ${money(a.fee)}`
                        : ""}
                  </span>
                </div>
              );
            })}
          </Card>
        </details>
      )}
    </>
  );
}
