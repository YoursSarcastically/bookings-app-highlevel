/* Appointment details: status, actions (check in, move, no-show, cancel, pay), manage link. Also the pay sheet. */
import { useState } from "react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import {
  activePass,
  dayLabel,
  endOf,
  first,
  fmtT,
  mins,
  money,
  nextDays,
  nowMins,
  rel,
  slots,
  today,
} from "@/lib/format";
import type { Appt } from "@/lib/types";
import { Confirm, Note, StatusTag, Tag } from "@/components/app/Bits";
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

export function ApptDialog({
  id,
  onClose,
  onClient,
  onPay,
}: {
  id: string;
  onClose: () => void;
  onClient: (id: string) => void;
  onPay: (id: string) => void;
}) {
  const { S, act, L } = useStore();
  const [moving, setMoving] = useState(false);
  const [mvDate, setMvDate] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | "cancel">(null);
  if (!S) return null;
  const a = S.appts.find((x) => x.id === id);
  const c = S.clients.find((x) => x.id === a?.clientId),
    sv = S.services.find((x) => x.id === a?.serviceId),
    st = S.staff.find((x) => x.id === a?.staffId);
  if (!a || !c || !sv || !st) return null;
  const late =
    a.status === "booked" &&
    a.date === today() &&
    mins(a.time) - nowMins() < S.rules.cancelHours * 60;
  const link = `${location.origin}/manage/${S.slug}/${a.token}`;
  const d = mvDate || a.date;
  const sl = moving ? slots(S, sv, st.id, d).filter((t) => !(d === a.date && t === a.time)) : [];
  const call = (
    path: string,
    body: unknown,
    msg: string | ((r: Appt & { fee?: number }) => string),
  ) =>
    act(() => api.post<Appt & { fee?: number }>(L(`/appointments/${a.id}${path}`), body), msg).then(
      () => onClose(),
    );
  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{sv.name}</DialogTitle>
            <DialogDescription>
              {c.name} · {rel(a.date)} {fmtT(a.time)}–{fmtT(endOf(S, a))} · {st.name}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-1.5">
            <StatusTag a={a} />
            <Tag>{a.source}</Tag>
            <Tag>{money(a.total)}</Tag>
            {a.deposit > 0 && <Tag tone="green">deposit {money(a.deposit)}</Tag>}
            {a.fee > 0 && <Tag tone="red">fee {money(a.fee)}</Tag>}
            {a.seriesId && <Tag tone="violet">repeats</Tag>}
            {a.addons.map((x) => (
              <Tag key={x.name}>{x.name}</Tag>
            ))}
          </div>
          {a.notes && <div className="rounded-lg bg-secondary px-3 py-2 text-xs">{a.notes}</div>}
          {moving && (
            <div className="rounded-lg border p-3">
              <b className="text-xs">Move to</b>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {nextDays(7).map((x, i) => (
                  <button
                    key={x}
                    className={cn("slotbtn", x === d && "slotbtn-on")}
                    onClick={() => setMvDate(x)}
                  >
                    {dayLabel(x, i)}
                  </button>
                ))}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {sl.length ? (
                  sl.map((t) => (
                    <button
                      key={t}
                      className="slotbtn"
                      onClick={() =>
                        act(
                          () => api.patch(L(`/appointments/${a.id}`), { date: d, time: t }),
                          `Moved to ${rel(d)} ${fmtT(t)}`,
                        ).then(() => onClose())
                      }
                    >
                      {fmtT(t)}
                    </button>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">No openings that day</span>
                )}
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {a.status === "booked" && (
              <>
                <Button size="sm" onClick={() => call("/checkin", {}, `${c.name} checked in`)}>
                  Check in
                </Button>
                <Button size="sm" variant="outline" onClick={() => setMoving(!moving)}>
                  Move
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    call(
                      "/noshow",
                      {},
                      (r) =>
                        `Marked no-show${r.fee ? ` · ${money(r.fee)} fee charged to card` : ""}`,
                    )
                  }
                >
                  No-show
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => setConfirm("cancel")}
                >
                  Cancel{late ? " (late)" : ""}
                </Button>
              </>
            )}
            {a.status === "arrived" && (
              <>
                <Button
                  size="sm"
                  onClick={() => {
                    onClose();
                    onPay(a.id);
                  }}
                >
                  Take payment
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => call("/unarrive", {}, "Check-in undone")}
                >
                  Undo check-in
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onClose();
                onClient(c.id);
              }}
            >
              Client
            </Button>
            {a.status === "booked" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  navigator.clipboard?.writeText(link).then(() => toast("Manage link copied"))
                }
              >
                Copy manage link
              </Button>
            )}
          </div>
          {a.status === "done" && (
            <div className="text-xs text-muted-foreground">
              Paid {money(a.total)}
              {a.tip ? ` + ${money(a.tip)} tip` : ""}.
            </div>
          )}
        </DialogContent>
      </Dialog>
      {confirm && (
        <Confirm
          title="Cancel this appointment?"
          action="Cancel appointment"
          onClose={() => setConfirm(null)}
          body={
            <>
              {late
                ? `This is inside the ${S.rules.cancelHours}-hour window. ${c.card ? `The late-cancellation fee of ${money(S.policy.late_cancel_fee)} will be charged to the card on file.` : "No card on file, so no fee can be charged."}`
                : "The client will be told by text."}
              {a.seriesId && (
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => call("/cancel", { series: true }, "Series cancelled")}
                  >
                    Cancel this and all following
                  </Button>
                </div>
              )}
            </>
          }
          onConfirm={() =>
            call(
              "/cancel",
              {},
              (r) => `Cancelled · client texted${r.fee ? ` · ${money(r.fee)} fee charged` : ""}`,
            )
          }
        />
      )}
    </>
  );
}

