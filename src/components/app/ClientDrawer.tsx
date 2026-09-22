/* Client profile (sheet): overview, visits, passes & memberships, payments, notes, HighLevel forms. Plus new-client and sell-pass dialogs. */
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { activePass, first, fmtD, fmtT, mins, money, nowMins, rel, sum, today } from "@/lib/format";
import type { Client, State } from "@/lib/types";
import { Avatar, Confirm, Empty, Field, Kpi, Sel, StatusTag, Tag } from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Subs = {
  submissions: { name: string; kind: string; when: string; answers: Record<string, unknown> }[];
  intake_url: string;
};

export function ClientDrawer({
  id,
  onClose,
  onBook,
  onAppt,
  onSell,
}: {
  id: string;
  onClose: () => void;
  onBook: (clientId: string) => void;
  onAppt: (id: string) => void;
  onSell: (clientId: string) => void;
}) {
  const { S, act, L } = useStore();
  const [tab, setTab] = useState("overview");
  const [refund, setRefund] = useState<string | null>(null);
  const [subs, setSubs] = useState<Subs | null>(null);
  useEffect(() => {
    if (tab === "forms" && S?.hl.linked && !subs)
      api
        .get<Subs>(L(`/hl/clients/${id}/submissions`))
        .then(setSubs)
        .catch(() => setSubs({ submissions: [], intake_url: "" }));
  }, [tab, S, subs, id, L]);
  if (!S) return null;
  const c = S.clients.find((x) => x.id === id);
  if (!c) return null;
  const hist = S.appts
    .filter((a) => a.clientId === id && a.status !== "cancelled")
    .sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1));
  const sales = S.sales
    .filter((s) => s.clientId === id)
    .slice()
    .reverse();
  const upcoming = hist
    .filter(
      (a) =>
        a.status === "booked" &&
        (a.date > today() || (a.date === today() && mins(a.time) >= nowMins())),
    )
    .reverse();
  const next = upcoming[0];
  const svc = (sid: string) => S.services.find((v) => v.id === sid)?.name ?? "";
  const who = (sid: string) => first(S.staff.find((s) => s.id === sid)?.name ?? "");
  const refundSale = sales.find((s) => s.id === refund);
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-3 overflow-auto p-0 sm:max-w-[520px]">
        <SheetHeader className="border-b px-5 pt-5 pb-3 text-left">
          <div className="flex items-start gap-3">
            <Avatar name={c.name} lg />
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-[15px]">{c.name}</SheetTitle>
              <div className="text-xs text-muted-foreground">
                {c.phone}
                {c.email && ` · ${c.email}`}
                {c.hlContactId && (
                  <>
                    {" "}
                    · <Tag tone="green">HighLevel</Tag>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="mt-2 flex gap-1.5">
            <Button size="sm" onClick={() => onBook(c.id)}>
              Book
            </Button>
            {S.features.passes && (
              <Button size="sm" variant="outline" onClick={() => onSell(c.id)}>
                Sell pass
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast("Opens the contact in Conversations")}
            >
              Text
            </Button>
          </div>
        </SheetHeader>
        <Tabs value={tab} onValueChange={setTab} className="px-5">
          <TabsList className="h-8 flex-wrap justify-start bg-transparent p-0">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="visits">Visits</TabsTrigger>
            <TabsTrigger value="passes">Passes</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            {S.hl.linked && <TabsTrigger value="forms">Forms</TabsTrigger>}
          </TabsList>
        </Tabs>
        <div className="flex flex-col gap-3 px-5 pb-6">
          {tab === "overview" && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <Kpi label="Visits" value={c.visits} />
                <Kpi label="Spent" value={money(sum(sales, (s) => s.total + s.tip))} />
                <Kpi label="Next">
                  <div className="mt-2 text-sm font-medium">
                    {next ? `${rel(next.date)} ${fmtT(next.time)}` : "—"}
                  </div>
                </Kpi>
              </div>
              <CardOnFile c={c} />
              {c.notes && (
                <div className="rounded-lg bg-secondary px-3 py-2 text-xs">{c.notes}</div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {c.tags.map((t) => (
                  <Tag key={t}>{t}</Tag>
                ))}
                {c.birthday && <Tag>🎂 {c.birthday}</Tag>}
                {c.preferredStaff && <Tag>prefers {who(c.preferredStaff)}</Tag>}
              </div>
              {upcoming.length > 0 && (
                <div>
                  <b className="text-xs">Upcoming</b>
                  {upcoming.slice(0, 4).map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between border-b py-1.5 text-xs"
                    >
                      <button className="text-left hover:underline" onClick={() => onAppt(a.id)}>
                        {rel(a.date)} {fmtT(a.time)} · {svc(a.serviceId)} · {who(a.staffId)}
                      </button>
                      <StatusTag a={a} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {tab === "visits" &&
            (hist.length ? (
              hist.slice(0, 30).map((a) => (
                <div key={a.id} className="flex items-center justify-between border-b py-2 text-xs">
                  <button className="text-left hover:underline" onClick={() => onAppt(a.id)}>
                    {fmtD(a.date)} {fmtT(a.time)} · {svc(a.serviceId)} · {who(a.staffId)}
                  </button>
                  <span className="flex items-center gap-2">
                    {a.status === "done" && a.total > 0 && (
                      <span className="num text-muted-foreground">{money(a.total + a.tip)}</span>
                    )}
                    <StatusTag a={a} />
                  </span>
                </div>
              ))
            ) : (
              <Empty title="No visits yet" />
            ))}
          {tab === "passes" &&
            (c.passes.length ? (
              c.passes
                .slice()
                .reverse()
                .map((x) => {
                  const p = S.passes.find((q) => q.id === x.passId);
                  if (!p) return null;
                  const member = p.type === "unlimited";
                  const expired = x.expires < today() && x.status !== "cancelled";
                  return (
                    <div key={x.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <b>{p.name}</b>{" "}
                          <Tag
                            tone={
                              x.status === "frozen"
                                ? "amber"
                                : x.status === "cancelled" || expired
                                  ? "red"
                                  : "green"
                            }
                          >
                            {expired ? "expired" : x.status}
                          </Tag>
                          <div className="text-xs text-muted-foreground">
                            {x.remaining !== null &&
                              `${x.remaining} credit${x.remaining === 1 ? "" : "s"} left · `}
                            {member
                              ? x.nextBilling
                                ? `renews ${fmtD(x.nextBilling)} · ${money(x.price || p.price)}/mo`
                                : `ends ${fmtD(x.expires)}`
                              : `ends ${fmtD(x.expires)}`}
                            {x.frozenUntil && ` · frozen until ${fmtD(x.frozenUntil)}`}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {member && x.status === "active" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs"
                              onClick={() =>
                                act(
                                  () => api.post(L(`/client-passes/${x.id}/freeze`)),
                                  "Membership frozen for 30 days",
                                )
                              }
                            >
                              Freeze 30d
                            </Button>
                          )}
                          {member && x.status === "frozen" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs"
                              onClick={() =>
                                act(
                                  () => api.post(L(`/client-passes/${x.id}/unfreeze`)),
                                  "Membership active again",
                                )
                              }
                            >
                              Unfreeze
                            </Button>
                          )}
                          {member && x.status !== "cancelled" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs text-destructive"
                              onClick={() =>
                                act(
                                  () => api.post(L(`/client-passes/${x.id}/cancel`)),
                                  "Membership cancelled · no further billing",
                                )
                              }
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
            ) : (
              <Empty title="No passes or memberships" />
            ))}
          {tab === "payments" &&
            (sales.length ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[11px] tracking-wider text-muted-foreground uppercase">
                    <th className="py-1.5">When</th>
                    <th>Item</th>
                    <th>Method</th>
                    <th className="text-right">Amount</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {sales.slice(0, 30).map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="py-2 text-muted-foreground">{fmtD(s.date)}</td>
                      <td>
                        {s.label}
                        {s.note && (
                          <div className="text-[11px] text-muted-foreground">{s.note}</div>
                        )}
                      </td>
                      <td className="text-muted-foreground">{s.method}</td>
                      <td className={`num text-right ${s.total < 0 ? "text-destructive" : ""}`}>
                        {money(s.total + s.tip)}
                      </td>
                      <td className="text-right">
                        {s.total > 0 &&
                          !s.refundOf &&
                          !S.sales.some((x) => x.refundOf === s.id) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs"
                              onClick={() => setRefund(s.id)}
                            >
                              Refund
                            </Button>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <Empty title="No payments yet" />
            ))}
          {tab === "notes" && <NotesForm c={c} />}
          {tab === "forms" &&
            (!subs ? (
              <Empty title="Loading from HighLevel…" />
            ) : (
              <>
                {subs.intake_url && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="self-start"
                    onClick={() => window.open(subs.intake_url, "_blank")}
                  >
                    Open intake form ↗
                  </Button>
                )}
                {subs.submissions.length ? (
                  subs.submissions.slice(0, 8).map((s, i) => (
                    <div key={i} className="rounded-lg border p-2.5">
                      <b className="text-xs">{s.name || s.kind}</b>{" "}
                      <span className="text-[11px] text-muted-foreground">
                        {(s.when || "").slice(0, 10)}
                      </span>
                      <div className="text-[11.5px] text-muted-foreground">
                        {Object.entries(s.answers || {})
                          .slice(0, 8)
                          .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
                          .join(" · ")}
                      </div>
                    </div>
                  ))
                ) : (
                  <Empty title="No submissions for this contact" />
                )}
              </>
            ))}
        </div>
      </SheetContent>
      {refundSale && (
        <Confirm
          title={`Refund ${money(refundSale.total + refundSale.tip)}?`}
          body="The refund is recorded against the same payment method."
          action="Refund"
          onClose={() => setRefund(null)}
          onConfirm={() => act(() => api.post(L(`/sales/${refundSale.id}/refund`)), "Refunded")}
        />
      )}
    </Sheet>
  );
}

function CardOnFile({ c }: { c: Client }) {
  const { act, L } = useStore();
  const [brand, setBrand] = useState("Visa");
  const [last4, setLast4] = useState("");
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <b className="text-xs">Card on file</b>
        {c.card && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs text-destructive"
            onClick={() => act(() => api.del(L(`/clients/${c.id}/card`)), "Card removed")}
          >
            Remove
          </Button>
        )}
      </div>
      {c.card ? (
        <div className="text-xs text-muted-foreground">
          {c.card.brand} •••• {c.card.last4} · used for deposits, no-show fees and memberships
        </div>
      ) : (
        <form
          className="mt-1.5 flex flex-wrap items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            void act(() => api.post(L(`/clients/${c.id}/card`), { brand, last4 }), "Card saved");
          }}
        >
          <select
            className="h-8 rounded-lg border bg-card px-2 text-xs"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          >
            <option>Visa</option>
            <option>Mastercard</option>
            <option>Amex</option>
          </select>
          <Input
            className="w-[130px]"
            placeholder="Last 4 digits"
            maxLength={4}
            inputMode="numeric"
            value={last4}
            onChange={(e) => setLast4(e.target.value)}
            required
          />
          <Button size="sm" variant="outline" type="submit">
            Save card
          </Button>
          <span className="text-[11px] text-muted-foreground">
            Tokenised by HighLevel Payments in production
          </span>
        </form>
      )}
    </div>
  );
}

function NotesForm({ c }: { c: Client }) {
  const { S, act, L } = useStore();
  const [f, setF] = useState({
    notes: c.notes,
    tags: c.tags.join(", "),
    birthday: c.birthday,
    preferred_staff: c.preferredStaff,
    email: c.email,
    name: c.name,
    phone: c.phone,
  });
  const up = (k: string, v: string) => setF({ ...f, [k]: v });
  if (!S) return null;
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void act(() => api.patch(L(`/clients/${c.id}`), f), "Saved");
      }}
    >
      <Field label="Notes" hint="allergies, preferences, formulas">
        <Textarea value={f.notes} onChange={(e) => up("notes", e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tags" hint="comma separated">
          <Input value={f.tags} onChange={(e) => up("tags", e.target.value)} />
        </Field>
        <Field label="Birthday">
          <Input type="date" value={f.birthday} onChange={(e) => up("birthday", e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Preferred ${S.vocab.staffOne}`}>
          <Sel value={f.preferred_staff} onChange={(e) => up("preferred_staff", e.target.value)}>
            <option value="">—</option>
            {S.staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Sel>
        </Field>
        <Field label="Email">
          <Input type="email" value={f.email} onChange={(e) => up("email", e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name">
          <Input value={f.name} onChange={(e) => up("name", e.target.value)} required />
        </Field>
        <Field label="Mobile">
          <Input value={f.phone} onChange={(e) => up("phone", e.target.value)} />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}

export function NewClientDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { act, L } = useStore();
  const [f, setF] = useState({ name: "", phone: "", email: "", notes: "" });
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const r = await act(
      () =>
        api.post<{ id: string; state: State }>(L("/clients"), {
          name: f.name,
          phone: f.phone || undefined,
          email: f.email || undefined,
        }),
      "Client created",
    );
    if (r) {
      if (f.notes.trim())
        await act(() => api.patch(L(`/clients/${r.id}`), { notes: f.notes.trim() }));
      onClose();
      onCreated(r.id);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>New client</DialogTitle>
          <DialogDescription>Creates a HighLevel contact for this location</DialogDescription>
        </DialogHeader>
        <form id="newcli" className="flex flex-col gap-3" onSubmit={save}>
          <Field label="Name">
            <Input
              autoFocus
              required
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
              placeholder="Full name"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mobile" hint="matches online bookings">
              <Input
                inputMode="tel"
                value={f.phone}
                onChange={(e) => setF({ ...f, phone: e.target.value })}
                placeholder="(555) 010-2000"
              />
            </Field>
            <Field label="Email" hint="receipts">
              <Input
                type="email"
                value={f.email}
                onChange={(e) => setF({ ...f, email: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Notes">
            <Input
              value={f.notes}
              onChange={(e) => setF({ ...f, notes: e.target.value })}
              placeholder="Allergies, preferences, how they found you"
            />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="newcli">
            Create client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SellPassDialog({
  clientId,
  after,
  onClose,
  onSold,
}: {
  clientId: string | null;
  after: string | null;
  onClose: () => void;
  onSold?: (after: string) => void;
}) {
  const { S, act, L } = useStore();
  const [client, setClient] = useState<string | null>(clientId);
  const [q, setQ] = useState("");
  const [passId, setPassId] = useState(S?.passes[0]?.id);
  if (!S) return null;
  const c = S.clients.find((x) => x.id === client);
  const p = S.passes.find((x) => x.id === passId);
  const found =
    q && !c
      ? S.clients.filter((x) => x.name.toLowerCase().includes(q.toLowerCase())).slice(0, 4)
      : [];
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Sell a pass</DialogTitle>
          <DialogDescription>Charged now; redeemed at check-in</DialogDescription>
        </DialogHeader>
        <Field label="Client">
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
              <Input
                autoFocus
                placeholder="Search client"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
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
        <div className="flex flex-col gap-1.5">
          {S.passes.map((x) => (
            <button
              key={x.id}
              className={`optbtn ${x.id === passId ? "optbtn-on" : ""}`}
              onClick={() => setPassId(x.id)}
            >
              <span>
                <b>{x.name}</b>
                <div className="text-[11.5px] text-muted-foreground">
                  {x.type === "pack"
                    ? `${x.credits} credits · ${x.days} days`
                    : x.type === "unlimited"
                      ? `membership · renews every ${x.days} days${c && !c.card ? " · needs a card on file to auto-renew" : ""}`
                      : `intro · ${x.days} days`}
                </div>
              </span>
              <b className="num">
                {money(x.price)}
                {x.type === "unlimited" && (
                  <span className="text-xs font-normal text-muted-foreground">/mo</span>
                )}
              </b>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!c || !p}
            onClick={async () => {
              if (!c || !p) return;
              const r = await act(
                () => api.post(L(`/passes/${p.id}/sell`), { client_id: c.id }),
                `${c.name} · ${p.name} · ${money(p.price)}`,
              );
              if (r) {
                onClose();
                if (after && onSold) onSold(after);
              }
            }}
          >
            Charge {p ? money(p.price) : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
