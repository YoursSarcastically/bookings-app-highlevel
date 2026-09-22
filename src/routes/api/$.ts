import { createFileRoute } from "@tanstack/react-router";

/**
 * Same-origin proxy for the Bookings API. The browser calls /api/... on this app;
 * this route forwards the request to the Python server so no CORS or client-side
 * host configuration is needed in dev or in production.
 *
 * Point API_URL at the Python server (default http://127.0.0.1:8787).
 */
const API_URL =
  (typeof process !== "undefined" && process.env?.["API_URL"]) || "http://127.0.0.1:8787";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "host",
  "content-length",
  "accept-encoding",
]);

async function proxy({ request, params }: { request: Request; params: { _splat?: string } }) {
  const url = new URL(request.url);
  const target = `${API_URL}/api/${params._splat ?? ""}${url.search}`;
  const headers = new Headers();
  request.headers.forEach((v, k) => {
    if (!HOP_BY_HOP.has(k.toLowerCase())) headers.set(k, v);
  });
  const hasBody = !["GET", "HEAD"].includes(request.method);
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : null,
    });
  } catch (e) {
    return Response.json(
      {
        error: `API not reachable at ${API_URL} (${(e as Error).message}). Start it with: npm run api`,
      },
      { status: 502 },
    );
  }
  const out = new Headers();
  upstream.headers.forEach((v, k) => {
    if (!HOP_BY_HOP.has(k.toLowerCase())) out.set(k, v);
  });
  return new Response(upstream.body, { status: upstream.status, headers: out });
}

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: { GET: proxy, POST: proxy, PATCH: proxy, PUT: proxy, DELETE: proxy },
  },
});
