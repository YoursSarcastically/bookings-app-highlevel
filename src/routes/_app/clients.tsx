/* Clients: search, filters, table. Rows open the profile drawer. */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { activePass, addDays, rel, today } from "@/lib/format";
import { Avatar, Empty, PageHead, Tag } from "@/components/app/Bits";
import { useOverlays } from "@/components/app/Overlays";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/clients")({
  head: () => ({ meta: [{ title: "Clients — Bookings" }] }),
  component: Clients,
});

const FILTERS = [
  ["all", "All"],
  ["members", "Members"],
  ["pass", "Has pass"],
  ["new", "New"],
  ["lapsed", "Lapsed 45d+"],
  ["card", "Card on file"],
] as const;
type Filter = (typeof FILTERS)[number][0];

function Clients() {
  const { S } = useStore();
  const ov = useOverlays();
  const [q, setQ] = useState("");
  const [f, setF] = useState<Filter>("all");
  if (!S) return null;
  const qq = q.toLowerCase(),
    qd = q.replace(/[^0-9]/g, "");
  const lastVisit = (id: string) =>
    S.appts
      .filter((a) => a.clientId === id && a.status === "done")
      .map((a) => a.date)
      .sort()
      .pop() || "";
  const list = S.clients
    .filter(
      (c) =>
        (!q ||
          c.name.toLowerCase().includes(qq) ||
          (qd && (c.phone || "").replace(/[^0-9]/g, "").includes(qd)) ||
          (c.email || "").toLowerCase().includes(qq)) &&
        (f === "all" ||
          (f === "members" && c.passes.some((p) => p.autoRenew && p.status === "active")) ||
          (f === "pass" && activePass(S, c)) ||
          (f === "new" && !c.visits) ||
          (f === "lapsed" &&
            c.visits > 0 &&
            (!lastVisit(c.id) || lastVisit(c.id) < addDays(today(), -45))) ||
          (f === "card" && c.card)),
    )
    .sort((a, b) => b.visits - a.visits);
  return (
    <>
      <PageHead
        title="Clients"
        sub={`${S.clients.length} people · the same records as HighLevel Contacts, plus visits, passes, notes and cards`}
      >
        <Input
          className="w-[240px]"
          placeholder="Search name, phone, email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button onClick={ov.newClient}>New client</Button>
      </PageHead>
      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map(([k, l]) => (
          <button
            key={k}
            onClick={() => setF(k)}
            className={cn("chipbtn", f === k && "chipbtn-on")}
          >
            {l}
          </button>
        ))}
        {(q || f !== "all") && (
          <span className="text-xs text-muted-foreground">
            {list.length} of {S.clients.length}
          </span>
        )}
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] tracking-wider text-muted-foreground uppercase">
              {["Client", "Contact", "Visits", "Last visit", "Pass", "Tags", ""].map((h, i) => (
                <th
                  key={i}
                  className={cn("border-b px-3 py-2.5 font-semibold", i === 2 && "text-right")}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.length ? (
              list.map((c) => {
                const p = activePass(S, c);
                const lv = lastVisit(c.id);
                return (
                  <tr
                    key={c.id}
                    className="cursor-pointer border-b last:border-b-0 hover:bg-secondary/60"
                    onClick={() => ov.client(c.id)}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={c.name} />
                        <b className="font-semibold">{c.name}</b>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {c.phone}
                      {c.email && (
                        <div className="text-[11px] text-muted-foreground/70">{c.email}</div>
                      )}
                    </td>
                    <td className="num px-3 py-2.5 text-right">{c.visits}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {lv ? rel(lv) : c.visits ? "before" : "never"}
                    </td>
                    <td className="px-3 py-2.5">
                      {p ? (
                        <Tag tone="violet">
                          {S.passes.find((x) => x.id === p.passId)?.name}
                          {p.remaining !== null && ` · ${p.remaining}`}
                        </Tag>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        {c.tags.slice(0, 3).map((t) => (
                          <Tag key={t}>{t}</Tag>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {c.card && <Tag title="Card on file">••{c.card.last4}</Tag>}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7}>
                  <Empty title="No one matches">Try another search or filter.</Empty>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
