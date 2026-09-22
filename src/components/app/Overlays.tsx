/* One place that owns the "open thing": appointment, pay sheet, client drawer, roster, sell pass, new client, book.
   Pages call useOverlays() and get openers; the provider renders whichever is open.
   ?open=<client> and ?appt=<id> in the URL open the matching overlay once (used by the ⌘K palette). */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useLocation, useRouter } from "@tanstack/react-router";
import { ApptDialog, PayDialog } from "@/components/app/ApptDialog";
import { ClientDrawer, NewClientDialog, SellPassDialog } from "@/components/app/ClientDrawer";
import { RosterDialog } from "@/components/app/Dialogs";
import BookDialog, { type BookPreset } from "@/components/app/BookDialog";

type Open =
  | { kind: "appt"; id: string }
  | { kind: "pay"; id: string }
  | { kind: "client"; id: string }
  | { kind: "roster"; id: string; date: string }
  | { kind: "sell"; clientId: string | null; after?: string | null | undefined }
  | { kind: "newclient" }
  | { kind: "book"; preset: BookPreset }
  | null;
interface Ov {
  open: (o: Open) => void;
  appt: (id: string) => void;
  pay: (id: string) => void;
  client: (id: string) => void;
  roster: (id: string, date: string) => void;
  sell: (clientId: string | null, after?: string | null) => void;
  newClient: () => void;
  book: (preset?: BookPreset) => void;
}
const Ctx = createContext<Ov | null>(null);
export function useOverlays() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useOverlays outside provider");
  return v;
}

/** Search params as plain strings, whatever route we are on. */
export function useQuery(): Record<string, string | undefined> {
  const search = useLocation({ select: (l) => l.search }) as Record<string, unknown>;
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(search)) out[k] = v === undefined ? undefined : String(v);
  return out;
}

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [o, setO] = useState<Open>(null);
  const router = useRouter();
  const pathname = useLocation({ select: (l) => l.pathname });
  const q = useQuery();
  const openId = q["open"],
    appt = q["appt"];
  useEffect(() => {
    if (openId) setO({ kind: "client", id: openId });
    if (appt) setO({ kind: "appt", id: appt });
    if (openId || appt) router.history.replace(pathname);
  }, [openId, appt, pathname, router]);
  const api: Ov = {
    open: setO,
    appt: (id) => setO({ kind: "appt", id }),
    pay: (id) => setO({ kind: "pay", id }),
    client: (id) => setO({ kind: "client", id }),
    roster: (id, date) => setO({ kind: "roster", id, date }),
    sell: (clientId, after) => setO({ kind: "sell", clientId, after }),
    newClient: () => setO({ kind: "newclient" }),
    book: (preset = {}) => setO({ kind: "book", preset }),
  };
  const close = () => setO(null);
  return (
    <Ctx.Provider value={api}>
      {children}
      {o?.kind === "appt" && (
        <ApptDialog id={o.id} onClose={close} onClient={api.client} onPay={api.pay} />
      )}
      {o?.kind === "pay" && (
        <PayDialog id={o.id} onClose={close} onSellPass={(cid, after) => api.sell(cid, after)} />
      )}
      {o?.kind === "client" && (
        <ClientDrawer
          id={o.id}
          onClose={close}
          onBook={(cid) => api.book({ clientId: cid })}
          onAppt={api.appt}
          onSell={(cid) => api.sell(cid)}
        />
      )}
      {o?.kind === "roster" && <RosterDialog classId={o.id} date={o.date} onClose={close} />}
      {o?.kind === "sell" && (
        <SellPassDialog
          clientId={o.clientId}
          after={o.after ?? null}
          onClose={close}
          onSold={(after) => api.pay(after)}
        />
      )}
      {o?.kind === "newclient" && (
        <NewClientDialog onClose={close} onCreated={(id) => api.client(id)} />
      )}
      {o?.kind === "book" && <BookDialog open onClose={close} preset={o.preset} />}
    </Ctx.Provider>
  );
}
