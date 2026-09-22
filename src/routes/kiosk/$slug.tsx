/* Check-in kiosk for a tablet at the door: last digits of the mobile number → today's appointment or class is checked in. */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { pub } from "@/lib/api";

export const Route = createFileRoute("/kiosk/$slug")({
  ssr: false,
  head: () => ({ meta: [{ title: "Check in" }] }),
  component: KioskPage,
});

type Result = Awaited<ReturnType<typeof pub.kiosk>>;

function KioskPage() {
  const { slug } = Route.useParams();
  const [name, setName] = useState("Check in");
  const [buf, setBuf] = useState("");
  const [err, setErr] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  useEffect(() => {
    pub
      .info(slug)
      .then((p) => {
        setName(p.name);
        document.title = `Check in · ${p.name}`;
      })
      .catch(() => null);
  }, [slug]);
  useEffect(() => {
    if (!res) return undefined;
    const t = setTimeout(() => {
      setRes(null);
      setBuf("");
    }, 6000);
    return () => clearTimeout(t);
  }, [res]);
  const go = async () => {
    setErr("");
    try {
      setRes(await pub.kiosk(slug, buf));
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  const K = ({
    children,
    onClick,
    primary,
  }: {
    children: ReactNode;
    onClick: () => void;
    primary?: boolean;
  }) => (
    <button
      onClick={onClick}
      className={`h-16 rounded-2xl border text-2xl font-semibold ${primary ? "border-primary bg-primary text-primary-foreground" : "border-[#262a33] bg-[#171a21] text-[#f3f4f6] active:bg-[#20242d]"}`}
    >
      {children}
    </button>
  );
  return (
    <div className="grid min-h-screen place-items-center bg-[#0f1115] p-4 text-[#f3f4f6]">
      <div className="flex w-full max-w-[440px] flex-col gap-4 text-center">
        {res ? (
          <div className="rounded-2xl border border-[#262a33] bg-[#171a21] p-6 text-left">
            <h2 className="text-2xl font-semibold">Welcome back, {res.name}</h2>
            {res.checked_in.length ? (
              res.checked_in.map((x) => (
                <div key={x} className="mt-1 text-[#34c46b]">
                  ✓ Checked in · {x}
                </div>
              ))
            ) : (
              <div className="mt-1 text-sm text-[#6b7280]">
                Nothing to check in right now. Ask at the desk.
              </div>
            )}
            {res.membership && (
              <div className="mt-3">
                {res.membership.name} ·{" "}
                <span
                  className={
                    res.membership.status === "active" ? "text-[#34c46b]" : "text-[#ef5350]"
                  }
                >
                  {res.membership.status}
                </span>
                {res.membership.remaining != null && ` · ${res.membership.remaining} left`} · ends{" "}
                {res.membership.expires}
              </div>
            )}
            <div className="mt-3 text-sm text-[#6b7280]">Resetting…</div>
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
              <div className="text-[#a5adba]">Enter the last 4 digits of your mobile number</div>
            </div>
            <div className="flex min-h-[52px] items-center justify-center gap-2.5">
              {Array.from({ length: Math.max(4, buf.length + 1) }, (_, i) => (
                <span
                  key={i}
                  className={`h-[52px] w-[34px] border-b-2 text-3xl leading-[52px] font-semibold ${i < buf.length ? "border-primary" : "border-[#262a33]"}`}
                >
                  {buf[i] ?? ""}
                </span>
              ))}
            </div>
            {err && <div className="text-[#ef5350]">{err}</div>}
            <div className="grid grid-cols-3 gap-2.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <K key={n} onClick={() => buf.length < 10 && setBuf(buf + n)}>
                  {n}
                </K>
              ))}
              <K onClick={() => setBuf(buf.slice(0, -1))}>⌫</K>
              <K onClick={() => buf.length < 10 && setBuf(buf + "0")}>0</K>
              <K primary onClick={go}>
                Go
              </K>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
