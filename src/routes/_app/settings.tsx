/* Settings: business, hours, policies, tools, activity. */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { Features } from "@/lib/types";
import { Card, Empty, Field, PageHead, Sel, Tag } from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — Bookings" }] }),
  component: Settings,
});

function Settings() {
  const { S, act, L } = useStore();
  const [biz, setBiz] = useState({
    name: S?.name ?? "",
    city: S?.city ?? "",
    open: S?.rules.open ?? "09:00",
    close: S?.rules.close ?? "19:00",
  });
  const [pol, setPol] = useState({
    cancelHours: S?.rules.cancelHours ?? 24,
    late_cancel_fee: S?.policy.late_cancel_fee ?? 0,
    noshow_fee: S?.policy.noshow_fee ?? 0,
    require_card_online: !!S?.policy.require_card_online,
    self_service: S?.policy.self_service !== false,
    waitlist: S?.policy.waitlist !== false,
  });
  if (!S) return null;
  const T = S.vocab;
  const tools: [keyof Features, string, string][] = [
    ["booking", "Online booking page", `Guests book at /book/${S.slug}`],
    ["reminders", "Text reminders & receipts", "Through HighLevel Conversations"],
    ["passes", T.passWord, "Packs, memberships with billing, credits"],
    ["tips", "Tips at checkout", "15 / 20 / 25% or a typed amount"],
    ...(T.hasClasses
      ? ([["classes", "Classes with seats", "Rosters, spot booking, waitlists"]] as [
          keyof Features,
          string,
          string,
        ][])
      : []),
  ];
  return (
    <>
      <PageHead
        title="Settings"
        sub={`Business details, policies and the tools this ${T.label.toLowerCase()} uses.`}
      />
      <div className="grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
        <Card>
          <h2 className="text-[15px] font-semibold">Business</h2>
          <form
            className="mt-2 flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void act(() => api.patch(L("/settings"), biz), "Saved");
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name">
                <Input
                  value={biz.name}
                  onChange={(e) => setBiz({ ...biz, name: e.target.value })}
                />
              </Field>
              <Field label="City">
                <Input
                  value={biz.city}
                  onChange={(e) => setBiz({ ...biz, city: e.target.value })}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Opens">
                <Input
                  type="time"
                  value={biz.open}
                  onChange={(e) => setBiz({ ...biz, open: e.target.value })}
                />
              </Field>
              <Field label="Closes">
                <Input
                  type="time"
                  value={biz.close}
                  onChange={(e) => setBiz({ ...biz, close: e.target.value })}
                />
              </Field>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex-1 text-[11.5px] text-muted-foreground">
                Default hours for new team members. Per-person days are on Team.
              </span>
              <Button size="sm" type="submit">
                Save
              </Button>
            </div>
          </form>
        </Card>
        <Card>
          <h2 className="text-[15px] font-semibold">Policies</h2>
          <div className="text-xs text-muted-foreground">
            Charged to the card on file when there is one.
          </div>
          <form
            className="mt-2 flex flex-col gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              await act(() => api.patch(L(""), { cancelHours: pol.cancelHours }));
              void act(
                () =>
                  api.patch(L("/settings"), {
                    policy: {
                      late_cancel_fee: pol.late_cancel_fee,
                      noshow_fee: pol.noshow_fee,
                      require_card_online: pol.require_card_online,
                      self_service: pol.self_service,
                      waitlist: pol.waitlist,
                    },
                  }),
                "Policies saved",
              );
            }}
          >
            <div className="grid grid-cols-3 gap-3">
              <Field label="Free cancel until">
                <Sel
                  value={pol.cancelHours}
                  onChange={(e) => setPol({ ...pol, cancelHours: +e.target.value })}
                >
                  {[2, 12, 24, 48].map((h) => (
                    <option key={h} value={h}>
                      {h} hours
                    </option>
                  ))}
                </Sel>
              </Field>
              <Field label="Late cancel fee">
                <Input
                  type="number"
                  value={pol.late_cancel_fee}
                  onChange={(e) => setPol({ ...pol, late_cancel_fee: +e.target.value })}
                />
              </Field>
              <Field label="No-show fee">
                <Input
                  type="number"
                  value={pol.noshow_fee}
                  onChange={(e) => setPol({ ...pol, noshow_fee: +e.target.value })}
                />
              </Field>
            </div>
            {(
              [
                ["require_card_online", "Ask for a card to hold online bookings"],
                ["self_service", "Clients can move or cancel from their confirmation link"],
                ["waitlist", "Offer a waitlist when a class or day is full"],
              ] as const
            ).map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={pol[k]}
                  onChange={(e) => setPol({ ...pol, [k]: e.target.checked })}
                />{" "}
                {l}
              </label>
            ))}
            <div className="flex justify-end">
              <Button size="sm" type="submit">
                Save
              </Button>
            </div>
          </form>
        </Card>
      </div>
      <Card>
        <h2 className="text-[15px] font-semibold">Tools</h2>
        <div className="text-xs text-muted-foreground">
          Anything off is hidden from the desk and the booking page.
        </div>
        <div className="mt-1.5">
          {tools.map(([k, l, d]) => (
            <div key={k} className="flex items-center gap-3 border-b py-2.5 last:border-b-0">
              <div className="flex-1">
                <b className="text-[13px]">{l}</b>
                <div className="text-[11.5px] text-muted-foreground">{d}</div>
              </div>
              <Switch
                checked={!!S.features[k]}
                onCheckedChange={(v) => act(() => api.patch(L(""), { features: { [k]: v } }))}
              />
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Activity</h2>
          <span className="text-xs text-muted-foreground">who did what</span>
        </div>
        {S.audit.length ? (
          <div className="mt-1.5">
            {S.audit.slice(0, 20).map((a, i) => (
              <div
                key={i}
                className="flex items-center gap-2 border-b py-1.5 text-xs last:border-b-0"
              >
                <span className="num w-24 shrink-0 text-[11px] text-muted-foreground/70">
                  {a.ts.slice(5, 16).replace("T", " ")}
                </span>
                <Tag>{a.action}</Tag>
                <span className="truncate text-muted-foreground">{a.detail}</span>
                {a.actor && (
                  <span className="ml-auto text-[11px] text-muted-foreground/70">{a.actor}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <Empty title="Nothing yet" />
        )}
      </Card>
    </>
  );
}
