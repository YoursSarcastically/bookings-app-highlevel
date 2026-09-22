/* Catalog: services (add-ons, processing time, deposits), classes (seats, spots), passes & memberships. */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { DAYS, first, fmtT, money, today } from "@/lib/format";
import { Confirm, Empty, PageHead, Tag } from "@/components/app/Bits";
import { ClassDialog, PassDialog, ServiceDialog } from "@/components/app/Editors";
import { useOverlays, useQuery } from "@/components/app/Overlays";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_app/catalog")({
  head: () => ({ meta: [{ title: "Catalog — Bookings" }] }),
  component: Catalog,
});

function Catalog() {
  const { S, act, L } = useStore();
  const ov = useOverlays();
  const q = useQuery();
  const [tab, setTab] = useState("services");
  const [edit, setEdit] = useState<{
    kind: "svc" | "cls" | "pass";
    id?: string | undefined;
  } | null>(q["edit"] ? { kind: "svc", id: q["edit"] } : null);
  const [delPass, setDelPass] = useState<string | null>(null);
  if (!S) return null;
  const showClasses = S.features.classes && (S.classes.length || S.vocab.hasClasses);
  const link = `${location.origin}/book/${S.slug}`;
  return (
    <>
      <PageHead
        title="Catalog"
        sub="One list. The booking page, the front desk and HighLevel calendars all read from it."
      >
        {S.hl.linked && (
          <Button
            variant="outline"
            onClick={() =>
              act(
                () => api.post<{ pushed: number }>(L("/hl/services/push")),
                (r) => `${r.pushed} services now have a HighLevel calendar`,
              )
            }
          >
            Push to HL calendars
          </Button>
        )}
        <Button variant="outline" onClick={() => window.open(`/book/${S.slug}`, "_blank")}>
          Booking page ↗
        </Button>
        <Button
          onClick={() =>
            setEdit({ kind: tab === "classes" ? "cls" : tab === "passes" ? "pass" : "svc" })
          }
        >
          Add {tab === "classes" ? "class" : tab === "passes" ? "pass" : "service"}
        </Button>
      </PageHead>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-8 bg-transparent p-0">
          <TabsTrigger value="services">Services</TabsTrigger>
          {showClasses ? <TabsTrigger value="classes">Classes</TabsTrigger> : null}
          {S.features.passes && <TabsTrigger value="passes">{S.vocab.passWord}</TabsTrigger>}
        </TabsList>
      </Tabs>
      {tab === "services" && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">
              {location.host}/book/{S.slug}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs"
              onClick={() => navigator.clipboard?.writeText(link).then(() => toast("Copied"))}
            >
              Copy
            </Button>
            <span className="flex-1" />
            <label className="flex items-center gap-1">
              Slots every{" "}
              <select
                className="h-6 rounded-md border bg-card px-1 text-xs"
                value={S.rules.slot}
                onChange={(e) => act(() => api.patch(L(""), { slot: +e.target.value }))}
              >
                {[15, 30, 45, 60].map((m) => (
                  <option key={m} value={m}>
                    {m} min
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1">
              Free cancel until{" "}
              <select
                className="h-6 rounded-md border bg-card px-1 text-xs"
                value={S.rules.cancelHours}
                onChange={(e) => act(() => api.patch(L(""), { cancelHours: +e.target.value }))}
              >
                {[2, 12, 24, 48].map((h) => (
                  <option key={h} value={h}>
                    {h}h
                  </option>
                ))}
              </select>
            </label>
          </div>
          {[...new Set(S.services.map((v) => v.cat))].map((cat) => (
            <div key={cat} className="overflow-hidden rounded-xl border bg-card">
              <div className="item bg-secondary/60">
                <b>{cat}</b>
                <span className="text-xs text-muted-foreground">
                  · {S.services.filter((v) => v.cat === cat).length}
                </span>
              </div>
              {S.services
                .filter((v) => v.cat === cat)
                .map((v) => (
                  <div
                    key={v.id}
                    className="item item-link"
                    onClick={() => setEdit({ kind: "svc", id: v.id })}
                  >
                    <div className="min-w-0 flex-1 truncate">
                      <b className="font-semibold">{v.name}</b>{" "}
                      <span className="text-xs text-muted-foreground">
                        · {v.dur} min{v.gap ? ` + ${v.gap} processing` : ""}
                        {v.deposit ? ` · ${money(v.deposit)} deposit` : ""}
                        {v.addons.length
                          ? ` · ${v.addons.length} add-on${v.addons.length > 1 ? "s" : ""}`
                          : ""}
                      </span>
                      {v.descr && (
                        <div className="truncate text-[11.5px] text-muted-foreground/70">
                          {v.descr}
                        </div>
                      )}
                    </div>
                    {v.hlCalendarId && (
                      <Tag tone="green" title="HighLevel calendar">
                        HL
                      </Tag>
                    )}
                    <span className="num">{v.price ? money(v.price) : "Free"}</span>
                    <Tag tone={v.online ? "blue" : undefined}>
                      {v.online ? "online" : "desk only"}
                    </Tag>
                    <span onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={v.online}
                        onCheckedChange={(on) =>
                          act(
                            () => api.patch(L(`/services/${v.id}`), { online: on }),
                            on ? "Bookable online" : "Desk only",
                          )
                        }
                      />
                    </span>
                  </div>
                ))}
            </div>
          ))}
        </>
      )}
      {tab === "classes" && (
        <div className="overflow-hidden rounded-xl border bg-card">
          {S.classes.length ? (
            S.classes.map((c) => (
              <div
                key={c.id}
                className="item item-link"
                onClick={() => setEdit({ kind: "cls", id: c.id })}
              >
                <span className="t-col font-semibold text-info">{fmtT(c.time)}</span>
                <div className="min-w-0 flex-1 truncate">
                  <b className="font-semibold">{c.name}</b>{" "}
                  <span className="text-xs text-muted-foreground">
                    · {c.days.map((i) => DAYS[i]).join(" ")} · {c.dur} min · {c.cap} seats
                    {c.spots ? " · spot booking" : ""} ·{" "}
                    {first(S.staff.find((s) => s.id === c.staffId)?.name ?? "")}
                  </span>
                </div>
                <span className="num">{money(c.price)}</span>
                <span onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={c.online}
                    onCheckedChange={(on) =>
                      act(() => api.patch(L(`/classes/${c.id}`), { online: on }))
                    }
                  />
                </span>
              </div>
            ))
          ) : (
            <Empty title="No classes yet">Add a recurring class with seats.</Empty>
          )}
        </div>
      )}
      {tab === "passes" && (
        <div className="overflow-hidden rounded-xl border bg-card">
          {S.passes.length ? (
            S.passes.map((p) => {
              const n = S.clients.filter((c) =>
                c.passes.some(
                  (x) => x.passId === p.id && x.expires >= today() && x.status !== "cancelled",
                ),
              ).length;
              return (
                <div key={p.id} className="item">
                  <div className="min-w-0 flex-1 truncate">
                    <b className="font-semibold">{p.name}</b>{" "}
                    <span className="text-xs text-muted-foreground">
                      ·{" "}
                      {p.type === "pack"
                        ? `${p.credits} credits · ${p.days} days`
                        : p.type === "unlimited"
                          ? `membership · bills every ${p.days} days`
                          : `intro offer · ${p.days} days`}
                      {p.svc ? ` · ${p.svc} only` : ""} · {n} active
                    </span>
                    {p.desc && (
                      <div className="text-[11.5px] text-muted-foreground/70">{p.desc}</div>
                    )}
                  </div>
                  {p.hlProductId && <Tag tone="green">HL product</Tag>}
                  <span className="num">
                    {money(p.price)}
                    {p.type === "unlimited" && (
                      <span className="text-xs text-muted-foreground">/mo</span>
                    )}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => ov.sell(null)}>
                    Sell
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDelPass(p.id)}>
                    ✕
                  </Button>
                </div>
              );
            })
          ) : (
            <Empty title="No passes yet">Add a pack, a membership or an intro offer.</Empty>
          )}
        </div>
      )}
      {edit?.kind === "svc" && <ServiceDialog id={edit.id} onClose={() => setEdit(null)} />}
      {edit?.kind === "cls" && <ClassDialog id={edit.id} onClose={() => setEdit(null)} />}
      {edit?.kind === "pass" && <PassDialog onClose={() => setEdit(null)} />}
      {delPass && (
        <Confirm
          title="Delete this pass?"
          body="Clients who already hold it keep it."
          action="Delete"
          onClose={() => setDelPass(null)}
          onConfirm={() => act(() => api.del(L(`/passes/${delPass}`)))}
        />
      )}
    </>
  );
}
