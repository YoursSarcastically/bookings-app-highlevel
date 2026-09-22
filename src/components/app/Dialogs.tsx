/* Roster (class check-in with spots and waitlist), Block time, Gift card. */
import { useState } from "react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { activePass, dayLabel, fmtT, money, nextDays, rel, today } from "@/lib/format";
import { Avatar, Field, Note, Sel } from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function RosterDialog({
  classId,
  date,
  onClose,
}: {
  classId: string;
  date: string;
  onClose: () => void;
}) {
  const { S, act, L } = useStore();
  const [q, setQ] = useState("");
  const [spot, setSpot] = useState<number | null>(null);
  if (!S) return null;
  const c = S.classes.find((x) => x.id === classId);
  if (!c) return null;
  const k = `${c.id}_${date}`;
  const at = S.attend[k] ?? [];
  const spots = S.spots?.[k] ?? {};
  const found = q
    ? S.clients
        .filter((x) => x.name.toLowerCase().includes(q.toLowerCase()) && !at.includes(x.id))
        .slice(0, 4)
    : [];
  const wl = S.waitlist.filter(
    (w) => w.classId === c.id && w.date === date && w.status !== "booked",
  );
  const st = S.staff.find((s) => s.id === c.staffId);
  const nameOf = (id: string) => S.clients.find((x) => x.id === id)?.name ?? "";
  const add = (cid: string) =>
    act(
      () =>
        api.post<{ pass_used: boolean }>(L(`/classes/${c.id}/attendance`), {
          client_id: cid,
          date,
          spot,
        }),
      (r) => `${nameOf(cid)} checked in${r.pass_used ? " · pass" : ` · ${money(c.price)}`}`,
    ).then(() => {
      setQ("");
      setSpot(null);
    });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{c.name}</DialogTitle>
          <DialogDescription>
            {rel(date)} · {fmtT(c.time)} · {st?.name} · {at.length}/{c.cap} seats
          </DialogDescription>
        </DialogHeader>
        {c.spots && (
          <>
            <div className="grid grid-cols-6 gap-1.5">
              {Array.from({ length: c.cap }, (_, i) => i + 1).map((n) => {
                const owner = Object.entries(spots).find(([, sp]) => sp === n);
                return (
                  <button
                    key={n}
                    disabled={!!owner}
                    title={owner ? nameOf(owner[0]) : `Spot ${n}`}
                    onClick={() => setSpot(n)}
                    className={cn(
                      "h-[34px] rounded-md border bg-card text-xs font-semibold",
                      owner && "cursor-not-allowed bg-secondary text-muted-foreground/50",
                      spot === n && "border-primary bg-primary text-primary-foreground",
                    )}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <div className="text-[11.5px] text-muted-foreground">
              {spot
                ? `Spot ${spot} selected for the next check-in`
                : "Pick a spot, then check someone in"}
            </div>
          </>
        )}
        <div className="flex flex-col gap-1">
          {at.map((cid) => {
            const x = S.clients.find((y) => y.id === cid);
            if (!x) return null;
            const p = activePass(S, x);
            return (
              <div key={cid} className="flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-2">
                  <Avatar name={x.name} />
                  <b>{x.name}</b>
                  <span className="text-[11.5px] text-muted-foreground">
                    {spots[cid] ? `spot ${spots[cid]} · ` : ""}
                    {p ? "pass" : `drop-in ${money(c.price)}`}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={() =>
                    act(() => api.del(L(`/classes/${c.id}/attendance/${cid}?date=${date}`)))
                  }
                >
                  remove
                </Button>
              </div>
            );
          })}
          {!at.length && (
            <div className="text-xs text-muted-foreground">Nobody checked in yet.</div>
          )}
        </div>
        {at.length < c.cap ? (
          <Field label="Check someone in">
            <Input
              autoFocus
              placeholder="Search client"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {found.length > 0 && (
              <div className="mt-1 flex flex-col gap-1">
                {found.map((x) => (
                  <button key={x.id} className="optbtn" onClick={() => add(x.id)}>
                    <span>{x.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {activePass(S, x) ? "pass" : money(c.price)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Field>
        ) : (
          <>
            <Note tone="warning">
              Class is full{S.policy.waitlist && " · new check-ins go on the waitlist"}
            </Note>
            <Field label="Add to waitlist">
              <Input placeholder="Search client" value={q} onChange={(e) => setQ(e.target.value)} />
              {found.length > 0 && (
                <div className="mt-1 flex flex-col gap-1">
                  {found.map((x) => (
                    <button
                      key={x.id}
                      className="optbtn"
                      onClick={() =>
                        act(
                          () => api.post(L("/waitlist"), { client_id: x.id, class_id: c.id, date }),
                          "Added to the waitlist",
                        ).then(() => setQ(""))
                      }
                    >
                      <span>{x.name}</span>
                      <span className="text-xs text-muted-foreground">waitlist</span>
                    </button>
                  ))}
                </div>
              )}
            </Field>
          </>
        )}
        {wl.length > 0 && (
          <div className="text-xs">
            <b>Waitlist</b> ·{" "}
            {wl
              .map((w) => `${nameOf(w.clientId)}${w.status === "offered" ? " (offered)" : ""}`)
              .join(", ")}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function BlockDialog({
  kind: kind0,
  date: date0,
  onClose,
}: {
  kind?: "block" | "timeoff";
  date?: string;
  onClose: () => void;
}) {
  const { S, act, L } = useStore();
  const [f, setF] = useState<{
    staff: string;
    kind: "block" | "timeoff";
    date: string;
    start: string;
    end: string;
    reason: string;
  }>({
    staff: "",
    kind: kind0 ?? "block",
    date: date0 ?? today(),
    start: "12:00",
    end: "13:00",
    reason: "",
  });
  if (!S) return null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Block time</DialogTitle>
          <DialogDescription>Breaks, admin time, or a day off</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Who">
            <Sel value={f.staff} onChange={(e) => setF({ ...f, staff: e.target.value })}>
              <option value="">Everyone</option>
              {S.staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Sel>
          </Field>
          <Field label="Kind">
            <Sel
              value={f.kind}
              onChange={(e) => setF({ ...f, kind: e.target.value as "block" | "timeoff" })}
            >
              <option value="block">Blocked time</option>
              <option value="timeoff">Day off</option>
            </Sel>
          </Field>
        </div>
        <Field label="Day">
          <div className="flex flex-wrap gap-1.5">
            {nextDays(14).map((x, i) => (
              <button
                key={x}
                className={cn("slotbtn", x === f.date && "slotbtn-on")}
                onClick={() => setF({ ...f, date: x })}
              >
                {dayLabel(x, i)}
              </button>
            ))}
          </div>
        </Field>
        {f.kind === "block" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="From">
              <Input
                type="time"
                value={f.start}
                onChange={(e) => setF({ ...f, start: e.target.value })}
              />
            </Field>
            <Field label="To">
              <Input
                type="time"
                value={f.end}
                onChange={(e) => setF({ ...f, end: e.target.value })}
              />
            </Field>
          </div>
        )}
        <Field label="Reason">
          <Input
            placeholder={f.kind === "timeoff" ? "Holiday" : "Lunch, training, admin"}
            value={f.reason}
            onChange={(e) => setF({ ...f, reason: e.target.value })}
          />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              act(
                () =>
                  api.post(L("/blocks"), {
                    staff_id: f.staff || null,
                    date: f.date,
                    start: f.start,
                    end: f.end,
                    kind: f.kind,
                    reason: f.reason,
                  }),
                f.kind === "timeoff" ? "Day off saved" : "Time blocked",
              ).then(() => onClose())
            }
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function GiftCardDialog({ onClose }: { onClose: () => void }) {
  const { S, act, L } = useStore();
  const [amt, setAmt] = useState<number | "">(50);
  const [q, setQ] = useState("");
  const [client, setClient] = useState<string | null>(null);
  if (!S) return null;
  const c = S.clients.find((x) => x.id === client);
  const found =
    q && !c
      ? S.clients.filter((x) => x.name.toLowerCase().includes(q.toLowerCase())).slice(0, 4)
      : [];
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Sell a gift card</DialogTitle>
          <DialogDescription>A code the buyer hands over; redeemable at checkout</DialogDescription>
        </DialogHeader>
        <Field label="Amount">
          <div className="flex flex-wrap items-center gap-1.5">
            {[25, 50, 100, 150].map((n) => (
              <button
                key={n}
                className={cn("slotbtn", amt === n && "slotbtn-on")}
                onClick={() => setAmt(n)}
              >
                {money(n)}
              </button>
            ))}
            <Input
              className="w-[110px]"
              placeholder="$ other"
              type="number"
              onChange={(e) => setAmt(e.target.value ? +e.target.value : "")}
            />
          </div>
        </Field>
        <Field label="Buyer" hint="optional">
          {c ? (
            <div className="flex items-center gap-2">
              <Avatar name={c.name} />
              <b>{c.name}</b>
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
              <Input placeholder="Search client" value={q} onChange={(e) => setQ(e.target.value)} />
              {found.length > 0 && (
                <div className="mt-1 flex flex-col gap-1">
                  {found.map((x) => (
                    <button
                      key={x.id}
                      className="optbtn"
                      onClick={() => {
                        setClient(x.id);
                        setQ("");
                      }}
                    >
                      <span>{x.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!amt}
            onClick={() =>
              act(
                () =>
                  api.post<{ code: string }>(L("/giftcards"), { amount: amt, client_id: client }),
                (r) => `Gift card ${r.code} · ${money(+amt)}`,
              ).then(() => onClose())
            }
          >
            Charge {amt ? money(+amt) : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
