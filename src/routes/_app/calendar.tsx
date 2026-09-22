/* Calendar: day view (a lane per person, now-line, blocks, classes, click an empty slot to book) and week view. */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import {
  DAYS,
  addDays,
  blocksFor,
  classesOn,
  dow,
  endOf,
  first,
  fmtD,
  fmtT,
  isLate,
  mins,
  nowMins,
  parse,
  today,
  tstr,
} from "@/lib/format";
import type { State } from "@/lib/types";
import { Avatar, Confirm, PageHead, Seg } from "@/components/app/Bits";
import { BlockDialog } from "@/components/app/Dialogs";
import { useOverlays } from "@/components/app/Overlays";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Bookings" }] }),
  component: Calendar,
});

const H = 48;
function Calendar() {
  const { S, act, L } = useStore();
  const ov = useOverlays();
  const [d, setD] = useState(today());
  const [view, setView] = useState<"day" | "week">("day");
  const [weekStart, setWeekStart] = useState(today());
  const [block, setBlock] = useState(false);
  const [rmBlock, setRmBlock] = useState<string | null>(null);
  if (!S) return null;
  const count = (x: string) =>
    S.appts.filter((a) => a.date === x && a.status !== "cancelled").length;
  const b = S.blocks.find((x) => x.id === rmBlock);
  return (
    <>
      <PageHead
        title="Calendar"
        sub={
          view === "day" ? `${fmtD(d)} · ${count(d)} appointments` : `Week of ${fmtD(weekStart)}`
        }
      >
        <Seg
          value={view}
          options={[
            ["day", "Day"],
            ["week", "Week"],
          ]}
          onChange={setView}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            const w = addDays(weekStart, -7);
            setWeekStart(w);
            setD(w);
          }}
        >
          ‹
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setWeekStart(today());
            setD(today());
          }}
        >
          Today
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            const w = addDays(weekStart, 7);
            setWeekStart(w);
            setD(w);
          }}
        >
          ›
        </Button>
        <Button variant="outline" onClick={() => setBlock(true)}>
          Block time
        </Button>
        <Button onClick={() => ov.book({ date: d })}>Book</Button>
      </PageHead>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((x) => (
          <button
            key={x}
            onClick={() => {
              setD(x);
              setView("day");
            }}
            className={cn("chipbtn", x === d && "chipbtn-on")}
          >
            {x === today() ? "Today" : `${DAYS[dow(x)]} ${parse(x).getDate()}`}
            {count(x) ? (
              <span
                className={cn(
                  "text-[11px]",
                  x === d ? "text-background/70" : "text-muted-foreground",
                )}
              >
                {count(x)}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      {view === "day" ? (
        <DayGrid S={S} d={d} onBlock={setRmBlock} />
      ) : (
        <WeekGrid
          S={S}
          start={weekStart}
          onDay={(x) => {
            setD(x);
            setView("day");
          }}
        />
      )}
      {block && <BlockDialog date={d} onClose={() => setBlock(false)} />}
      {b && (
        <Confirm
          title={b.reason}
          body={`${b.staffId ? S.staff.find((s) => s.id === b.staffId)?.name : "Everyone"} · ${fmtD(b.date)}${b.kind === "block" ? ` · ${fmtT(b.start)}–${fmtT(b.end)}` : " · all day"}`}
          action="Remove"
          onClose={() => setRmBlock(null)}
          onConfirm={() => act(() => api.del(L(`/blocks/${b.id}`)))}
        />
      )}
    </>
  );
}

function DayGrid({ S, d, onBlock }: { S: State; d: string; onBlock: (id: string) => void }) {
  const ov = useOverlays();
  const wrap = useRef<HTMLDivElement>(null);
  const isToday = d === today();
  const w = dow(d);
  const { start, rows, classes, appts } = useMemo(() => {
    const hours = S.staff.map((s) => s.hours[String(w)]).filter((h): h is [string, string] => !!h);
    const classes = classesOn(S, d);
    const appts = S.appts.filter((a) => a.date === d && a.status !== "cancelled");
    let start = hours.length ? Math.min(...hours.map((h) => mins(h[0]))) : mins(S.rules.open),
      end = hours.length ? Math.max(...hours.map((h) => mins(h[1]))) : mins(S.rules.close);
    classes.forEach((c) => {
      start = Math.min(start, Math.floor(mins(c.time) / 30) * 30);
      end = Math.max(end, Math.ceil((mins(c.time) + c.dur) / 30) * 30);
    });
    appts.forEach((a) => {
      start = Math.min(start, Math.floor(mins(a.time) / 30) * 30);
      end = Math.max(end, Math.ceil(mins(endOf(S, a)) / 30) * 30);
    });
    const rows: number[] = [];
    for (let m = start; m < end; m += 30) rows.push(m);
    return { start, end, rows, classes, appts };
  }, [S, d, w]);
  const px = (m: number) => ((m - start) / 30) * H;
  useEffect(() => {
    if (isToday && wrap.current) wrap.current.scrollTop = Math.max(0, px(nowMins()) - 160);
  }, [d]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div ref={wrap} className="relative max-h-[70vh] overflow-auto rounded-xl border bg-card">
      <div
        className="grid"
        style={{ gridTemplateColumns: `52px repeat(${S.staff.length}, minmax(150px, 1fr))` }}
      >
        <div className="sticky top-0 left-0 z-[5] border-r border-b bg-card" />
        {S.staff.map((st) => {
          const h = st.hours[String(w)];
          const mine = appts.filter((a) => a.staffId === st.id);
          return (
            <div
              key={st.id}
              className="sticky top-0 z-[4] flex min-h-[44px] items-center gap-2 border-b bg-card px-2.5 py-2 text-[12.5px] font-semibold"
            >
              <Avatar name={st.name} color={st.color} />
              <div className="min-w-0">
                <div className="truncate">
                  {st.name}
                  {st.clockIn && isToday && (
                    <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-success" />
                  )}
                </div>
                <span className="text-[11.5px] font-normal text-muted-foreground">
                  {h ? `${fmtT(h[0])}–${fmtT(h[1])} · ${mine.length}` : "off"}
                </span>
              </div>
            </div>
          );
        })}
        <div className="sticky left-0 z-[3] border-r bg-card">
          {rows.map((m) => (
            <div
              key={m}
              className="num h-12 -translate-y-[7px] px-1.5 text-right text-[11px] text-muted-foreground"
            >
              {m % 60 === 0 ? fmtT(tstr(m)) : ""}
            </div>
          ))}
        </div>
        {S.staff.map((st) => {
          const h = st.hours[String(w)];
          return (
            <div
              key={st.id}
              className={cn("relative border-r", !h && "bg-secondary")}
              style={{
                height: rows.length * H,
                backgroundImage: h
                  ? "repeating-linear-gradient(to bottom, transparent 0 47px, var(--border) 47px 48px)"
                  : undefined,
              }}
              onClick={(e) => {
                if (e.target !== e.currentTarget) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const m = start + Math.floor((e.clientY - rect.top) / H) * 30;
                ov.book({ staffId: st.id, date: d, time: tstr(m) });
              }}
            >
              {h ? (
                <>
                  <div
                    className="pointer-events-none absolute inset-x-0 bg-secondary"
                    style={{ top: 0, height: px(mins(h[0])) }}
                  />
                  <div
                    className="pointer-events-none absolute inset-x-0 bg-secondary"
                    style={{
                      top: px(mins(h[1])),
                      height: Math.max(0, rows.length * H - px(mins(h[1]))),
                    }}
                  />
                </>
              ) : (
                <div className="p-2 text-[11px] text-muted-foreground">Day off</div>
              )}
              {blocksFor(S, st.id, d).map((b) => (
                <div
                  key={b.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onBlock(b.id);
                  }}
                  className="absolute inset-x-[3px] cursor-pointer rounded-md border border-dashed px-2 py-1 text-[11px] text-muted-foreground"
                  style={{
                    top: px(Math.max(start, mins(b.start))) + 2,
                    height: Math.max(
                      20,
                      px(Math.min(start + rows.length * 30, mins(b.end))) -
                        px(Math.max(start, mins(b.start))) -
                        4,
                    ),
                    backgroundImage:
                      "repeating-linear-gradient(135deg, var(--secondary) 0 6px, transparent 6px 12px)",
                  }}
                >
                  {b.reason}
                </div>
              ))}
              {appts
                .filter((a) => a.staffId === st.id)
                .map((a) => {
                  const sv = S.services.find((x) => x.id === a.serviceId),
                    c = S.clients.find((x) => x.id === a.clientId);
                  const late = isLate(a);
                  const dur = mins(endOf(S, a)) - mins(a.time);
                  return (
                    <div
                      key={a.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        ov.appt(a.id);
                      }}
                      className={cn(
                        "absolute inset-x-[3px] cursor-pointer overflow-hidden rounded-md border border-l-[3px] bg-card px-2 py-1 text-xs hover:border-muted-foreground",
                        a.status === "arrived" && "bg-success-soft",
                        late && "bg-danger-soft",
                        a.status === "done" && "opacity-60",
                      )}
                      style={{
                        top: px(mins(a.time)) + 2,
                        height: (dur / 30) * H - 4,
                        borderLeftColor: st.color,
                      }}
                    >
                      <b className="block truncate">{c?.name}</b>
                      {dur > 30 && (
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {sv?.name} · {fmtT(a.time)}–{fmtT(endOf(S, a))}
                        </span>
                      )}
                      <span
                        className={cn(
                          "absolute top-1 right-1.5 text-[10.5px] font-semibold text-muted-foreground",
                          a.status === "arrived" && "text-success",
                          (late || a.status === "noshow") && "text-destructive",
                        )}
                      >
                        {a.status === "arrived"
                          ? "here"
                          : a.status === "done"
                            ? "paid"
                            : a.status === "noshow"
                              ? "no-show"
                              : late
                                ? "late"
                                : ""}
                      </span>
                    </div>
                  );
                })}
              {classes
                .filter((c) => c.staffId === st.id)
                .map((c) => {
                  const n = (S.attend[`${c.id}_${d}`] ?? []).length;
                  return (
                    <div
                      key={c.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        ov.roster(c.id, d);
                      }}
                      className="absolute inset-x-[3px] cursor-pointer overflow-hidden rounded-md border border-l-[3px] border-l-info bg-info-soft px-2 py-1 text-xs"
                      style={{ top: px(mins(c.time)) + 2, height: (c.dur / 30) * H - 4 }}
                    >
                      <b className="block truncate">{c.name}</b>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {n}/{c.cap} · {fmtT(c.time)}
                      </span>
                    </div>
                  );
                })}
              {isToday && nowMins() >= start && nowMins() <= start + rows.length * 30 && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-[3] h-px bg-destructive"
                  style={{ top: px(nowMins()) }}
                >
                  <i className="absolute -top-[3px] -left-[3px] h-[7px] w-[7px] rounded-full bg-destructive" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({ S, start, onDay }: { S: State; start: string; onDay: (d: string) => void }) {
  const ov = useOverlays();
  return (
    <div className="grid grid-cols-7 gap-2 max-md:grid-cols-2">
      {Array.from({ length: 7 }, (_, i) => addDays(start, i)).map((x) => {
        const w = dow(x);
        const ap = S.appts
          .filter((a) => a.date === x && a.status !== "cancelled")
          .sort((a, b) => (a.time < b.time ? -1 : 1));
        const cl = classesOn(S, x);
        const off = S.blocks.filter((b) => b.date === x && b.kind === "timeoff");
        const items = [
          ...ap.map((a) => ({
            t: a.time,
            el: (
              <div
                key={a.id}
                onClick={() => ov.appt(a.id)}
                className={cn(
                  "cursor-pointer truncate rounded-md border-l-[3px] bg-secondary px-1.5 py-1 text-[11.5px]",
                  a.status === "done" && "opacity-55",
                )}
                style={{ borderLeftColor: S.staff.find((s) => s.id === a.staffId)?.color }}
              >
                {fmtT(a.time).replace(" ", "")} {S.clients.find((c) => c.id === a.clientId)?.name}
              </div>
            ),
          })),
          ...cl.map((c) => ({
            t: c.time,
            el: (
              <div
                key={c.id}
                onClick={() => ov.roster(c.id, x)}
                className="cursor-pointer truncate rounded-md border-l-[3px] border-l-info bg-info-soft px-1.5 py-1 text-[11.5px]"
              >
                {fmtT(c.time).replace(" ", "")} {c.name} · {(S.attend[`${c.id}_${x}`] ?? []).length}
                /{c.cap}
              </div>
            ),
          })),
        ].sort((a, b) => (a.t < b.t ? -1 : 1));
        return (
          <div
            key={x}
            className={cn(
              "flex min-h-[180px] flex-col gap-1.5 rounded-xl border bg-card p-2.5",
              x === today() && "border-primary/40",
            )}
          >
            <h3
              className={cn(
                "flex justify-between text-xs font-semibold text-muted-foreground",
                x === today() && "text-primary",
              )}
            >
              <button className="hover:underline" onClick={() => onDay(x)}>
                {DAYS[w]} {parse(x).getDate()}
              </button>
              <span className="font-normal">{ap.length}</span>
            </h3>
            {off.map((b) => (
              <div key={b.id} className="text-[11px] text-muted-foreground">
                {b.staffId
                  ? first(S.staff.find((s) => s.id === b.staffId)?.name ?? "")
                  : "Everyone"}{" "}
                off
              </div>
            ))}
            {items.length ? (
              items.map((i) => i.el)
            ) : (
              <div className="text-[11px] text-muted-foreground">—</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
