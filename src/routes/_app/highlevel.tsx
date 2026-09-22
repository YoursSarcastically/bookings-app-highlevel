/* HighLevel: connection, sync status (with read-back verify), set-up, tools, activity. */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Card, Field, PageHead, Tag } from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/highlevel")({
  head: () => ({ meta: [{ title: "HighLevel — Bookings" }] }),
  component: HighLevel,
});

interface Status {
  configured: boolean;
  token: string;
  location_id: string;
  app_location_id: string;
  sync: Record<string, boolean>;
  workflows: Record<string, string>;
  pipeline: Record<string, string>;
  intake_form_id: string;
  objects: Record<string, { schema: string; assoc: string }>;
  location: { id: string; name: string; timezone: string } | null;
  error: string | null;
  summary: Record<string, number>;
  log: { ts: string; action: string; ok: boolean; detail: string }[];
}
interface Opt {
  id: string;
  name: string;
  status?: string;
}
interface Options {
  workflows: Opt[];
  pipelines: { id: string; name: string; stages: Opt[] }[];
  forms: { id: string; name: string; url: string }[];
  surveys: { id: string; name: string; url: string }[];
  objects: unknown[];
  products: unknown[];
  users: Opt[];
}
type Check = { linked: number; checked: number; ok: number; missing: string[] };
interface Verify {
  ok: boolean;
  [k: string]: Check | boolean | Record<string, unknown>;
}
const isCheck = (v: unknown): v is Check => !!v && typeof v === "object" && "linked" in v;

