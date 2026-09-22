/* Website & booking: public pages, kiosk, manage link, HighLevel Sites pages and funnels. */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Card, Empty, PageHead, Tag } from "@/components/app/Bits";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_app/website")({
  head: () => ({ meta: [{ title: "Website & booking — Bookings" }] }),
  component: Website,
});

interface Funnel {
  id: string;
  name: string;
  type: string;
  url: string;
  steps: { id: string; name: string; url: string }[];
}

function Website() {
  const { S, act, L } = useStore();
  const [funnels, setFunnels] = useState<Funnel[] | null>(null);
  const [busy, setBusy] = useState(false);
  if (!S) return null;
  const host = location.host;
  const load = async () => {
    setBusy(true);
    try {
      setFunnels((await api.get<{ funnels: Funnel[] }>(L("/hl/funnels"))).funnels);
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(false);
  };
  return (
    <>
      <PageHead
        title="Website & booking"
        sub="Your public pages, built from the catalog and the team."
      >
        <Button
          variant="outline"
          onClick={() =>
            navigator.clipboard
              ?.writeText(`${location.origin}/book/${S.slug}`)
              .then(() => toast("Copied"))
          }
        >
          Copy booking link
        </Button>
        <Button onClick={() => window.open(`/book/${S.slug}`, "_blank")}>
          Open booking page ↗
        </Button>
      </PageHead>
      <div className="grid grid-cols-3 gap-3.5 max-lg:grid-cols-1">
        <Card>
          <h2 className="text-[15px] font-semibold">Booking page</h2>
          <div className="font-mono text-xs text-muted-foreground">
            {host}/book/{S.slug}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Service → person → day → time → name. Honours deposits, add-ons, blocked time and the
            Busy switch. Every booking gets a manage link.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2.5"
            onClick={() => window.open(`/book/${S.slug}`, "_blank")}
          >
            Open ↗
          </Button>
        </Card>
        <Card>
          <h2 className="text-[15px] font-semibold">Check-in kiosk</h2>
          <div className="font-mono text-xs text-muted-foreground">
            {host}/kiosk/{S.slug}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            A tablet at the door. Clients type the last digits of their mobile; today’s appointment
            or class is checked in and their membership status is shown.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2.5"
            onClick={() => window.open(`/kiosk/${S.slug}`, "_blank")}
          >
            Open ↗
          </Button>
        </Card>
        <Card>
          <h2 className="text-[15px] font-semibold">Manage link</h2>
          <div className="font-mono text-xs text-muted-foreground">
            {host}/manage/{S.slug}/…
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Sent with every confirmation. The client can reschedule to any open slot or cancel,
            within your policy window. Late cancellations charge the fee when a card is on file.
          </p>
        </Card>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="item bg-secondary/60">
          <b>Pages</b>
          <span className="text-xs text-muted-foreground">· on HighLevel Sites</span>
        </div>
        {S.pages.map((pg) => (
          <div key={pg.id} className="item">
            <div className="min-w-0 flex-1">
              <b className="font-semibold">{pg.name}</b>{" "}
              <span className="text-xs text-muted-foreground">
                · /{pg.id === "home" ? "" : pg.id} · {pg.note}
              </span>
            </div>
            <Tag tone={pg.on ? "green" : undefined}>{pg.on ? "live" : "hidden"}</Tag>
            <Switch
              checked={pg.on}
              onCheckedChange={(on) => act(() => api.patch(L(`/pages/${pg.id}`), { on }))}
            />
          </div>
        ))}
      </div>
      {S.hl.linked && (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-[15px] font-semibold">HighLevel funnels & websites</h2>
              <div className="text-xs text-muted-foreground">
                {S.hlFunnel ? (
                  <>
                    Website: <b>{S.hlFunnel.name}</b>
                    {S.hlFunnel.url && ` · ${S.hlFunnel.url}`}
                  </>
                ) : (
                  "Pick the funnel or website that is this business’s site."
                )}
              </div>
            </div>
            <div className="flex gap-1.5">
              {S.hlFunnel && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => act(() => api.post(L("/hl/funnel"), {}), "Website unlinked")}
                >
                  Unlink
                </Button>
              )}
              <Button size="sm" disabled={busy} onClick={load}>
                {funnels ? "Refresh" : "Load from HighLevel"}
              </Button>
            </div>
          </div>
          {funnels &&
            (funnels.length ? (
              <div className="mt-2">
                {funnels.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-2 border-b py-2 text-xs last:border-b-0"
                  >
                    <div className="min-w-0 flex-1 truncate">
                      <b>{f.name}</b>{" "}
                      <span className="text-muted-foreground">
                        · {f.type} · {f.steps.length} page{f.steps.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    {f.url && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs"
                        onClick={() => window.open(f.url, "_blank")}
                      >
                        Open ↗
                      </Button>
                    )}
                    {S.hlFunnel?.id === f.id ? (
                      <Tag tone="green">website</Tag>
                    ) : (
                      <Button
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() =>
                          act(
                            () => api.post(L("/hl/funnel"), { id: f.id, name: f.name, url: f.url }),
                            `${f.name} is now the website`,
                          )
                        }
                      >
                        Use as website
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Empty title="No funnels or websites in this sub-account" />
            ))}
        </Card>
      )}
    </>
  );
}
