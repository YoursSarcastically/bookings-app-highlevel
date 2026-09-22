/* Public booking page: service → who → day → time → you. Honours deposits, add-ons, cards when required, and hands back a manage link. */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { pub } from "@/lib/api";
import { dayLabel, first, fmtT, money, nextDays, rel, today } from "@/lib/format";
import type { PublicInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/book/$slug")({
  ssr: false,
  head: () => ({ meta: [{ title: "Book online" }] }),
  component: BookPage,
});

type Booked = Awaited<ReturnType<typeof pub.book>>;
const CHIP = "rounded-lg border bg-card px-3 py-2 text-[13px] font-semibold";
const CHIP_ON = "border-primary bg-primary text-primary-foreground";

function BookPage() {
  const { slug } = Route.useParams();
  const [P, setP] = useState<PublicInfo | null>(null);
  const [err, setErr] = useState("");
  const [svc, setSvc] = useState<string | null>(null);
  const [staff, setStaff] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [addons, setAddons] = useState<string[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [you, setYou] = useState({ name: "", phone: "", email: "", brand: "Visa", last4: "" });
  const [done, setDone] = useState<Booked | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    pub
      .info(slug)
      .then((p) => {
        setP(p);
        document.title = `Book · ${p.name}`;
      })
      .catch(() => setErr("This booking page does not exist"));
  }, [slug]);
  useEffect(() => {
    if (!svc || !date) {
      setSlots([]);
      return;
    }
    setLoading(true);
    const q: Record<string, string> = { service_id: svc, date };
    if (staff) q["staff_id"] = staff;
    pub
      .availability(slug, q)
      .then((r) => {
        setSlots(r.slots);
        setReason(r.reason || "");
      })
      .catch((e) => {
        setSlots([]);
        setReason((e as Error).message);
      })
      .finally(() => setLoading(false));
  }, [slug, svc, staff, date]);

  const Hero = () => (
    <div className="-mx-4 mb-4 rounded-b-[18px] bg-foreground px-5 pt-7 pb-5 text-background">
      <h1 className="text-2xl font-bold tracking-tight">{P?.name}</h1>
      <div className="text-[13.5px] opacity-75">
        {P?.city} ·{" "}
        {P?.status === "open"
          ? "open today"
          : P?.status === "busy"
            ? "fully booked today"
            : "closed today"}
      </div>
    </div>
  );
  const H2 = ({ children }: { children: ReactNode }) => (
    <h2 className="mt-5 mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
      {children}
    </h2>
  );
  if (!P)
    return (
      <div className="mx-auto max-w-[560px] px-4">
        <div className="-mx-4 rounded-b-[18px] bg-foreground px-5 py-7 text-background">
          <h1 className="text-2xl font-bold">{err || "Loading…"}</h1>
        </div>
      </div>
    );
  const sv = P.services.find((v) => v.id === svc);
  const cands = sv ? P.staff.filter((s) => sv.staff.includes(s.id)) : [];
  const extra = sv
    ? sv.addons.filter((a) => addons.includes(a.name)).reduce((s, a) => s + a.price, 0)
    : 0;

  if (done)
    return (
      <div className="mx-auto max-w-[560px] px-4 pb-12">
        <Hero />
        <div className="rounded-2xl border bg-card p-6 text-center">
          <div className="text-4xl">✅</div>
          <h3 className="mt-2 text-xl font-semibold">You’re booked</h3>
          <p className="text-muted-foreground">
            <b className="text-foreground">{done.service}</b> with {first(done.staff)}
          </p>
          <p className="text-muted-foreground">
            {rel(done.date)} at {fmtT(done.time)}
          </p>
          {done.deposit > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Deposit of {money(done.deposit)} charged to your card.
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            A confirmation text is on its way. Free to cancel until {P.policy.cancel_hours} hours
            before.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <a
              className="rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
              href={done.manage}
            >
              Manage this booking
            </a>
            <button
              className="rounded-xl border py-3 text-sm font-semibold"
              onClick={() => location.reload()}
            >
              Book another
            </button>
          </div>
        </div>
      </div>
    );
  if (P.pages?.["book"] === false)
    return (
      <div className="mx-auto max-w-[560px] px-4">
        <Hero />
        <div className="rounded-2xl border bg-card p-6 text-center">
          <h3 className="text-lg font-semibold">Online booking is off</h3>
          <p className="text-muted-foreground">Call or message {P.name} to book.</p>
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-[560px] px-4 pb-12 text-[15px]">
      <Hero />
      <H2>1 · Service</H2>
      {P.services.map((v) => (
        <button
          key={v.id}
          onClick={() => {
            setSvc(v.id);
            setStaff(null);
            setTime(null);
            setAddons([]);
            if (!date) setDate(today());
          }}
          className={cn(
            "mb-2 flex w-full items-center justify-between gap-2 rounded-xl border bg-card px-3.5 py-3 text-left",
            svc === v.id && "border-primary ring-1 ring-primary",
          )}
        >
          <span>
            {v.em} {v.name} <small className="text-muted-foreground">· {v.dur} min</small>
            {v.descr && <div className="text-xs text-muted-foreground">{v.descr}</div>}
          </span>
          <b>{v.price ? money(v.price) : "Free"}</b>
        </button>
      ))}
      {sv && (
        <>
          {sv.addons.length > 0 && (
            <>
              <H2>Add-ons</H2>
              <div className="flex flex-wrap gap-2">
                {sv.addons.map((a) => (
                  <button
                    key={a.name}
                    onClick={() => {
                      setAddons(
                        addons.includes(a.name)
                          ? addons.filter((n) => n !== a.name)
                          : [...addons, a.name],
                      );
                      setTime(null);
                    }}
                    className={cn(CHIP, addons.includes(a.name) && CHIP_ON)}
                  >
                    {a.name} · {money(a.price)}
                    {a.min ? ` · +${a.min}m` : ""}
                  </button>
                ))}
              </div>
            </>
          )}
          <H2>2 · Who</H2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setStaff(null);
                setTime(null);
              }}
              className={cn(CHIP, !staff && CHIP_ON)}
            >
              Anyone
            </button>
            {cands.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setStaff(s.id);
                  setTime(null);
                }}
                className={cn(CHIP, staff === s.id && CHIP_ON)}
              >
                {first(s.name)}
              </button>
            ))}
          </div>
          <H2>3 · Day</H2>
          <div className="flex flex-wrap gap-2">
            {nextDays(7).map((x, i) => (
              <button
                key={x}
                onClick={() => {
                  setDate(x);
                  setTime(null);
                }}
                className={cn(CHIP, date === x && CHIP_ON)}
              >
                {dayLabel(x, i)}
              </button>
            ))}
          </div>
          {date && (
            <>
              <H2>4 · Time</H2>
              {loading ? (
                <div className="text-xs text-muted-foreground">Checking availability…</div>
              ) : slots.length ? (
                <div className="flex flex-wrap gap-2">
                  {slots.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTime(t)}
                      className={cn(CHIP, "num", time === t && CHIP_ON)}
                    >
                      {fmtT(t)}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="inline-block rounded-full bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning">
                  {reason || "No openings that day"}
                </span>
              )}
            </>
          )}
          {time && date && (
            <>
              <H2>5 · You</H2>
              <div className="flex flex-col gap-2.5">
                <input
                  className="h-11 rounded-xl border bg-card px-3"
                  placeholder="Your name"
                  value={you.name}
                  onChange={(e) => setYou({ ...you, name: e.target.value })}
                  autoFocus
                />
                <input
                  className="h-11 rounded-xl border bg-card px-3"
                  placeholder="Mobile number"
                  inputMode="tel"
                  value={you.phone}
                  onChange={(e) => setYou({ ...you, phone: e.target.value })}
                />
                <input
                  className="h-11 rounded-xl border bg-card px-3"
                  type="email"
                  placeholder="Email (optional, for your receipt)"
                  value={you.email}
                  onChange={(e) => setYou({ ...you, email: e.target.value })}
                />
                {(P.policy.require_card || sv.deposit > 0) && (
                  <div className="rounded-xl border bg-card p-3">
                    <div className="text-xs font-semibold">
                      {sv.deposit > 0
                        ? `${money(sv.deposit)} deposit to hold this booking`
                        : "Card to hold this booking"}
                    </div>
                    <div className="mt-1.5 flex gap-2">
                      <select
                        className="h-10 rounded-lg border bg-card px-2 text-[13px]"
                        value={you.brand}
                        onChange={(e) => setYou({ ...you, brand: e.target.value })}
                      >
                        <option>Visa</option>
                        <option>Mastercard</option>
                        <option>Amex</option>
                      </select>
                      <input
                        className="h-10 flex-1 rounded-lg border bg-card px-3 text-[13px]"
                        placeholder="Card last 4 digits"
                        inputMode="numeric"
                        maxLength={4}
                        value={you.last4}
                        onChange={(e) => setYou({ ...you, last4: e.target.value })}
                      />
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      Card details are handled by HighLevel Payments in production.{" "}
                      {P.policy.late_fee
                        ? `Late cancellation fee ${money(P.policy.late_fee)}.`
                        : ""}
                    </div>
                  </div>
                )}
                <div className="rounded-xl bg-secondary px-3.5 py-3 text-[13.5px] text-muted-foreground">
                  <b className="text-foreground">{sv.name}</b> ·{" "}
                  {staff ? cands.find((s) => s.id === staff)?.name : "first available"} ·{" "}
                  {rel(date)} at {fmtT(time)} · {money(sv.price + extra)}
                </div>
                <button
                  disabled={!you.name.trim() || busy}
                  onClick={async () => {
                    setBusy(true);
                    setErr("");
                    try {
                      setDone(
                        await pub.book(slug, {
                          service_id: svc,
                          staff_id: staff,
                          date,
                          time,
                          name: you.name,
                          phone: you.phone,
                          email: you.email,
                          addons,
                          card:
                            you.last4.length === 4
                              ? { brand: you.brand, last4: you.last4 }
                              : undefined,
                        }),
                      );
                    } catch (e) {
                      setErr((e as Error).message);
                    }
                    setBusy(false);
                  }}
                  className="h-12 rounded-xl bg-primary text-[15px] font-bold text-primary-foreground disabled:opacity-40"
                >
                  Confirm {fmtT(time)}
                </button>
                {err && <div className="text-xs text-destructive">{err}</div>}
              </div>
            </>
          )}
        </>
      )}
      <footer className="mt-7 text-center text-xs text-muted-foreground">
        Powered by HighLevel
      </footer>
    </div>
  );
}
