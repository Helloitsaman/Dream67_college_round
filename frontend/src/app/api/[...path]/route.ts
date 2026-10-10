import { NextRequest } from "next/server";

const GET_ROUTES = [
  /^health$/,
  /^agents$/,
  /^suites$/,
  /^policies$/,
  /^defenses$/,
  /^runs$/,
  /^runs\/[A-Za-z0-9-]+$/,
  /^runs\/[A-Za-z0-9-]+\/(events|findings)$/,
  /^regressions\/[A-Za-z0-9-]+$/,
  /^reports\/[A-Za-z0-9-]+$/,
];

const POST_ROUTES = [
  /^runs$/,
  /^runs\/[A-Za-z0-9-]+\/cancel$/,
  /^regressions$/,
];

function isAllowed(method: string, path: string): boolean {
  const routes = method === "GET" ? GET_ROUTES : method === "POST" ? POST_ROUTES : [];
  return routes.some((route) => route.test(path));
}

function mutationIsSameOrigin(request: NextRequest): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) return false;
  const origin = request.headers.get("origin");
  return !origin || new URL(origin).host === request.nextUrl.host;
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path: segments } = await context.params;
  const path = segments.join("/");
  if (!isAllowed(request.method, path)) {
    return Response.json({ detail: "Route is not available through the AgentBreak BFF." }, { status: 404 });
  }
  if (request.method !== "GET" && !mutationIsSameOrigin(request)) {
    return Response.json({ detail: "Cross-site mutation rejected." }, { status: 403 });
  }

  const upstreamBase = (process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");
  const upstreamPath = path === "health" ? "/health" : `/v1/${path}`;
  const upstreamUrl = new URL(`${upstreamBase}${upstreamPath}`);
  request.nextUrl.searchParams.forEach((value, key) => upstreamUrl.searchParams.append(key, value));

  const headers = new Headers({ Accept: request.headers.get("accept") ?? "application/json" });
  if (path !== "health") {
    headers.set(
      "Authorization",
      `Bearer ${process.env.BACKEND_SERVICE_TOKEN ?? "dev-agentbreak-token"}`,
    );
  }

  let body: string | undefined;
  if (request.method !== "GET") {
    body = await request.text();
    if (body.length > 65_536) {
      return Response.json({ detail: "Request body is too large." }, { status: 413 });
    }
    headers.set("Content-Type", "application/json");
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(65_000),
    });
    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", upstream.headers.get("content-type") ?? "application/json");
    const disposition = upstream.headers.get("content-disposition");
    if (disposition) responseHeaders.set("Content-Disposition", disposition);
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return Response.json(
      { detail: "AgentBreak backend is unavailable. Start the FastAPI service and try again." },
      { status: 503 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
