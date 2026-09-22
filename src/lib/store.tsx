/* App state: one snapshot from the API, refreshed after every mutation. Pages call `act` with a function that
   returns the new state (or an object carrying `state`). PIN sign-in and the chosen business live in localStorage. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { api, getState, listLocations, loc, signIn, unwrap, type WithState } from "./api";
import type { Level, Me, State } from "./types";

const LOC_KEY = "hl-bookings-loc";
const rank: Record<Level, number> = { owner: 3, desk: 2, staff: 1 };

export interface Store {
  S: State | null;
  loading: boolean;
  error: string | null;
  me: Me | null;
  refresh: (quiet?: boolean) => Promise<void>;
  act: <T = unknown>(
    fn: () => Promise<T>,
    okMsg?: string | ((r: T) => string),
  ) => Promise<T | undefined>;
  setState: (s: State) => void;
  switchLocation: (id: string) => void;
  pinSignIn: (pin: string) => Promise<Me>;
  signOut: () => void;
  can: (lvl: Level) => boolean;
  L: (path: string) => string;
}

const Ctx = createContext<Store | null>(null);

function readLocal(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeLocal(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* private mode or blocked storage: the app still works for this session */
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [S, setS] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const locId = useRef<string | null>(null);

  const refresh = useCallback(async (quiet = false) => {
    try {
      const locs = await listLocations();
      let id = readLocal(LOC_KEY);
      if (!locs.some((l) => l.id === id)) {
        id = locs[0]?.id ?? null;
        writeLocal(LOC_KEY, id);
      }
      if (!id) throw new Error("No businesses in the database");
      locId.current = id;
      const st = await getState(id);
      setS(st);
      try {
        const saved = JSON.parse(readLocal("hl-bookings-me-" + id) || "null") as Me | null;
        setMe(saved && st.staff.some((s) => s.id === saved.id) ? saved : null);
      } catch {
        setMe(null);
      }
      setError(null);
    } catch (e) {
      if (!quiet) setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(true), 60000);
    return () => clearInterval(t);
  }, [refresh]);

  const act = useCallback(
    async <T = unknown,>(fn: () => Promise<T>, okMsg?: string | ((r: T) => string)) => {
      try {
        const r = await fn();
        const st = r && typeof r === "object" ? unwrap(r as WithState | State) : null;
        if (st && (st as State).id && (st as State).staff) setS(st as State);
        if (okMsg) toast(typeof okMsg === "function" ? okMsg(r) : okMsg);
        return r;
      } catch (e) {
        toast.error((e as Error).message);
        return undefined;
      }
    },
    [],
  );

  const value = useMemo<Store>(
    () => ({
      S,
      loading,
      error,
      me,
      refresh,
      act,
      setState: (s) => setS(s),
      switchLocation: (id) => {
        writeLocal(LOC_KEY, id);
        setMe(null);
        setLoading(true);
        void refresh();
      },
      pinSignIn: async (pin) => {
        const r = await signIn(locId.current ?? "", pin);
        setMe(r.staff);
        writeLocal("hl-bookings-me-" + locId.current, JSON.stringify(r.staff));
        return r.staff;
      },
      signOut: () => {
        setMe(null);
        writeLocal("hl-bookings-me-" + locId.current, null);
      },
      can: (lvl) => !me || rank[me.level || "staff"] >= rank[lvl],
      L: (path) => loc(locId.current || S?.id || "") + path,
    }),
    [S, loading, error, me, refresh, act],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside StoreProvider");
  return v;
}
export { api };
