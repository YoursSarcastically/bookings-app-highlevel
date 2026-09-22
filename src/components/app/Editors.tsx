/* Catalog and team editors: service (add-ons, processing time, deposit), class (seats, spots), pass, staff (role, PIN). */
import { useState } from "react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { DAYS, first } from "@/lib/format";
import type { Addon, Level } from "@/lib/types";
import { Confirm, Field, Sel } from "@/components/app/Bits";
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

export function ServiceDialog({ id, onClose }: { id?: string | undefined; onClose: () => void }) {
  const { S, act, L } = useStore();
  const v = S?.services.find((x) => x.id === id);
  const [f, setF] = useState({
    name: v?.name ?? "",
    cat: v?.cat ?? S?.services[0]?.cat ?? "Services",
    dur: v?.dur ?? 30,
    price: v?.price ?? 0,
    deposit: v?.deposit ?? 0,
    gap: v?.gap ?? 0,
    descr: v?.descr ?? "",
    staff: v?.staff ?? (S?.staff ?? []).map((s) => s.id),
    addons: (v?.addons ?? []).map((a) => ({ ...a })) as Addon[],
  });
  const [del, setDel] = useState(false);
  if (!S) return null;
  const up = (k: string, val: unknown) => setF({ ...f, [k]: val });
  const upAddon = (i: number, patch: Partial<Addon>) =>
    up(
      "addons",
      f.addons.map((a, j) => (j === i ? { ...a, ...patch } : a)),
    );
  const save = () =>
    act(
      () => (id ? api.patch(L(`/services/${id}`), f) : api.post(L("/services"), f)),
      "Saved · booking page updated",
    ).then((r) => r && onClose());
  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[90vh] max-w-[620px] overflow-auto">
          <DialogHeader>
            <DialogTitle>{id ? "Edit service" : "New service"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <Input autoFocus value={f.name} onChange={(e) => up("name", e.target.value)} />
            </Field>
            <Field label="Category">
              <Input list="cats" value={f.cat} onChange={(e) => up("cat", e.target.value)} />
              <datalist id="cats">
                {[...new Set(S.services.map((x) => x.cat))].map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Minutes">
              <Input
                type="number"
                min={5}
                step={5}
                value={f.dur}
                onChange={(e) => up("dur", +e.target.value)}
              />
            </Field>
            <Field label="Price">
              <Input
                type="number"
                min={0}
                step={0.5}
                value={f.price}
                onChange={(e) => up("price", +e.target.value)}
              />
            </Field>
            <Field label="Deposit" hint="card on file">
              <Input
                type="number"
                min={0}
                value={f.deposit}
                onChange={(e) => up("deposit", +e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Processing time"
              hint={`minutes the ${S.vocab.staffOne} is free while it develops`}
            >
              <Input
                type="number"
                min={0}
                step={5}
                value={f.gap}
                onChange={(e) => up("gap", +e.target.value)}
              />
            </Field>
            <Field label="Description" hint="shows on the booking page">
              <Input value={f.descr} onChange={(e) => up("descr", e.target.value)} />
            </Field>
          </div>
          <Field label="Who can do it">
            <div className="flex flex-wrap gap-1.5">
              {S.staff.map((s) => (
                <button
                  key={s.id}
                  className={cn("chipbtn", f.staff.includes(s.id) && "chipbtn-on")}
                  onClick={() =>
                    up(
                      "staff",
                      f.staff.includes(s.id)
                        ? f.staff.filter((x) => x !== s.id)
                        : [...f.staff, s.id],
                    )
                  }
                >
                  {first(s.name)}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Add-ons">
            <div className="flex flex-col gap-1.5">
              {f.addons.map((a, i) => (
                <div key={i} className="flex gap-1.5">
                  <Input
                    placeholder="Name"
                    value={a.name}
                    onChange={(e) => upAddon(i, { name: e.target.value })}
                  />
                  <Input
                    className="w-[90px]"
                    type="number"
                    placeholder="$"
                    value={a.price}
                    onChange={(e) => upAddon(i, { price: +e.target.value })}
                  />
                  <Input
                    className="w-[90px]"
                    type="number"
                    placeholder="+min"
                    value={a.min}
                    onChange={(e) => upAddon(i, { min: +e.target.value })}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      up(
                        "addons",
                        f.addons.filter((_, j) => j !== i),
                      )
                    }
                  >
                    ✕
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                className="self-start"
                onClick={() => up("addons", [...f.addons, { name: "", price: 0, min: 0 }])}
              >
                ＋ Add-on
              </Button>
            </div>
          </Field>
          <DialogFooter className="sm:justify-between">
            {id ? (
              <Button variant="ghost" className="text-destructive" onClick={() => setDel(true)}>
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button disabled={!f.name.trim()} onClick={save}>
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {del && (
        <Confirm
          title="Delete this service?"
          body="Existing bookings keep their record; the service disappears from the menu and the booking page."
          action="Delete"
          onClose={() => setDel(false)}
          onConfirm={() => act(() => api.del(L(`/services/${id}`))).then(() => onClose())}
        />
      )}
    </>
  );
}

export function ClassDialog({ id, onClose }: { id?: string | undefined; onClose: () => void }) {
  const { S, act, L } = useStore();
  const c = S?.classes.find((x) => x.id === id);
  const [f, setF] = useState({
    name: c?.name ?? "",
    time: c?.time ?? "18:00",
    dur: c?.dur ?? 60,
    cap: c?.cap ?? 12,
    price: c?.price ?? 20,
    staffId: c?.staffId ?? S?.staff[0]?.id ?? "",
    days: c?.days ?? [0, 1, 2, 3, 4],
    spots: c?.spots ?? false,
    descr: c?.descr ?? "",
  });
  const [del, setDel] = useState(false);
  if (!S) return null;
  const up = (k: string, val: unknown) => setF({ ...f, [k]: val });
  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{id ? "Edit class" : "New class"}</DialogTitle>
            <DialogDescription>Recurring weekly · seats · optional spot picking</DialogDescription>
          </DialogHeader>
          <Field label="Name">
            <Input autoFocus value={f.name} onChange={(e) => up("name", e.target.value)} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Start">
              <Input type="time" value={f.time} onChange={(e) => up("time", e.target.value)} />
            </Field>
            <Field label="Minutes">
              <Input type="number" value={f.dur} onChange={(e) => up("dur", +e.target.value)} />
            </Field>
            <Field label="Seats">
              <Input type="number" value={f.cap} onChange={(e) => up("cap", +e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Drop-in price">
              <Input type="number" value={f.price} onChange={(e) => up("price", +e.target.value)} />
            </Field>
            <Field label={S.vocab.staffOne.replace(/^\w/, (x) => x.toUpperCase())}>
              <Sel value={f.staffId} onChange={(e) => up("staffId", e.target.value)}>
                {S.staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Sel>
            </Field>
          </div>
          <Field label="Days">
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d, i) => (
                <button
                  key={d}
                  className={cn("chipbtn", f.days.includes(i) && "chipbtn-on")}
                  onClick={() =>
                    up(
                      "days",
                      f.days.includes(i) ? f.days.filter((x) => x !== i) : [...f.days, i].sort(),
                    )
                  }
                >
                  {d}
                </button>
              ))}
            </div>
          </Field>
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={f.spots}
              onChange={(e) => up("spots", e.target.checked)}
            />{" "}
            Clients pick a numbered spot (bike, mat, reformer)
          </label>
          <Field label="Description">
            <Input value={f.descr} onChange={(e) => up("descr", e.target.value)} />
          </Field>
          <DialogFooter className="sm:justify-between">
            {id ? (
              <Button variant="ghost" className="text-destructive" onClick={() => setDel(true)}>
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                disabled={!f.name.trim()}
                onClick={() =>
                  act(
                    () => (id ? api.patch(L(`/classes/${id}`), f) : api.post(L("/classes"), f)),
                    "Saved",
                  ).then((r) => r && onClose())
                }
              >
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {del && (
        <Confirm
          title="Delete this class?"
          body="Past attendance is kept."
          action="Delete"
          onClose={() => setDel(false)}
          onConfirm={() => act(() => api.del(L(`/classes/${id}`))).then(() => onClose())}
        />
      )}
    </>
  );
}

export function PassDialog({ onClose }: { onClose: () => void }) {
  const { S, act, L } = useStore();
  const [f, setF] = useState({
    name: "",
    type: "pack",
    credits: 10,
    price: 150,
    days: 90,
    svc: "",
    desc: "",
  });
  if (!S) return null;
  const up = (k: string, val: unknown) => setF({ ...f, [k]: val });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>New pass</DialogTitle>
        </DialogHeader>
        <Field label="Name">
          <Input
            autoFocus
            placeholder="10-visit pack"
            value={f.name}
            onChange={(e) => up("name", e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <Sel value={f.type} onChange={(e) => up("type", e.target.value)}>
              <option value="pack">Pack (credits)</option>
              <option value="unlimited">Membership (unlimited, bills monthly)</option>
              <option value="intro">Intro offer (new clients)</option>
            </Sel>
          </Field>
          <Field label="Credits">
            <Input
              type="number"
              disabled={f.type === "unlimited"}
              value={f.credits}
              onChange={(e) => up("credits", +e.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price">
            <Input type="number" value={f.price} onChange={(e) => up("price", +e.target.value)} />
          </Field>
          <Field label="Valid for (days)">
            <Input type="number" value={f.days} onChange={(e) => up("days", +e.target.value)} />
          </Field>
        </div>
        <Field label="Restrict to a service" hint="optional">
          <Sel value={f.svc} onChange={(e) => up("svc", e.target.value)}>
            <option value="">Any</option>
            {S.services.map((v) => (
              <option key={v.id} value={v.name}>
                {v.name}
              </option>
            ))}
          </Sel>
        </Field>
        <Field label="Description">
          <Input
            placeholder="What it includes"
            value={f.desc}
            onChange={(e) => up("desc", e.target.value)}
          />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!f.name.trim()}
            onClick={() =>
              act(
                () =>
                  api.post(L("/passes"), {
                    ...f,
                    credits: f.type === "unlimited" ? null : f.credits,
                    svc: f.svc || null,
                    desc: f.desc || null,
                  }),
                "Pass created",
              ).then((r) => r && onClose())
            }
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function StaffDialog({ id, onClose }: { id?: string | undefined; onClose: () => void }) {
  const { S, act, L } = useStore();
  const s = S?.staff.find((x) => x.id === id);
  const [f, setF] = useState<{
    name: string;
    role: string;
    level: Level;
    pin: string;
    rate: number;
    email: string;
    phone: string;
  }>({
    name: s?.name ?? "",
    role: s?.role ?? "",
    level: s?.level ?? "staff",
    pin: s?.pin ?? String(1000 + Math.floor(Math.random() * 9000)),
    rate: s?.rate ?? 30,
    email: s?.email ?? "",
    phone: s?.phone ?? "",
  });
  const [del, setDel] = useState(false);
  if (!S) return null;
  const up = (k: string, val: unknown) => setF({ ...f, [k]: val });
  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{id ? `Edit ${S.vocab.staffOne}` : `Add ${S.vocab.staffOne}`}</DialogTitle>
            <DialogDescription>Creates a HighLevel user with calendar access</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <Input autoFocus value={f.name} onChange={(e) => up("name", e.target.value)} />
            </Field>
            <Field label="Role title">
              <Input
                placeholder="Stylist, Trainer…"
                value={f.role}
                onChange={(e) => up("role", e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Access">
              <Sel value={f.level} onChange={(e) => up("level", e.target.value)}>
                <option value="staff">Staff</option>
                <option value="desk">Front desk</option>
                <option value="owner">Owner</option>
              </Sel>
            </Field>
            <Field label="PIN">
              <Input
                maxLength={4}
                inputMode="numeric"
                value={f.pin}
                onChange={(e) => up("pin", e.target.value)}
              />
            </Field>
            <Field label="$ / hour">
              <Input type="number" value={f.rate} onChange={(e) => up("rate", +e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <Input type="email" value={f.email} onChange={(e) => up("email", e.target.value)} />
            </Field>
            <Field label="Mobile">
              <Input value={f.phone} onChange={(e) => up("phone", e.target.value)} />
            </Field>
          </div>
          <DialogFooter className="sm:justify-between">
            {id ? (
              <Button variant="ghost" className="text-destructive" onClick={() => setDel(true)}>
                Remove
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                disabled={!f.name.trim()}
                onClick={() =>
                  act(
                    () => (id ? api.patch(L(`/staff/${id}`), f) : api.post(L("/staff"), f)),
                    id ? "Saved" : "Invited as a HighLevel user",
                  ).then((r) => r && onClose())
                }
              >
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {del && (
        <Confirm
          title="Remove this team member?"
          body="Their upcoming appointments will need to be moved to someone else first."
          action="Remove"
          onClose={() => setDel(false)}
          onConfirm={() => act(() => api.del(L(`/staff/${id}`))).then(() => onClose())}
        />
      )}
    </>
  );
}
