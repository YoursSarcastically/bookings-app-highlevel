/* Dates, times, money and small pure helpers shared by every page. Days are Monday = 0. */
import type { Appt, Client, Klass, Service, Staff, State } from "./types";

export const pad = (n: number) => String(n).padStart(2, "0");
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => iso(new Date());
export const parse = (s: string) => {
  const [y = 1970, m = 1, d = 1] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s: string, n: number) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
export const dow = (s: string) => (parse(s).getDay() + 6) % 7;
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const MON = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
export const mins = (t: string) => +t.slice(0, 2) * 60 + +t.slice(3, 5);
export const tstr = (m: number) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
export const nowMins = () => {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
};
export const fmtT = (t: string) => {
  const [h = 0, m = 0] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}${m ? ":" + pad(m) : ""} ${h >= 12 ? "PM" : "AM"}`;
};
export const fmtD = (s: string) => {
  const d = parse(s);
  return `${DAYS[dow(s)]} ${d.getDate()} ${MON[d.getMonth()]}`;
};
export const rel = (s: string) =>
  s === today()
    ? "Today"
    : s === addDays(today(), 1)
      ? "Tomorrow"
      : s === addDays(today(), -1)
        ? "Yesterday"
        : fmtD(s);
export const money = (n: number) =>
  `${n < 0 ? "-" : ""}$${(Math.abs(Math.round(n * 100)) / 100).toFixed(2)}`;
export const initials = (n: string) =>
  (n || "?")
    .split(" ")
    .map((x) => x[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
export const sum = <T>(a: T[], f: (x: T) => number) => a.reduce((s, x) => s + f(x), 0);
export const COLORS = ["#2f5bea", "#7c3aed", "#db2777", "#059669", "#d97706", "#0891b2"];
export const colorFor = (name: string) => COLORS[(name || "").length % COLORS.length] ?? COLORS[0]!;
/** "Today · Wed 24" style labels for the next N days. */
export const dayLabel = (x: string, i: number) =>
  i === 0 ? "Today" : `${DAYS[dow(x)]} ${parse(x).getDate()}`;
export const nextDays = (n: number, from = today()) =>
  Array.from({ length: n }, (_, i) => addDays(from, i));
export const first = (name: string) => name.split(" ")[0] ?? name;

/* ---- domain helpers over a state snapshot ---- */
export const svcOf = (S: State, id: string) => S.services.find((v) => v.id === id);
export const staffOf = (S: State, id: string) => S.staff.find((s) => s.id === id);
export const clientOf = (S: State, id: string) => S.clients.find((c) => c.id === id);
export const classOf = (S: State, id: string) => S.classes.find((c) => c.id === id);
export const passOf = (S: State, id: string) => S.passes.find((p) => p.id === id);

export function activePass(S: State, c: Client, svc?: Service) {
  return (c.passes || []).find(
    (x) =>
      x.expires >= today() &&
      (x.status || "active") === "active" &&
      (x.remaining === null || x.remaining > 0) &&
      (!svc || !passOf(S, x.passId)?.svc || passOf(S, x.passId)?.svc === svc.name),
  );
}
export function endOf(S: State, a: Appt) {
  const sv = svcOf(S, a.serviceId);
  return tstr(mins(a.time) + (sv ? sv.dur : 30) + sum(a.addons || [], (x) => +x.min || 0));
}
export function hoursWorked(st: Staff) {
  let m = sum(st.shifts || [], (x) => mins(x[1]) - mins(x[0]));
  if (st.clockIn) m += Math.max(0, nowMins() - mins(st.clockIn));
  return m / 60;
}
export function blocksFor(S: State, sid: string, d: string) {
  return (S.blocks || []).filter((b) => b.date === d && (!b.staffId || b.staffId === sid));
}
export function staffBusy(
  S: State,
  sid: string,
  date: string,
  t: string,
  dur: number,
  exclude?: string,
) {
  const s = mins(t),
    e = s + dur;
  return (
    S.appts.some(
      (a) =>
        a.id !== exclude &&
        a.staffId === sid &&
        a.date === date &&
        !["cancelled", "noshow"].includes(a.status) &&
        s <
          mins(a.time) +
            ((svcOf(S, a.serviceId)?.dur ?? 30) + (svcOf(S, a.serviceId)?.gap ?? 0)) +
            sum(a.addons || [], (x) => +x.min || 0) &&
        mins(a.time) < e,
    ) ||
    S.classes.some(
      (c) =>
        c.staffId === sid &&
        c.days.includes(dow(date)) &&
        s < mins(c.time) + c.dur &&
        mins(c.time) < e,
    ) ||
    blocksFor(S, sid, date).some((b) => s < mins(b.end) && mins(b.start) < e)
  );
}
export function slots(S: State, svc: Service, sid: string, date: string) {
  const st = staffOf(S, sid);
  if (!st) return [] as string[];
  const h = st.hours[String(dow(date))];
  if (!h) return [] as string[];
  const out: string[] = [];
  for (let m = mins(h[0]); m + svc.dur <= mins(h[1]); m += S.rules.slot) {
    const t = tstr(m);
    if (date === today() && m < nowMins() + 30) continue;
    if (!staffBusy(S, sid, date, t, svc.dur + (svc.gap || 0))) out.push(t);
  }
  return out;
}
export function isLate(a: Appt) {
  return a.status === "booked" && a.date === today() && mins(a.time) < nowMins();
}
export function classesOn(S: State, date: string): Klass[] {
  return S.features.classes ? S.classes.filter((c) => c.days.includes(dow(date))) : [];
}
