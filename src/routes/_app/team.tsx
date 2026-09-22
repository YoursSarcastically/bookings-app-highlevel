/* Team: people, working days, clock in/out, roles & PINs, time off. */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { DAYS, dow, first, fmtD, fmtT, hoursWorked, today } from "@/lib/format";
import { Avatar, Card, Empty, PageHead, Tag } from "@/components/app/Bits";
import { BlockDialog } from "@/components/app/Dialogs";
import { StaffDialog } from "@/components/app/Editors";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/team")({
  head: () => ({ meta: [{ title: "Team — Bookings" }] }),
  component: Team,
});

function Team() {
  const { S, act, L, can } = useStore();
  const [edit, setEdit] = useState<{ id?: string | undefined } | null>(null);
  const [off, setOff] = useState(false);
  if (!S) return null;
  const timeoff = S.blocks
    .filter((b) => b.kind === "timeoff" && b.date >= today())
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  return (
    <>
      <PageHead
        title="Team"
        sub={`${S.staff.filter((x) => x.clockIn).length} of ${S.staff.length} clocked in · working days decide what the booking page offers`}
      >
        <Button variant="outline" onClick={() => setOff(true)}>
          Add time off
        </Button>
        {can("owner") && <Button onClick={() => setEdit({})}>Add {S.vocab.staffOne}</Button>}
      </PageHead>
      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] tracking-wider text-muted-foreground uppercase">
              {[S.vocab.staffOne, "Role", "Days", "Today", "Hours", ""].map((h, i) => (
                <th key={i} className={cn("border-b px-3 py-2.5", i === 4 && "text-right")}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {S.staff.map((s) => (
              <tr key={s.id} className="border-b last:border-b-0">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Avatar name={s.name} color={s.color} />
                    <div>
                      <b className="font-semibold">{s.name}</b>
                      <div className="text-[11px] text-muted-foreground">{s.role}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <Tag
                    tone={s.level === "owner" ? "blue" : s.level === "desk" ? "violet" : undefined}
                  >
                    {s.level}
                  </Tag>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex gap-[3px]">
                    {DAYS.map((d, i) => {
                      const h = s.hours[String(i)];
                      return (
                        <button
                          key={d}
                          disabled={!can("owner")}
                          title={h ? `${fmtT(h[0])}–${fmtT(h[1])}` : "off"}
                          onClick={() =>
                            act(() => api.put(L(`/staff/${s.id}/hours`), { [i]: h ? null : true }))
                          }
                          className={cn("chipbtn h-6 px-[7px] text-[11px]", h && "chipbtn-on")}
                        >
                          {d[0]}
                        </button>
                      );
                    })}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-xs">
                  {s.clockIn ? (
                    <Tag tone="green">in since {fmtT(s.clockIn)}</Tag>
                  ) : s.shifts.length ? (
                    <span className="text-muted-foreground">out</span>
                  ) : s.hours[String(dow(today()))] ? (
                    <span className="text-muted-foreground/70">not in yet</span>
                  ) : (
                    <span className="text-muted-foreground/70">off today</span>
                  )}
                </td>
                <td className="num px-3 py-2.5 text-right">{hoursWorked(s).toFixed(1)}</td>
                <td className="px-3 py-2.5 text-right">
                  <div className="flex justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant={s.clockIn ? "outline" : "default"}
                      onClick={() =>
                        act(
                          () => api.post<{ action: string }>(L(`/staff/${s.id}/clock`)),
                          (r) => `${first(s.name)} clocked ${r.action}`,
                        )
                      }
                    >
                      {s.clockIn ? "Clock out" : "Clock in"}
                    </Button>
                    {can("owner") && (
                      <Button size="sm" variant="ghost" onClick={() => setEdit({ id: s.id })}>
                        Edit
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
        <Card>
          <h2 className="text-[15px] font-semibold">Time off</h2>
          <div className="text-xs text-muted-foreground">
            Days off hide the lane and block online booking.
          </div>
          {timeoff.length ? (
            <div className="mt-2">
              {timeoff.slice(0, 12).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between border-b py-1.5 text-xs last:border-b-0"
                >
                  <span>
                    {b.staffId ? S.staff.find((s) => s.id === b.staffId)?.name : "Everyone"} ·{" "}
                    {fmtD(b.date)} <span className="text-muted-foreground/70">{b.reason}</span>
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    onClick={() => act(() => api.del(L(`/blocks/${b.id}`)))}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="No time off scheduled" />
          )}
        </Card>
        <Card>
          <h2 className="text-[15px] font-semibold">Roles</h2>
          <div className="text-xs text-muted-foreground">
            Sign in with a PIN on the shared tablet.
          </div>
          <div className="mt-2 flex flex-col gap-1.5 text-xs">
            <div className="flex items-center gap-2">
              <Tag tone="blue">owner</Tag>
              <span className="text-muted-foreground">
                Everything, including sales, insights, settings and HighLevel.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Tag tone="violet">desk</Tag>
              <span className="text-muted-foreground">
                Front desk, calendar, clients, payments and refunds.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Tag>staff</Tag>
              <span className="text-muted-foreground">
                Their own calendar, check-ins and clock in/out. No money.
              </span>
            </div>
          </div>
        </Card>
      </div>
      {edit && <StaffDialog id={edit.id} onClose={() => setEdit(null)} />}
      {off && <BlockDialog kind="timeoff" onClose={() => setOff(false)} />}
    </>
  );
}