export function PayDialog({
  id,
  onClose,
  onSellPass,
}: {
  id: string;
  onClose: () => void;
  onSellPass: (clientId: string, after: string) => void;
}) {
  const { S, act, L } = useStore();
  const [tipPct, setTipPct] = useState(0);
  const [tipAmt, setTipAmt] = useState("");
  const [gc, setGc] = useState<string | null>(null);
  if (!S) return null;
  const a = S.appts.find((x) => x.id === id);
  const c = S.clients.find((x) => x.id === a?.clientId),
    sv = S.services.find((x) => x.id === a?.serviceId),
    st = S.staff.find((x) => x.id === a?.staffId);
  if (!a || !c || !sv || !st) return null;
  const p = activePass(S, c, sv);
  const tip = tipPct ? Math.round(a.total * tipPct) / 100 : +tipAmt || 0;
  const due = p ? 0 : Math.max(0, a.total - (a.deposit || 0));
  const pay = (method: string) =>
    act(
      () =>
        api.post<{ charged: number }>(L(`/appointments/${a.id}/pay`), { method, tip, code: gc }),
      (r) =>
        method === "Pass"
          ? `Pass redeemed${tip ? ` · tip ${money(tip)}` : ""}`
          : `Paid ${money(r.charged)} · receipt sent`,
    ).then((r) => r && onClose());
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Take payment</DialogTitle>
          <DialogDescription>
            {c.name} · {sv.name} with {first(st.name)}
          </DialogDescription>
        </DialogHeader>
        {p && (
          <Note tone="success">
            Covered by <b>{S.passes.find((x) => x.id === p.passId)?.name}</b>
            {p.remaining !== null
              ? ` · ${p.remaining} credit${p.remaining === 1 ? "" : "s"} left, this visit uses 1`
              : " · membership"}
          </Note>
        )}
        <div className="flex flex-col gap-1 text-[13px]">
          <div className="flex justify-between">
            <span>{sv.name}</span>
            <span className="num">{money(sv.price)}</span>
          </div>
          {a.addons.map((x) => (
            <div key={x.name} className="flex justify-between text-xs text-muted-foreground">
              <span>{x.name}</span>
              <span className="num">{money(x.price)}</span>
            </div>
          ))}
          {a.deposit > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Deposit already paid</span>
              <span className="num">−{money(a.deposit)}</span>
            </div>
          )}
          {p && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Pass</span>
              <span className="num">−{money(a.total)}</span>
            </div>
          )}
        </div>
        {S.features.tips && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Tip for {first(st.name)}
            </span>
            <div className="inline-flex gap-px rounded-lg border p-0.5">
              {[0, 15, 20, 25].map((x) => (
                <button
                  key={x}
                  onClick={() => {
                    setTipPct(x);
                    setTipAmt("");
                  }}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground",
                    tipPct === x && !tipAmt && "bg-foreground text-background",
                  )}
                >
                  {x ? `${x}%` : "No tip"}
                </button>
              ))}
            </div>
            <Input
              className="w-[100px]"
              placeholder="$ other"
              value={tipAmt}
              onChange={(e) => {
                setTipAmt(e.target.value);
                setTipPct(0);
              }}
            />
          </div>
        )}
        <div className="flex justify-between text-lg font-semibold">
          <span>Total</span>
          <span className="num">{money(due + tip)}</span>
        </div>
        {gc !== null && (
          <Input
            autoFocus
            placeholder="Gift card code GC-XXXXXXXX"
            value={gc}
            onChange={(e) => setGc(e.target.value.toUpperCase())}
          />
        )}
        <DialogFooter className="flex-wrap gap-1.5 sm:justify-end">
          {p ? (
            <Button onClick={() => pay("Pass")}>
              Redeem pass{tip ? ` · tip ${money(tip)}` : ""}
            </Button>
          ) : (
            <>
              <Button onClick={() => pay("Tap to pay")}>Tap to pay · {money(due + tip)}</Button>
              {c.card && (
                <Button variant="outline" onClick={() => pay("Card on file")}>
                  Card •••• {c.card.last4}
                </Button>
              )}
              <Button variant="outline" onClick={() => pay("Cash")}>
                Cash
              </Button>
              {gc !== null ? (
                <Button variant="outline" onClick={() => pay("Gift card")}>
                  Use gift card
                </Button>
              ) : (
                <Button variant="ghost" onClick={() => setGc("")}>
                  Gift card
                </Button>
              )}
              {S.features.passes && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    onClose();
                    onSellPass(c.id, a.id);
                  }}
                >
                  Sell a pass
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
