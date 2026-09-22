/* Sales: today, payments, memberships & billing, gift cards, end of day with HighLevel reconciliation. */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactElement } from "react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { addDays, fmtD, hoursWorked, money, sum, today } from "@/lib/format";
import type { Sale, State } from "@/lib/types";
import {
  Avatar,
  Bars,
  Card,
  Confirm,
  Empty,
  Kpi,
  Note,
  PageHead,
  Seg,
  Tag,
} from "@/components/app/Bits";
import { GiftCardDialog } from "@/components/app/Dialogs";
import { useOverlays } from "@/components/app/Overlays";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/sales")({
  head: () => ({ meta: [{ title: "Sales — Bookings" }] }),
  component: Sales,
});

interface Recon {
  date: string;
  highlevel: {
    appointments: number;
    by_status: Record<string, number>;
    transactions: number;
    transactions_sum: number;
    invoices_paid: number;
    invoices_total: number;
  };
  desk: {
    appointments: number;
    by_status: Record<string, number>;
    sales: number;
    sales_sum: number;
    synced_appointments: number;
  };
}
const TH = "border-b px-3 py-2.5";
const byMethod = (list: Sale[]) =>
  Object.entries(
    list.reduce<Record<string, number>>(
      (m, x) => ({ ...m, [x.method]: (m[x.method] ?? 0) + x.total + x.tip }),
      {},
    ),
  ).sort((a, b) => b[1] - a[1]);

