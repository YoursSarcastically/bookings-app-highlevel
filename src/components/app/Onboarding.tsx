/* Four short steps: business type → services → team → tools. Every step writes to the API. */
import { useState } from "react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { DAYS, money } from "@/lib/format";
import type { Features } from "@/lib/types";
import { Avatar } from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export default function Onboarding() {
  const { S, act, L, switchLocation } = useStore();
  const [i, setI] = useState(0);
  const [svc, setSvc] = useState({ name: "", cat: "", dur: "30", price: "0" });
  const [who, setWho] = useState({ name: "", role: "" });
  if (!S) return null;
  const T = S.vocab;
  const done = () => act(() => api.patch(L(""), { onboarded: true }), "Booking link is live");
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
  const steps = [
    <>
      <h3 className="font-semibold">What kind of business?</h3>
      <div className="mt-2 grid grid-cols-3 gap-2.5 max-sm:grid-cols-1">
        {S.locations.map((l) => (
          <button
            key={l.id}
            onClick={() => l.id !== S.id && switchLocation(l.id)}
            className={cn(
              "rounded-xl border bg-card p-4 text-center font-semibold hover:bg-secondary",
              l.id === S.id && "border-primary ring-1 ring-primary",
            )}
          >
            <span className="mb-1 block text-2xl">{l.emoji}</span>
            {l.label}
          </button>
        ))}
      </div>
    </>,
    <>
      <h3 className="font-semibold">Your {T.svc.toLowerCase()}</h3>
      <div className="text-xs text-muted-foreground">
        Remove what you don’t do, add what you do.
      </div>
      <div className="max-h-64 overflow-auto">
        {S.services.map((v) => (
          <div key={v.id} className="flex items-center justify-between border-b py-1.5 text-[13px]">
            <span>
              {v.name}{" "}
              <span className="text-muted-foreground">
                · {v.dur} min · {v.cat}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <b>{v.price ? money(v.price) : "Free"}</b>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2"
                onClick={() => act(() => api.del(L(`/services/${v.id}`)))}
              >
                ✕
              </Button>
            </span>
          </div>
        ))}
      </div>
      <form
        className="mt-2 flex flex-wrap gap-1.5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!svc.name.trim()) return;
          await act(() =>
            api.post(L("/services"), {
              name: svc.name,
              cat: svc.cat || "Services",
              dur: +svc.dur || 30,
              price: +svc.price || 0,
            }),
          );
          setSvc({ ...svc, name: "" });
        }}
      >
        <Input
          className="min-w-[150px] flex-[2]"
          placeholder="Add a service"
          value={svc.name}
          onChange={(e) => setSvc({ ...svc, name: e.target.value })}
          required
        />
        <Input
          className="min-w-[100px] flex-1"
          placeholder="Category"
          value={svc.cat}
          onChange={(e) => setSvc({ ...svc, cat: e.target.value })}
        />
        <Input
          className="w-[76px]"
          type="number"
          min={5}
          step={5}
          value={svc.dur}
          onChange={(e) => setSvc({ ...svc, dur: e.target.value })}
          title="Minutes"
        />
        <Input
          className="w-[86px]"
          type="number"
          min={0}
          step={0.5}
          value={svc.price}
          onChange={(e) => setSvc({ ...svc, price: e.target.value })}
          title="Price"
        />
        <Button size="sm" type="submit">
          Add
        </Button>
      </form>
    </>,
    <>
      <h3 className="font-semibold">Your team</h3>
      <div className="text-xs text-muted-foreground">
        Each {T.staffOne} gets a login and a lane on the calendar.
      </div>
      {S.staff.map((s) => (
        <div key={s.id} className="flex items-center gap-2 border-b py-1.5 text-[13px]">
          <Avatar name={s.name} color={s.color} />
          <b>{s.name}</b>
          <span className="flex-1 text-muted-foreground">{s.role}</span>
          <span className="text-[11px] text-muted-foreground">
            {DAYS.filter((_, k) => s.hours[String(k)]).join(" ")}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2"
            onClick={() => act(() => api.del(L(`/staff/${s.id}`)))}
          >
            ✕
          </Button>
        </div>
      ))}
      <form
        className="mt-2 flex flex-wrap gap-1.5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!who.name.trim()) return;
          await act(() =>
            api.post(L("/staff"), {
              name: who.name,
              role: who.role,
              rate: 30,
              pin: String(1000 + Math.floor(Math.random() * 9000)),
            }),
          );
          setWho({ name: "", role: "" });
        }}
      >
        <Input
          className="min-w-[150px] flex-[2]"
          placeholder={`Add a ${T.staffOne}`}
          value={who.name}
          onChange={(e) => setWho({ ...who, name: e.target.value })}
          required
        />
        <Input
          className="min-w-[100px] flex-1"
          placeholder="Role"
          value={who.role}
          onChange={(e) => setWho({ ...who, role: e.target.value })}
        />
        <Button size="sm" type="submit">
          Invite
        </Button>
      </form>
    </>,
    <>
      <h3 className="font-semibold">Tools</h3>
      {tools.map(([k, l, d]) => (
        <div key={k} className="flex items-center gap-3 border-b py-2">
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
    </>,
  ];
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-background px-4 py-12">
      <div className="mx-auto max-w-[640px]">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to {S.name}</h1>
        <div className="text-muted-foreground">
          Four short steps. Everything can be changed later in Settings.
        </div>
        <div className="mt-3 flex gap-1.5">
          {steps.map((_, k) => (
            <i key={k} className={cn("h-[3px] flex-1 rounded bg-border", k <= i && "bg-primary")} />
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-3 rounded-xl border bg-card p-5">
          {steps[i]}
          <div className="mt-1 flex items-center gap-2">
            {i > 0 && (
              <Button variant="outline" onClick={() => setI(i - 1)}>
                Back
              </Button>
            )}
            <span className="flex-1 text-right text-[11.5px] text-muted-foreground">
              {i + 1} of 4
            </span>
            {i < 3 ? (
              <Button onClick={() => setI(i + 1)}>Next</Button>
            ) : (
              <Button onClick={done}>Open the front desk</Button>
            )}
          </div>
        </div>
        <Button variant="ghost" className="mt-3" onClick={done}>
          Skip for now
        </Button>
      </div>
    </div>
  );
}
