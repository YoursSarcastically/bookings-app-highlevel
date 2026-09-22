/* App chrome: sidebar, top bar with status switch and ⌘K search, PIN sign-in, onboarding. Pages render in <Outlet/>. */
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { api, search } from "@/lib/api";
import { initials, mins, nowMins, today } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Avatar } from "@/components/app/Bits";
import { OverlayProvider, useOverlays } from "@/components/app/Overlays";
import Onboarding from "@/components/app/Onboarding";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/frontdesk", label: "Front desk", kb: "⌘1" },
  { to: "/calendar", label: "Calendar", kb: "⌘2" },
  { to: "/clients", label: "Clients", kb: "⌘3" },
  { to: "/sales", label: "Sales", kb: "⌘4" },
  { to: "/catalog", label: "Catalog", kb: "⌘5" },
  { to: "/team", label: "Team", kb: "" },
  { to: "/insights", label: "Insights", kb: "" },
  { to: "/website", label: "Website", kb: "" },
  { to: "/highlevel", label: "HighLevel Connections", kb: "" },
  { to: "/settings", label: "Settings", kb: "" },
] as const;
const NATIVE = [
  "Launchpad",
  "Dashboard",
  "Conversations",
  "Calendars",
  "Contacts",
  "Payments",
  "Marketing",
  "Automation",
  "Sites",
];
const STAFF_HIDDEN: string[] = [
  "/sales",
  "/insights",
  "/settings",
  "/highlevel",
  "/catalog",
  "/website",
];

export default function Shell() {
  return (
    <OverlayProvider>
      <ShellInner />
    </OverlayProvider>
  );
}

