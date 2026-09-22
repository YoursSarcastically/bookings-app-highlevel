/* Book or walk-in: client → service → person → add-ons → day → time → repeat. Same slots the public page shows. */
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { dayLabel, first, fmtT, money, nextDays, slots, sum, today } from "@/lib/format";
import type { State } from "@/lib/types";
import { Avatar, Field, Sel } from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface BookPreset {
  walkin?: boolean | undefined;
  clientId?: string | undefined;
  date?: string | undefined;
  staffId?: string | undefined;
  time?: string | undefined;
  serviceId?: string | undefined;
}

export default function BookDialog({
  open,
  onClose,
  preset,
}: {
  open: boolean;
  onClose: () => void;
  preset: BookPreset;
}) {
  const { S, act, L } = useStore();
  const [client, setClient] = useState<string | null>(preset.clientId ?? null);
  const [q, setQ] = useState("");
  const [svcId, setSvcId] = useState<string | undefined>(preset.serviceId ?? S?.services[0]?.id);
  const [staffId, setStaffId] = useState<string | null>(preset.staffId ?? null);
  const [date, setDate] = useState(preset.date ?? today());
  const [time, setTime] = useState<string | null>(preset.time ?? null);
  const [addons, setAddons] = useState<string[]>([]);
  const [repeat, setRepeat] = useState("0");
  const [count, setCount] = useState("8");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const sv = S?.services.find((v) => v.id === svcId) ?? S?.services[0];
  const cands = S && sv ? S.staff.filter((s) => sv.staff.includes(s.id)) : [];
  const st = S?.staff.find((s) => s.id === staffId) ?? cands[0];
  const sl = useMemo(() => (S && sv && st ? slots(S, sv, st.id, date) : []), [S, sv, st, date]);
  if (!S || !sv) return null;
  const found = q.trim()
    ? S.clients
        .filter(
          (c) => c.name.toLowerCase().includes(q.toLowerCase()) || (c.phone || "").includes(q),
        )
        .slice(0, 4)
    : [];
  const cli = S.clients.find((c) => c.id === client);
  const extra = sum(
    sv.addons.filter((x) => addons.includes(x.name)),
    (x) => +x.price || 0,
  );
  const canSave = !!cli && (preset.walkin || !!time);

  const save = async () => {
    setBusy(true);
    if (preset.walkin) {
      const r = await act(
        () =>
          api.post<{ id: string; staff_id: string; state: State }>(L("/appointments"), {
            walkin: true,
            service_id: sv.id,
            staff_id: st?.id ?? null,
            client_id: client,
            addons,
          }),
        (r) =>
          `${cli?.name} checked in with ${first(r.state.staff.find((s) => s.id === r.staff_id)?.name ?? "")}`,
      );
      if (r) onClose();
    } else {
      const body: Record<string, unknown> = {
        service_id: sv.id,
        staff_id: st?.id ?? null,
        client_id: client,
        date,
        time,
        source: "phone",
        addons,
        notes,
      };
      if (repeat !== "0") body["repeat"] = { every_weeks: +repeat, count: +count };
      const r = await act(
        () =>
          api.post<{ series?: { made: string[]; skipped: string[] } }>(L("/appointments"), body),
        (r) =>
          r.series
            ? `Booked ${1 + r.series.made.length} appointments${r.series.skipped.length ? ` · ${r.series.skipped.length} dates were not free` : ""}`
            : "Booked · confirmation sent",
      );
      if (r) onClose();
    }
    setBusy(false);
  };
  const newClient = async () => {
    const r = await act(
      () => api.post<{ id: string; state: State }>(L("/clients"), { name: q.trim() }),
      "Client created",
    );
    if (r) {
      setClient(r.id);
      setQ("");
    }
  };
  const addWaitlist = async () => {
    const r = await act(
      () =>
        api.post(L("/waitlist"), {
          client_id: client,
          service_id: sv.id,
          staff_id: st?.id ?? null,
          date,
        }),
      "Added to the waitlist",
    );
    if (r) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-[580px] overflow-auto">
        <DialogHeader>
          <DialogTitle>{preset.walkin ? "Walk-in" : "Book"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Field label="Client">
            {cli ? (
              <div className="flex items-center gap-2">
                <Avatar name={cli.name} />
                <b>{cli.name}</b>
                {cli.card && <span className="tag">card •••• {cli.card.last4}</span>}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={() => setClient(null)}
                >
                  change
                </Button>
              </div>
            ) : (
              <>
                <Input
                  autoFocus
                  placeholder="Search or type a new name"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                {found.length ? (
                  <div className="mt-1 flex flex-col gap-1">
                    {found.map((c) => (
                      <button
                        key={c.id}
                        className="optbtn"
                        onClick={() => {
                          setClient(c.id);
                          setQ("");
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <Avatar name={c.name} />
                          {c.name}
                        </span>
                        <span className="text-xs text-muted-foreground">{c.visits} visits</span>
                      </button>
                    ))}
                  </div>
                ) : q.trim() ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-1 self-start"
                    onClick={newClient}
                  >
                    ＋ New client “{q.trim()}”
                  </Button>
                ) : null}
              </>
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Field label="Service">
              <Sel
                value={sv.id}
                onChange={(e) => {
                  setSvcId(e.target.value);
                  setTime(null);
                  setAddons([]);
                }}
              >
                {S.services.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} · {v.dur} min · {money(v.price)}
                  </option>
                ))}
              </Sel>
            </Field>
            <Field label={S.vocab.staffOne.replace(/^\w/, (c) => c.toUpperCase())}>
              <Sel
                value={st?.id ?? ""}
                onChange={(e) => {
                  setStaffId(e.target.value);
                  setTime(null);
                }}
              >
                {cands.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Sel>
            </Field>
          </div>
          {sv.addons.length > 0 && (
            <Field label="Add-ons">
              <div className="flex flex-wrap gap-1.5">
                {sv.addons.map((x) => (
                  <button
                    key={x.name}
                    className={cn("chipbtn", addons.includes(x.name) && "chipbtn-on")}
                    onClick={() => {
                      setAddons(
                        addons.includes(x.name)
                          ? addons.filter((n) => n !== x.name)
                          : [...addons, x.name],
                      );
                      setTime(null);
                    }}
                  >
                    {x.name} · {money(x.price)}
                    {x.min ? ` · +${x.min}m` : ""}
                  </button>
                ))}
              </div>
            </Field>
          )}
          {!preset.walkin && (
            <>
              <Field label="Day">
                <div className="flex flex-wrap gap-1.5">
                  {nextDays(7).map((x, i) => (
                    <button
                      key={x}
                      className={cn("slotbtn", x === date && "slotbtn-on")}
                      onClick={() => {
                        setDate(x);
                        setTime(null);
                      }}
                    >
                      {dayLabel(x, i)}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Time">
                {sl.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {sl.map((t) => (
                      <button
                        key={t}
                        className={cn("slotbtn", time === t && "slotbtn-on")}
                        onClick={() => setTime(t)}
                      >
                        {fmtT(t)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    No openings for {st ? first(st.name) : "anyone"} that day
                    {S.policy.waitlist && cli && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs"
                        onClick={addWaitlist}
                      >
                        Add to waitlist
                      </Button>
                    )}
                  </div>
                )}
              </Field>
              <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                <Field label="Repeat">
                  <Sel value={repeat} onChange={(e) => setRepeat(e.target.value)}>
                    <option value="0">Does not repeat</option>
                    <option value="1">Every week</option>
                    <option value="2">Every 2 weeks</option>
                    <option value="4">Every 4 weeks</option>
                  </Sel>
                </Field>
                {repeat !== "0" ? (
                  <Field label="Times">
                    <Sel value={count} onChange={(e) => setCount(e.target.value)}>
                      {[4, 8, 12, 26].map((n) => (
                        <option key={n} value={n}>
                          {n} more
                        </option>
                      ))}
                    </Sel>
                  </Field>
                ) : (
                  <Field label="Note">
                    <Input
                      placeholder={`Anything the ${S.vocab.staffOne} should know`}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </Field>
                )}
              </div>
              {sv.deposit > 0 && (
                <div className="rounded-lg bg-accent px-3 py-2 text-xs text-accent-foreground">
                  {money(sv.deposit)} deposit{" "}
                  {cli?.card
                    ? "will be charged to the card on file"
                    : "· add a card on file to take it now"}
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter className="items-center sm:justify-between">
          <span className="num text-xs text-muted-foreground">
            {money(sv.price + extra)}
            {extra ? " incl. add-ons" : ""}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={!canSave || busy} onClick={save}>
              {preset.walkin ? "Check in now" : `Book${time ? ` · ${fmtT(time)}` : ""}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