function HighLevel() {
  const { S, L, refresh } = useStore();
  const [H, setH] = useState<Status | null>(null);
  const [O, setO] = useState<Options | null>(null);
  const [V, setV] = useState<Verify | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [failOnly, setFailOnly] = useState(false);
  const [locId, setLocId] = useState("");
  const sid = S?.id;
  const load = () =>
    api.get<Status>(L("/hl/status")).then((h) => {
      setH(h);
      setLocId(h.location_id);
      if (h.configured && h.location && !h.error)
        api
          .get<Options>(L("/hl/options"))
          .then(setO)
          .catch(() => null);
    });
  useEffect(() => {
    void load();
  }, [sid]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!S) return null;
  if (!H) return <PageHead title="HighLevel" sub="Checking the connection…" />;
  const ok = H.configured && !!H.location && !H.error;
  const linked = H.app_location_id === S.id;
  const sm = H.summary;
  const run = async <T,>(label: string, fn: () => Promise<T>, msg?: (r: T) => string) => {
    setBusy(label);
    try {
      const r = await fn();
      if (msg) toast(msg(r));
      await refresh(true);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(null);
  };
  const settings = (body: unknown) =>
    run("settings", () =>
      api.patch<Status>(L("/hl/settings"), body).then((h) => {
        setH(h);
        return h;
      }),
    );
  const sw = (k: string) => (
    <Switch checked={!!H.sync[k]} onCheckedChange={(v) => settings({ sync: { [k]: v } })} />
  );
  const vres = (k: string) => {
    const v = V?.[k];
    if (!isCheck(v)) return <span className="text-muted-foreground/60">—</span>;
    if (!v.linked) return <span className="text-muted-foreground/60">nothing to check</span>;
    return v.missing.length ? (
      <span className="text-destructive">
        {v.ok}/{v.checked} found · missing {v.missing.slice(0, 2).join(", ")}
        {v.missing.length > 2 ? ` +${v.missing.length - 2}` : ""}
      </span>
    ) : (
      <span className="text-success">
        {v.ok}/{v.checked} found
      </span>
    );
  };
  const inv = V?.["invoices"];
  const rows: [string, string, string, string | null][] = [
    ["contacts", "Contacts", `${sm["contacts"]} of ${S.clients.length} clients`, "contacts"],
    [
      "appointments",
      "Calendars",
      `${sm["appts"]} appointments · ${sm["services"]} of ${S.services.length} services have a calendar`,
      "appointments",
    ],
    [
      "opportunities",
      "Opportunities",
      `${sm["opportunities"]} clients have one${H.pipeline["id"] ? "" : " · no pipeline mapped"}`,
      "opportunities",
    ],
    [
      "workflows",
      "Workflows",
      `${Object.values(H.workflows).filter(Boolean).length} of 5 events mapped`,
      null,
    ],
    [
      "invoices",
      "Payments & invoices",
      `${isCheck(inv) ? inv.linked : "—"} invoices from the desk`,
      "invoices",
    ],
    [
      "email",
      "Email",
      `${S.clients.filter((c) => c.email?.includes("@")).length} clients have an email`,
      null,
    ],
    ["sms", "SMS", "booking confirmations", null],
    [
      "objects",
      "Custom objects",
      `${sm["records"]} records${Object.keys(H.objects).length ? "" : " · not set up"}`,
      "records",
    ],
  ];
  const Pick = ({
    value,
    opts,
    onChange,
    placeholder,
  }: {
    value: string;
    opts: Opt[];
    onChange: (v: string) => void;
    placeholder: string;
  }) => (
    <select
      className="h-8 w-full max-w-[320px] rounded-lg border bg-card px-2 text-[13px]"
      value={value}
      disabled={!ok}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {opts.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
          {o.status && o.status !== "published" ? ` · ${o.status}` : ""}
        </option>
      ))}
    </select>
  );
  const cur = O?.pipelines.find((p) => p.id === H.pipeline["id"]);
  const stages = cur?.stages ?? [];
  const logs = H.log.filter((l) => !failOnly || !l.ok);
  const tools: [string, string, (r: Record<string, number>) => string][] = [
    [
      "Import contacts",
      "/hl/import-contacts",
      (r) => `${r["imported"]} of ${r["total"]} contacts linked or created`,
    ],
    ["Push clients", "/hl/push-clients", (r) => `${r["pushed"]} clients pushed`],
    ["Push services → calendars", "/hl/services/push", (r) => `${r["pushed"]} calendars created`],
    [
      "Import calendars → services",
      "/hl/services/import",
      (r) => `${r["imported"]} of ${r["total"]} calendars linked or added`,
    ],
    ["Push products", "/hl/products/push", (r) => `${r["pushed"]} products created`],
  ];
  return (
    <>
      <PageHead
        title="HighLevel"
        sub="Contacts, calendars, opportunities, payments, workflows, forms, email and custom objects, written by the front desk."
      />
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <b>Connection</b>{" "}
            <Tag tone={ok ? "green" : H.configured ? "red" : "amber"} className="ml-1.5">
              {ok ? "Connected" : H.configured ? "Error" : "Needs sub-account id"}
            </Tag>
            <div className="text-xs text-muted-foreground">
              {ok && H.location ? (
                <>
                  {H.location.name} · {H.location.timezone} ·{" "}
                  <span className="font-mono">{H.location.id}</span> ·{" "}
                  {linked
                    ? `linked to ${S.name}`
                    : H.app_location_id
                      ? "linked to another business"
                      : "not linked to a business yet"}
                </>
              ) : (
                <>
                  Token {H.token || "not set"}. {H.error}
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ok &&
              (linked ? (
                <Button size="sm" variant="outline" onClick={() => settings({ link: false })}>
                  Unlink
                </Button>
              ) : (
                <Button size="sm" onClick={() => settings({ link: true })}>
                  Link {S.name}
                </Button>
              ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                run(
                  "test",
                  () =>
                    api.post<{ location: { name: string }; users: number; calendars: number }>(
                      L("/hl/test"),
                    ),
                  (x) =>
                    `Connected to ${x.location.name} · ${x.users} users · ${x.calendars} calendars`,
                )
              }
            >
              Test
            </Button>
            <Button size="sm" variant="outline" onClick={() => void load()}>
              Refresh
            </Button>
          </div>
        </div>
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-muted-foreground">
            Change sub-account id
          </summary>
          <form
            className="mt-2 flex flex-wrap gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              void settings({ location_id: locId });
            }}
          >
            <Input
              className="max-w-[420px] flex-1"
              placeholder="Sub-account (location) id"
              value={locId}
              onChange={(e) => setLocId(e.target.value)}
            />
            <Button size="sm" type="submit">
              Save
            </Button>
          </form>
          <div className="mt-1.5 text-[11px] text-muted-foreground">
            From the HighLevel URL: app.gohighlevel.com/v2/location/<b>&lt;id&gt;</b>/…
          </div>
        </details>
      </Card>
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <b>Sync status</b>
            <div className="text-xs text-muted-foreground">
              Switch each domain on or off. Verify reads the newest linked items back from
              HighLevel.
            </div>
          </div>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              disabled={!ok || busy === "verify"}
              onClick={() =>
                run(
                  "verify",
                  () =>
                    api.get<Verify>(L("/hl/verify")).then((v) => {
                      setV(v);
                      return v;
                    }),
                  (r) =>
                    r.ok
                      ? "Verified: everything linked exists in HighLevel"
                      : "Verified: some items are missing",
                )
              }
            >
              {busy === "verify" ? "Verifying…" : "Verify"}
            </Button>
            <Button
              size="sm"
              disabled={!ok || !linked || busy === "seed"}
              onClick={() =>
                run(
                  "seed",
                  () => api.post<{ done: Record<string, number> }>(L("/hl/seed")),
                  (r) =>
                    "Seeded: " +
                    Object.entries(r.done)
                      .map(([k, v]) => `${v} ${k}`)
                      .join(" · "),
                )
              }
            >
              {busy === "seed" ? "Seeding…" : "Seed HighLevel"}
            </Button>
          </div>
        </div>
        <table className="mt-2.5 w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] tracking-wider text-muted-foreground uppercase">
              <th className="w-16 border-b py-2">On</th>
              <th className="border-b py-2">Domain</th>
              <th className="border-b py-2">Synced</th>
              <th className="border-b py-2">Verified</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([k, l, c, vk]) => (
              <tr key={k} className="border-b last:border-b-0">
                <td className="py-2">{sw(k)}</td>
                <td className="py-2 font-semibold">{l}</td>
                <td className="py-2 text-muted-foreground">{c}</td>
                <td className="py-2">
                  {vk ? vres(vk) : <span className="text-muted-foreground/60">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {V && (
          <div className={cn("mt-2 text-[11.5px]", V.ok ? "text-success" : "text-danger")}>
            {V.ok
              ? "Everything linked was found in HighLevel."
              : "Some linked items were not found; see the rows above."}
          </div>
        )}
      </Card>
      <Card>
        <b>Set-up</b>
        <div className="text-xs text-muted-foreground">Done once per sub-account.</div>
        <Accordion type="multiple" className="mt-1">
          <AccordionItem value="team">
            <AccordionTrigger className="py-3 text-[13px]">
              <span>
                <b>Team</b>{" "}
                <span className="font-normal text-muted-foreground">
                  · {sm["staff"]} of {S.staff.length} linked to users
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              {S.staff.map((s) => (
                <div key={s.id} className="flex items-center gap-2 py-1 text-xs">
                  <b className="w-36">{s.name}</b>
                  <span className="flex-1 text-muted-foreground">{s.role}</span>
                  {s.hlUserId ? (
                    <Tag tone="green">
                      → {O?.users.find((u) => u.id === s.hlUserId)?.name || "HighLevel user"}
                    </Tag>
                  ) : (
                    <Tag>not matched</Tag>
                  )}
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                className="mt-1.5"
                disabled={!ok}
                onClick={() =>
                  run(
                    "team",
                    () => api.post<{ report: { user: string | null }[] }>(L("/hl/team"), {}),
                    (r) => `${r.report.filter((x) => x.user).length} matched to users`,
                  )
                }
              >
                Sync team
              </Button>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="wf">
            <AccordionTrigger className="py-3 text-[13px]">
              <span>
                <b>Workflows</b>{" "}
                <span className="font-normal text-muted-foreground">
                  · {Object.values(H.workflows).filter(Boolean).length} of 5 mapped
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
                {(
                  [
                    ["booked", "After a booking"],
                    ["noshow", "After a no-show"],
                    ["showed", "After a paid visit"],
                    ["pass_sold", "After a pass is sold"],
                    ["pass_expiring", "7 days before a pass ends"],
                  ] as const
                ).map(([k, l]) => (
                  <Field key={k} label={l}>
                    <Pick
                      value={H.workflows[k] ?? ""}
                      opts={O?.workflows ?? []}
                      placeholder="— not mapped —"
                      onChange={(v) => settings({ workflows: { [k]: v } })}
                    />
                  </Field>
                ))}
              </div>
              <div className="mt-1.5 text-[11px] text-muted-foreground">
                Only published workflows run; drafts are listed for mapping.
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="pl">
            <AccordionTrigger className="py-3 text-[13px]">
              <span>
                <b>Pipeline</b>{" "}
                <span className="font-normal text-muted-foreground">
                  · {cur ? cur.name : "not mapped"}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
                <Field label="Pipeline">
                  <Pick
                    value={H.pipeline["id"] ?? ""}
                    opts={O?.pipelines ?? []}
                    placeholder="— choose —"
                    onChange={(v) =>
                      settings({ pipeline: { id: v, booked: "", noshow: "", paid: "" } })
                    }
                  />
                </Field>
                <Field label="Stage at first booking">
                  <Pick
                    value={H.pipeline["booked"] ?? ""}
                    opts={stages}
                    placeholder="—"
                    onChange={(v) => settings({ pipeline: { booked: v } })}
                  />
                </Field>
                <Field label="Stage after a no-show">
                  <Pick
                    value={H.pipeline["noshow"] ?? ""}
                    opts={stages}
                    placeholder="—"
                    onChange={(v) => settings({ pipeline: { noshow: v } })}
                  />
                </Field>
                <Field label="Stage at first payment (won)">
                  <Pick
                    value={H.pipeline["paid"] ?? ""}
                    opts={stages}
                    placeholder="—"
                    onChange={(v) => settings({ pipeline: { paid: v } })}
                  />
                </Field>
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="forms">
            <AccordionTrigger className="py-3 text-[13px]">
              <span>
                <b>Forms</b>{" "}
                <span className="font-normal text-muted-foreground">
                  · {H.intake_form_id ? "intake form set" : "no intake form"}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <Field label="Intake form for new clients">
                <Pick
                  value={H.intake_form_id ?? ""}
                  opts={O?.forms ?? []}
                  placeholder="— none —"
                  onChange={(v) => settings({ intake_form_id: v })}
                />
              </Field>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(O?.forms ?? []).map((f) => (
                  <button key={f.id} className="tag" onClick={() => window.open(f.url, "_blank")}>
                    {f.name} ↗
                  </button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="obj">
            <AccordionTrigger className="py-3 text-[13px]">
              <span>
                <b>Custom objects</b>{" "}
                <span className="font-normal text-muted-foreground">
                  ·{" "}
                  {Object.keys(H.objects).length
                    ? `${Object.keys(H.objects).length} objects`
                    : "not set up"}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="text-xs text-muted-foreground">
                Pass, Class visit and Shift objects with their fields, linked to the contact.
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.values(H.objects).map((o) => (
                  <Tag key={o.schema} tone="green">
                    {o.schema}
                  </Tag>
                ))}
              </div>
              <div className="mt-2 flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!ok}
                  onClick={() =>
                    run(
                      "obj",
                      () => api.post<{ objects: Record<string, unknown> }>(L("/hl/objects/setup")),
                      (r) => `${Object.keys(r.objects).length} custom objects ready`,
                    )
                  }
                >
                  {Object.keys(H.objects).length ? "Re-check set-up" : "Set up"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!ok || !H.sync["objects"]}
                  onClick={() =>
                    run(
                      "bf",
                      () => api.post<{ pushed: number }>(L("/hl/objects/backfill")),
                      (r) => `${r.pushed} records written`,
                    )
                  }
                >
                  Backfill records
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>
      <Card>
        <b>Tools</b>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tools.map(([l, p, m]) => (
            <Button
              key={p}
              size="sm"
              variant="outline"
              disabled={!ok || busy === p}
              onClick={() => run(p, () => api.post<Record<string, number>>(L(p)), m)}
            >
              {l}
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            disabled={!ok || !H.sync["email"]}
            title={H.sync["email"] ? "" : "Turn on the Email switch first"}
            onClick={() =>
              run(
                "lapsed",
                () => api.post<{ sent: number }>(L("/hl/email/lapsed"), { days: 60 }),
                (r) => `${r.sent} emails sent`,
              )
            }
          >
            Email lapsed clients
          </Button>
        </div>
      </Card>
      <Card>
        <div className="flex items-center justify-between">
          <b>Activity</b>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={failOnly}
              onChange={(e) => setFailOnly(e.target.checked)}
            />{" "}
            failures only
          </label>
        </div>
        {logs.length ? (
          <div className="mt-2">
            {logs.map((l, i) => (
              <div key={i} className="flex items-center gap-2 py-1 text-xs">
                <span className="num w-24 shrink-0 text-[11px] text-muted-foreground/70">
                  {l.ts.slice(5, 16).replace("T", " ")}
                </span>
                <span
                  className={cn("w-11 shrink-0 text-[11px]", l.ok ? "text-success" : "text-danger")}
                >
                  {l.ok ? "ok" : "failed"}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {l.action}
                  {l.detail && <span className="text-muted-foreground"> · {l.detail}</span>}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 text-xs text-muted-foreground">
            {failOnly ? "No failures." : "Nothing synced yet."}
          </div>
        )}
      </Card>
    </>
  );
}