function ShellInner() {
  const { S, loading, error, me, act, L, switchLocation, signOut, pinSignIn } = useStore();
  const ov = useOverlays();
  const nav = useNavigate();
  const router = useRouter();
  const here = useLocation({ select: (l) => l.pathname });
  const [pin, setPin] = useState<string | null>(null);
  const [pal, setPal] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPal(true);
      }
      if ((e.metaKey || e.ctrlKey) && /^[1-5]$/.test(e.key)) {
        e.preventDefault();
        const item = NAV[+e.key - 1];
        if (item) void nav({ to: item.to });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nav]);

  if (loading && !S)
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  if (error && !S)
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center text-sm">
        <div>
          <b className="block font-semibold">Cannot reach the API</b>
          <span className="text-muted-foreground">
            {error}. Start it with <code className="rounded bg-secondary px-1">npm run api</code>.
          </span>
        </div>
      </div>
    );
  if (!S) return null;
  const due = S.appts.filter(
    (a) => a.date === today() && a.status === "booked" && mins(a.time) <= nowMins() + 30,
  ).length;
  const title = NAV.find((n) => here.startsWith(n.to))?.label ?? "Front desk";
  const go = (path: string) => router.history.push(path);

  return (
    <div className="grid min-h-screen grid-cols-[232px_minmax(0,1fr)] max-md:grid-cols-1">
      <aside className="sticky top-0 flex h-screen flex-col gap-0.5 overflow-auto border-r bg-sidebar p-2.5 max-md:static max-md:h-auto max-md:flex-row max-md:flex-wrap">
        <div className="flex items-center gap-2.5 px-2 pt-1.5 pb-3.5 max-md:w-full">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-xs font-bold text-background">
            {initials(S.name)}
          </div>
          <div className="min-w-0">
            <b className="block truncate text-[13.5px] leading-tight">{S.name}</b>
            <span className="text-[11.5px] text-muted-foreground">
              {S.vocab.label} · {S.city.split(",")[0]}
            </span>
          </div>
        </div>
        <div className="px-2.5 pt-3 pb-1.5 text-[10.5px] font-semibold tracking-wider text-muted-foreground uppercase max-md:hidden">
          {S.vocab.section.toLowerCase()}
        </div>
        {NAV.filter((n) => !(me?.level === "staff" && STAFF_HIDDEN.includes(n.to))).map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            activeProps={{
              className: "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent",
            }}
          >
            {n.label}
            {n.to === "/frontdesk" && due ? (
              <span className="ml-auto rounded-full bg-destructive px-1.5 text-[10.5px] font-bold text-destructive-foreground">
                {due}
              </span>
            ) : n.kb ? (
              <span className="ml-auto font-mono text-[11px] text-muted-foreground/70">{n.kb}</span>
            ) : null}
          </Link>
        ))}
        <div className="px-2.5 pt-3 pb-1.5 text-[10.5px] font-semibold tracking-wider text-muted-foreground uppercase max-md:hidden">
          highlevel
        </div>
        {NATIVE.map((n) => (
          <span
            key={n}
            className="cursor-default px-2.5 py-[7px] text-muted-foreground/60 max-md:hidden"
          >
            {n}
          </span>
        ))}
        <div className="mt-auto flex flex-col gap-2 px-2 pt-2.5 pb-1 max-md:hidden">
          {me ? (
            <div className="flex items-center gap-2 rounded-lg border bg-card p-2">
              <Avatar name={me.name} color={me.color} />
              <div className="min-w-0 flex-1">
                <b className="block truncate text-[12.5px] leading-tight">{me.name}</b>
                <span className="text-[11px] text-muted-foreground">{me.level}</span>
              </div>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={signOut}>
                Sign out
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setPin("")}>
              Sign in with PIN
            </Button>
          )}
          <div className="text-[11.5px] text-muted-foreground">
            {S.locations.map((l) => (
              <button
                key={l.id}
                onClick={() => switchLocation(l.id)}
                className={cn("pr-2 hover:text-foreground", l.id === S.id && "text-foreground")}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <div className="sticky top-0 z-20 flex min-h-[52px] items-center gap-2.5 border-b bg-card px-6 py-2.5 max-md:px-3.5">
          <div className="text-[13px] text-muted-foreground">
            {S.vocab.section.charAt(0) + S.vocab.section.slice(1).toLowerCase()} /{" "}
            <b className="font-semibold text-foreground">{title}</b>
          </div>
          <span className="flex-1" />
          <button
            onClick={() => setPal(true)}
            className="flex min-w-[220px] items-center gap-2 rounded-lg border bg-secondary px-2.5 py-1.5 text-[12.5px] text-muted-foreground max-md:min-w-0"
          >
            <span>Search clients, services, bookings</span>
            <kbd className="ml-auto rounded border bg-card px-1 font-mono text-[10.5px]">⌘K</kbd>
          </button>
          <div className="inline-flex gap-px rounded-lg border bg-card p-0.5">
            {(["open", "busy", "closed"] as const).map((k) => (
              <button
                key={k}
                onClick={() =>
                  act(
                    () => api.patch(L(""), { status: k }),
                    k === "open"
                      ? "Accepting bookings"
                      : k === "busy"
                        ? "Online booking paused today"
                        : "Closed today",
                  )
                }
                className={cn(
                  "rounded-md px-2.5 py-1 text-[12.5px] font-medium text-muted-foreground",
                  S.status === k && "bg-foreground text-background",
                )}
              >
                {k[0]?.toUpperCase() + k.slice(1)}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => ov.book({})}>
            Book
          </Button>
        </div>
        <main className="flex w-full max-w-[1280px] flex-col gap-4.5 p-6 pb-12 max-md:p-3.5 [&>*+*]:mt-4">
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
        </main>
      </div>

      {!S.onboarded && <Onboarding />}

      <Dialog open={pin !== null} onOpenChange={(o) => !o && setPin(null)}>
        <DialogContent className="max-w-[360px] p-7 text-center">
          <PinPad
            onDone={async (code) => {
              try {
                const m = await pinSignIn(code);
                setPin(null);
                toast(`Signed in as ${m.name}`);
                return true;
              } catch (e) {
                toast.error((e as Error).message);
                return false;
              }
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={pal} onOpenChange={setPal}>
        <DialogContent className="max-w-[620px] overflow-hidden p-0">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <Palette
            onPick={(kind, id) => {
              setPal(false);
              if (kind === "client") go(`/clients?open=${id}`);
              else if (kind === "service") go(`/catalog?edit=${id}`);
              else if (kind === "appointment") go(`/calendar?appt=${id}`);
              else if (kind === "book") ov.book({});
              else if (kind === "walkin") ov.book({ walkin: true });
              else if (kind === "nav") go(id);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PinPad({ onDone }: { onDone: (code: string) => Promise<boolean> }) {
  const [buf, setBuf] = useState("");
  const push = async (d: string) => {
    const b = (buf + d).slice(0, 4);
    setBuf(b);
    if (b.length === 4) {
      const ok = await onDone(b);
      if (!ok) setBuf("");
    }
  };
  return (
    <div className="flex flex-col gap-3.5">
      <div>
        <DialogTitle className="text-[15px] font-semibold">Who is at the desk?</DialogTitle>
        <div className="text-xs text-muted-foreground">Enter your PIN</div>
      </div>
      <div className="flex justify-center gap-2">
        {[0, 1, 2, 3].map((i) => (
          <i
            key={i}
            className={cn(
              "inline-block h-3.5 w-3.5 rounded-full border border-muted-foreground",
              buf.length > i && "border-foreground bg-foreground",
            )}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            onClick={() => push(String(n))}
            className="h-12 rounded-lg border bg-card text-lg font-medium hover:bg-secondary"
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => setBuf(buf.slice(0, -1))}
          className="h-12 rounded-lg border bg-card hover:bg-secondary"
        >
          ⌫
        </button>
        <button
          onClick={() => push("0")}
          className="h-12 rounded-lg border bg-card text-lg font-medium hover:bg-secondary"
        >
          0
        </button>
        <span />
      </div>
      <div className="text-[11.5px] text-muted-foreground">
        Owner 1111 · Staff 2222 / 3333 in the demo
      </div>
    </div>
  );
}

function Palette({ onPick }: { onPick: (kind: string, id: string) => void }) {
  const { S } = useStore();
  const [q, setQ] = useState("");
  const [res, setRes] = useState<{ kind: string; id: string; title: string; sub: string }[]>([]);
  useEffect(() => {
    if (!S || q.trim().length < 2) {
      setRes([]);
      return undefined;
    }
    const t = setTimeout(
      () =>
        search(S.id, q)
          .then((r) => setRes(r.results))
          .catch(() => setRes([])),
      160,
    );
    return () => clearTimeout(t);
  }, [q, S]);
  const actions = [
    ["book", "Book an appointment"],
    ["walkin", "Walk-in"],
    ["nav:/calendar", "Open calendar"],
    ["nav:/insights", "Open insights"],
    ["nav:/settings", "Settings"],
  ].filter(([, l]) => !q || (l ?? "").toLowerCase().includes(q.toLowerCase()));
  return (
    <Command shouldFilter={false}>
      <CommandInput placeholder="Type a name, service or command…" value={q} onValueChange={setQ} />
      <CommandList>
        <CommandEmpty>Nothing found</CommandEmpty>
        {res.length > 0 && (
          <CommandGroup heading="Results">
            {res.map((r) => (
              <CommandItem
                key={r.kind + r.id}
                value={r.kind + r.id}
                onSelect={() => onPick(r.kind, r.id)}
              >
                <span className="w-24 text-[11px] tracking-wider text-muted-foreground uppercase">
                  {r.kind}
                </span>
                <span>{r.title}</span>
                <span className="ml-auto text-xs text-muted-foreground">{r.sub}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading="Actions">
          {actions.map(([k = "", l]) => (
            <CommandItem
              key={k}
              value={k}
              onSelect={() => (k.startsWith("nav:") ? onPick("nav", k.slice(4)) : onPick(k, ""))}
            >
              <span className="w-24 text-[11px] tracking-wider text-muted-foreground uppercase">
                action
              </span>
              {l}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