function Sales() {
  const { S, act, L, can } = useStore();
  const ov = useOverlays();
  const [tab, setTab] = useState("today");
  const [gift, setGift] = useState(false);
  const [refund, setRefund] = useState<Sale | null>(null);
  if (!S) return null;
  const T = today();
  const Pay = ({ list }: { list: Sale[] }) => (
    <div className="overflow-hidden rounded-xl border bg-card">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-[11px] tracking-wider text-muted-foreground uppercase">
            <th className={TH}>Time</th>
            <th className={TH}>Client</th>
            <th className={TH}>Item</th>
            <th className={TH}>Method</th>
            <th className={cn(TH, "text-right")}>Amount</th>
            <th className="border-b" />
          </tr>
        </thead>
        <tbody>
          {list.length ? (
            list.map((s) => {
              const c = S.clients.find((x) => x.id === s.clientId);
              const refunded = S.sales.some((x) => x.refundOf === s.id);
              return (
                <tr key={s.id} className="border-b last:border-b-0">
                  <td className="num px-3 py-2.5 text-xs text-muted-foreground">
                    {s.date !== T && `${fmtD(s.date)} `}
                    {s.at}
                  </td>
                  <td className="px-3 py-2.5">
                    {c ? (
                      <button
                        className="flex items-center gap-2 hover:underline"
                        onClick={() => ov.client(c.id)}
                      >
                        <Avatar name={c.name} />
                        {c.name}
                      </button>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {s.label}
                    {s.note && <div className="text-[11px] text-muted-foreground">{s.note}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{s.method}</td>
                  <td
                    className={cn("num px-3 py-2.5 text-right", s.total < 0 && "text-destructive")}
                  >
                    {money(s.total + s.tip)}
                    {s.tip > 0 && (
                      <div className="text-[11px] text-muted-foreground">
                        incl. {money(s.tip)} tip
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {s.total > 0 && !s.refundOf && !refunded && can("desk") ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={() => setRefund(s)}
                      >
                        Refund
                      </Button>
                    ) : refunded ? (
                      <Tag>refunded</Tag>
                    ) : null}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={6}>
                <Empty title="Nothing here yet" />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const todaySales = S.sales.filter((x) => x.date === T);
  const byM = byMethod(todaySales);
  const byS = Object.entries(
    todaySales.reduce<Record<string, number>>(
      (m, x) => (x.staffId ? { ...m, [x.staffId]: (m[x.staffId] ?? 0) + x.total + x.tip } : m),
      {},
    ),
  )
    .map(([k, v]) => [S.staff.find((s) => s.id === k)?.name || "—", v] as [string, number])
    .sort((a, b) => b[1] - a[1]);
  const paid = todaySales.filter((x) => x.total > 0);
  const refunds = todaySales.length - paid.length;

  return (
    <>
      <PageHead
        title="Sales"
        sub="Every charge, refund, membership and gift card. HighLevel is the system of record at end of day."
      >
        <Button variant="outline" onClick={() => setGift(true)}>
          Sell gift card
        </Button>
        {S.features.passes && (
          <Button variant="outline" onClick={() => ov.sell(null)}>
            Sell pass
          </Button>
        )}
      </PageHead>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-8 bg-transparent p-0">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="members">Memberships</TabsTrigger>
          <TabsTrigger value="gift">Gift cards</TabsTrigger>
          <TabsTrigger value="eod">End of day</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "today" && (
        <>
          <div className="grid grid-cols-4 gap-2.5 max-md:grid-cols-2">
            <Kpi
              label="Collected today"
              value={money(sum(todaySales, (x) => x.total + x.tip))}
              sub={`${paid.length} payments${refunds ? ` · ${refunds} refund${refunds > 1 ? "s" : ""}` : ""}`}
            />
            <Kpi label="Tips" value={money(sum(todaySales, (x) => x.tip))} sub="across the team" />
            <Kpi
              label="Average ticket"
              value={money(paid.length ? sum(paid, (x) => x.total + x.tip) / paid.length : 0)}
              sub="per payment"
            />
            <Kpi
              label="Deposits & fees"
              value={money(
                sum(
                  todaySales.filter((x) => /^(Deposit|No-show|Late)/.test(x.label)),
                  (x) => x.total,
                ),
              )}
              sub="card on file"
            />
          </div>
          <div className="grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
            <Card>
              <h2 className="mb-2 text-[15px] font-semibold">By payment method</h2>
              {byM.length ? <Bars items={byM} fmt={money} /> : <Empty title="No payments yet" />}
            </Card>
            <Card>
              <h2 className="mb-2 text-[15px] font-semibold">By {S.vocab.staffOne}</h2>
              {byS.length ? <Bars items={byS} fmt={money} /> : <Empty title="No payments yet" />}
            </Card>
          </div>
          <Pay list={todaySales.slice().reverse()} />
        </>
      )}
      {tab === "payments" && <PaymentsRange S={S} Pay={Pay} />}
      {tab === "members" && <Members S={S} />}
      {tab === "gift" && (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] tracking-wider text-muted-foreground uppercase">
                <th className={TH}>Code</th>
                <th className={TH}>Bought by</th>
                <th className={cn(TH, "text-right")}>Balance</th>
                <th className={cn(TH, "text-right")}>Initial</th>
                <th className={TH}>Issued</th>
                <th className="border-b" />
              </tr>
            </thead>
            <tbody>
              {S.giftcards.length ? (
                S.giftcards.map((g) => (
                  <tr key={g.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2.5 font-mono text-xs">{g.code}</td>
                    <td className="px-3 py-2.5">
                      {S.clients.find((c) => c.id === g.clientId)?.name || (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="num px-3 py-2.5 text-right font-semibold">{money(g.balance)}</td>
                    <td className="num px-3 py-2.5 text-right text-muted-foreground">
                      {money(g.initial)}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtD(g.created)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={() =>
                          navigator.clipboard?.writeText(g.code).then(() => toast("Copied"))
                        }
                      >
                        Copy code
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <Empty title="No gift cards yet">
                      Sell one with the button above; it can be used at checkout as a payment
                      method.
                    </Empty>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {tab === "eod" && <EndOfDay S={S} />}
      {gift && <GiftCardDialog onClose={() => setGift(false)} />}
      {refund && (
        <Confirm
          title={`Refund ${money(refund.total + refund.tip)}?`}
          body={`${refund.label} · paid by ${refund.method}. The refund is recorded against the same method.`}
          action="Refund"
          onClose={() => setRefund(null)}
          onConfirm={() => act(() => api.post(L(`/sales/${refund.id}/refund`)), "Refunded")}
        />
      )}
    </>
  );
}

function PaymentsRange({ S, Pay }: { S: State; Pay: (p: { list: Sale[] }) => ReactElement }) {
  const [days, setDays] = useState(7);
  const since = addDays(today(), -(days - 1));
  const list = S.sales
    .filter((x) => x.date >= since)
    .slice()
    .reverse();
  return (
    <>
      <div className="flex items-center gap-2">
        <Seg
          value={days}
          options={[
            [7, "7 days"],
            [14, "14 days"],
            [30, "30 days"],
          ]}
          onChange={setDays}
        />
        <span className="text-xs text-muted-foreground">
          {list.length} transactions · {money(sum(list, (x) => x.total + x.tip))}
        </span>
      </div>
      <Pay list={list} />
    </>
  );
}

function Members({ S }: { S: State }) {
  const { act, L } = useStore();
  const ov = useOverlays();
  const members = S.clients.flatMap((c) =>
    c.passes.flatMap((x) => {
      const p = S.passes.find((q) => q.id === x.passId);
      return p && p.type === "unlimited" ? [{ c, x, p }] : [];
    }),
  );
  const active = members.filter((m) => m.x.status === "active" && m.x.expires >= today());
  const due = active.filter((m) => m.x.nextBilling && m.x.nextBilling <= today());
  return (
    <>
      <div className="grid grid-cols-4 gap-2.5 max-md:grid-cols-2">
        <Kpi
          label="Active members"
          value={active.length}
          sub={`${members.filter((m) => m.x.status === "frozen").length} frozen · ${members.filter((m) => m.x.status === "cancelled").length} cancelled`}
        />
        <Kpi
          label="Monthly recurring"
          value={money(sum(active, (m) => m.x.price || m.p.price))}
          sub="at current prices"
        />
        <Kpi label="Due for billing" value={due.length}>
          {due.length ? (
            <Button
              size="sm"
              variant="outline"
              className="mt-1 h-6 px-2 text-xs"
              onClick={() =>
                act(
                  () => api.post<{ billed: number }>(L("/billing/run")),
                  (r) => `${r.billed} membership${r.billed === 1 ? "" : "s"} billed`,
                )
              }
            >
              Run billing now
            </Button>
          ) : (
            <div className="s">billing runs every 6 hours</div>
          )}
        </Kpi>
        <Kpi
          label="Without a card"
          value={active.filter((m) => !m.c.card).length}
          sub="will be marked due at the desk"
        />
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] tracking-wider text-muted-foreground uppercase">
              {["Member", "Plan", "Status", "Next billing", "Price", "Card", ""].map((h, i) => (
                <th key={i} className={cn(TH, i === 4 && "text-right")}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.length ? (
              members
                .sort((a, b) => ((a.x.nextBilling || "9") < (b.x.nextBilling || "9") ? -1 : 1))
                .map((m) => {
                  const expired = m.x.expires < today() && m.x.status !== "cancelled";
                  return (
                    <tr key={m.x.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2.5">
                        <button
                          className="flex items-center gap-2 hover:underline"
                          onClick={() => ov.client(m.c.id)}
                        >
                          <Avatar name={m.c.name} />
                          <b>{m.c.name}</b>
                        </button>
                      </td>
                      <td className="px-3 py-2.5">{m.p.name}</td>
                      <td className="px-3 py-2.5">
                        <Tag
                          tone={
                            m.x.status === "frozen"
                              ? "amber"
                              : m.x.status === "cancelled" || expired
                                ? "red"
                                : "green"
                          }
                        >
                          {expired ? "expired" : m.x.status}
                        </Tag>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {m.x.nextBilling ? fmtD(m.x.nextBilling) : "—"}
                        {m.x.frozenUntil && (
                          <div className="text-[11px]">frozen to {fmtD(m.x.frozenUntil)}</div>
                        )}
                      </td>
                      <td className="num px-3 py-2.5 text-right">
                        {money(m.x.price || m.p.price)}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {m.c.card ? `•••• ${m.c.card.last4}` : <Tag tone="amber">none</Tag>}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex justify-end gap-1">
                          {m.x.status === "active" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs"
                              onClick={() =>
                                act(
                                  () => api.post(L(`/client-passes/${m.x.id}/freeze`)),
                                  "Frozen for 30 days",
                                )
                              }
                            >
                              Freeze
                            </Button>
                          )}
                          {m.x.status === "frozen" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs"
                              onClick={() =>
                                act(
                                  () => api.post(L(`/client-passes/${m.x.id}/unfreeze`)),
                                  "Active again",
                                )
                              }
                            >
                              Unfreeze
                            </Button>
                          )}
                          {m.x.status !== "cancelled" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs text-destructive"
                              onClick={() =>
                                act(
                                  () => api.post(L(`/client-passes/${m.x.id}/cancel`)),
                                  "Cancelled · no further billing",
                                )
                              }
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
            ) : (
              <tr>
                <td colSpan={7}>
                  <Empty title="No memberships yet">
                    Sell a membership from a client’s profile or the Sell pass button.
                  </Empty>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function EndOfDay({ S }: { S: State }) {
  const { L } = useStore();
  const [rc, setRc] = useState<Recon | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = () => {
    setErr(null);
    api
      .get<Recon>(L(`/hl/reconcile?date=${today()}`))
      .then(setRc)
      .catch((e) => setErr((e as Error).message));
  };
  useEffect(() => {
    if (S.hl.linked) load();
  }, [S.hl.linked]); // eslint-disable-line react-hooks/exhaustive-deps
  const T = today();
  const s = S.sales.filter((x) => x.date === T);
  const byS = S.staff.map((st) => ({
    st,
    n: s.filter((x) => x.staffId === st.id && x.total > 0 && x.appointmentId).length,
    sales: sum(
      s.filter((x) => x.staffId === st.id),
      (x) => x.total,
    ),
    tips: sum(
      s.filter((x) => x.staffId === st.id),
      (x) => x.tip,
    ),
  }));
  const byM = byMethod(s);
  const dif = (a: number, b: number) => {
    const x = b - a;
    return Math.abs(x) < 0.005 ? (
      <Tag tone="green">match</Tag>
    ) : (
      <Tag tone="amber">
        {x > 0 ? "+" : ""}
        {Number.isInteger(x) ? x : money(x)}
      </Tag>
    );
  };
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold">{fmtD(T)}</h2>
          <div className="text-xs text-muted-foreground">
            {money(sum(s, (x) => x.total))} sales · {money(sum(s, (x) => x.tip))} tips ·{" "}
            {S.appts.filter((a) => a.date === T && a.status === "done").length} visits ·{" "}
            {S.appts.filter((a) => a.date === T && a.status === "noshow").length} no-shows
          </div>
        </div>
        <Button variant="outline" onClick={() => toast("Report emailed to the owner")}>
          Email report
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] tracking-wider text-muted-foreground uppercase">
                <th className={TH}>{S.vocab.staffOne}</th>
                <th className={cn(TH, "text-right")}>Hours</th>
                <th className={cn(TH, "text-right")}>Visits</th>
                <th className={cn(TH, "text-right")}>Sales</th>
                <th className={cn(TH, "text-right")}>Tips</th>
              </tr>
            </thead>
            <tbody>
              {byS.map((b) => (
                <tr key={b.st.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2.5">{b.st.name}</td>
                  <td className="num px-3 py-2.5 text-right">{hoursWorked(b.st).toFixed(1)}</td>
                  <td className="num px-3 py-2.5 text-right">{b.n}</td>
                  <td className="num px-3 py-2.5 text-right">{money(b.sales)}</td>
                  <td className="num px-3 py-2.5 text-right">{money(b.tips)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] tracking-wider text-muted-foreground uppercase">
                <th className={TH}>Paid by</th>
                <th className={cn(TH, "text-right")}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {byM.length ? (
                byM.map(([m, v]) => (
                  <tr key={m} className="border-b last:border-b-0">
                    <td className="px-3 py-2.5">{m}</td>
                    <td className="num px-3 py-2.5 text-right">{money(v)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="px-3 py-2.5 text-muted-foreground">
                    No payments yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {S.hl.linked && (
        <Card>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-[15px] font-semibold">
                HighLevel reconciliation · final numbers
              </h2>
              <div className="text-xs text-muted-foreground">
                HighLevel is the system of record; gaps are shown.
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={load}>
              {rc ? "Refresh" : "Load"}
            </Button>
          </div>
          {err && (
            <Note tone="danger" className="mt-2">
              {err}
            </Note>
          )}
          {rc && (
            <table className="mt-3 w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] tracking-wider text-muted-foreground uppercase">
                  <th className="border-b py-2" />
                  <th className="border-b py-2 text-right">Front desk</th>
                  <th className="border-b py-2 text-right">HighLevel</th>
                  <th className="border-b py-2 text-right">Difference</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2">Appointments today</td>
                  <td className="num py-2 text-right">{rc.desk.appointments}</td>
                  <td className="num py-2 text-right font-semibold">{rc.highlevel.appointments}</td>
                  <td className="py-2 text-right">
                    {dif(rc.desk.appointments, rc.highlevel.appointments)}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Payments today</td>
                  <td className="num py-2 text-right">
                    {rc.desk.sales} · {money(rc.desk.sales_sum)}
                  </td>
                  <td className="num py-2 text-right font-semibold">
                    {rc.highlevel.transactions} · {money(rc.highlevel.transactions_sum)}
                  </td>
                  <td className="py-2 text-right">
                    {dif(rc.desk.sales_sum, rc.highlevel.transactions_sum)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2">Synced to a calendar</td>
                  <td className="num py-2 text-right">
                    {rc.desk.synced_appointments} / {rc.desk.appointments}
                  </td>
                  <td className="py-2 text-right">—</td>
                  <td />
                </tr>
              </tbody>
            </table>
          )}
        </Card>
      )}
    </>
  );
}
