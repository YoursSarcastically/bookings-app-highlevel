/* Client self-service from the confirmation link: move to another open slot, or cancel within the policy. */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { pub } from "@/lib/api";
import { dayLabel, first, fmtD, fmtT, money, nextDays } from "@/lib/format";
import type { ManageInfo } from "@/lib/types";
import { Note } from "@/components/app/Bits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/manage/$slug/$token")({
  ssr: false,
  head: () => ({ meta: [{ title: "Your booking" }] }),
  component: ManagePage,
});

type Done = { kind: "move"; date: string; time: string } | { kind: "cancel"; fee: number };

function ManagePage() {
  const { slug, token } = Route.useParams();
  const [A, setA] = useState<ManageInfo | null>(null);
  const [err, setErr] = useState("");
  const [mode, setMode] = useState<"view" | "move" | "cancel">("view");
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  useEffect(() => {
    pub
      .manage(slug, token)
      .then((a) => {
        setA(a);
        document.title = `Your booking · ${a.business}`;
      })
      .catch((e) => setErr((e as Error).message || "This link is no longer valid"));
  }, [slug, token]);
  useEffect(() => {
    if (!A || !date) return;
    setBusy(true);
    pub
      .availability(slug, { service_id: A.service_id, staff_id: A.staff_id, date })
      .then((r) => setSlots(r.slots.filter((t) => !(date === A.date && t === A.time))))
      .catch(() => setSlots([]))
      .finally(() => setBusy(false));
  }, [A, date, slug]);
  const Hero = () => (
    <div className="-mx-4 mb-4 rounded-b-[18px] bg-foreground px-5 pt-7 pb-5 text-background">
      <h1 className="text-2xl font-bold">{A?.business || err || "Loading…"}</h1>
      <div className="text-[13.5px] opacity-75">Your booking</div>
    </div>
  );
  if (!A)
    return (
      <div className="mx-auto max-w-[520px] px-4">
        <Hero />
      </div>
    );
  const Chip = ({
    on,
    children,
    onClick,
  }: {
    on?: boolean;
    children: ReactNode;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "h-8 rounded-lg border bg-card px-3 text-[13px] font-semibold",
        on && "border-primary bg-primary text-primary-foreground",
      )}
    >
      {children}
    </button>
  );
  const past = A.status !== "booked";
  const H3 = ({ children }: { children: ReactNode }) => (
    <h3 className="mt-4 mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
      {children}
    </h3>
  );
  return (
    <div className="mx-auto max-w-[520px] px-4 pb-12 text-[15px]">
      <Hero />
      {done ? (
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-semibold">
            {done.kind === "cancel" ? "Cancelled" : "Moved"}
          </h2>
          <p className="text-muted-foreground">
            {done.kind === "cancel"
              ? `Your appointment has been cancelled.${done.fee ? ` A late-cancellation fee of ${money(done.fee)} was charged to your card.` : ""}`
              : `See you on ${fmtD(done.date)} at ${fmtT(done.time)}.`}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-3 rounded-2xl border bg-card p-5">
            <h2 className="text-lg font-semibold">{A.service}</h2>
            <div className="text-muted-foreground">
              {fmtD(A.date)} at {fmtT(A.time)} · {A.dur} min · with {first(A.staff)}
            </div>
            <div className="mt-1.5 text-xs text-muted-foreground">
              {A.deposit > 0 && `Deposit paid ${money(A.deposit)} · `}Free to cancel until{" "}
              {A.cancel_hours} hours before
              {A.late_fee ? `; after that a ${money(A.late_fee)} fee applies` : ""}.
            </div>
            {past ? (
              <Note tone="danger" className="mt-2.5">
                This booking is {A.status} and cannot be changed online.
              </Note>
            ) : !A.self_service ? (
              <div className="mt-2.5 rounded-lg bg-secondary px-3 py-2 text-xs">
                Please call to change this booking.
              </div>
            ) : A.late ? (
              <Note tone="danger" className="mt-2.5">
                This is inside the {A.cancel_hours}-hour window.
                {A.late_fee ? ` Cancelling now charges the ${money(A.late_fee)} fee.` : ""}
              </Note>
            ) : null}
          </div>
          {!past && A.self_service && mode === "view" && (
            <div className="flex gap-2">
              <button
                className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
                onClick={() => {
                  setMode("move");
                  setDate(null);
                  setTime(null);
                }}
              >
                Move it
              </button>
              <button
                className="h-10 rounded-xl border px-4 text-sm font-semibold text-destructive"
                onClick={() => setMode("cancel")}
              >
                Cancel booking
              </button>
            </div>
          )}
          {mode === "move" && (
            <div className="rounded-2xl border bg-card p-5">
              <h2 className="text-lg font-semibold">Pick a new time</h2>
              <H3>Day</H3>
              <div className="flex flex-wrap gap-2">
                {nextDays(10).map((x, i) => (
                  <Chip
                    key={x}
                    on={x === date}
                    onClick={() => {
                      setDate(x);
                      setTime(null);
                    }}
                  >
                    {dayLabel(x, i)}
                  </Chip>
                ))}
              </div>
              {date && (
                <>
                  <H3>Time</H3>
                  {busy ? (
                    <div className="text-xs text-muted-foreground">Checking…</div>
                  ) : slots.length ? (
                    <div className="flex flex-wrap gap-2">
                      {slots.map((t) => (
                        <Chip key={t} on={t === time} onClick={() => setTime(t)}>
                          {fmtT(t)}
                        </Chip>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">No openings that day</div>
                  )}
                </>
              )}
              <div className="mt-4 flex gap-2">
                <button
                  disabled={!time || !date}
                  className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40"
                  onClick={async () => {
                    if (!date || !time) return;
                    try {
                      const r = await pub.manageMove(slug, token, { date, time });
                      setDone({ kind: "move", date: r.date, time: r.time });
                    } catch (e) {
                      setErr((e as Error).message);
                    }
                  }}
                >
                  Confirm{time ? ` ${fmtT(time)}` : ""}
                </button>
                <button
                  className="h-10 rounded-xl border px-4 text-sm font-semibold"
                  onClick={() => setMode("view")}
                >
                  Back
                </button>
              </div>
              {err && <div className="mt-2 text-xs text-destructive">{err}</div>}
            </div>
          )}
          {mode === "cancel" && (
            <div className="rounded-2xl border bg-card p-5">
              <h2 className="text-lg font-semibold">Cancel this booking?</h2>
              <p className="text-muted-foreground">
                {A.late && A.late_fee
                  ? `A ${money(A.late_fee)} late-cancellation fee will be charged to your card on file.`
                  : "You can book again any time."}
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  className="h-10 rounded-xl border px-4 text-sm font-semibold text-destructive"
                  onClick={async () => {
                    try {
                      const r = await pub.manageCancel(slug, token);
                      setDone({ kind: "cancel", fee: r.fee });
                    } catch (e) {
                      setErr((e as Error).message);
                    }
                  }}
                >
                  Yes, cancel
                </button>
                <button
                  className="h-10 rounded-xl border px-4 text-sm font-semibold"
                  onClick={() => setMode("view")}
                >
                  Keep it
                </button>
              </div>
              {err && <div className="mt-2 text-xs text-destructive">{err}</div>}
            </div>
          )}
        </>
      )}
      <footer className="mt-6 text-center text-xs text-muted-foreground">
        Powered by HighLevel
      </footer>
    </div>
  );
}
