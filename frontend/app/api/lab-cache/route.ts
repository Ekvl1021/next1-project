import type { NextRequest } from "next/server";
export async function GET(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_LAB_MEASUREMENTS !== "1") return new Response(null, { status: 404 });
  const mode = request.nextUrl.searchParams.get("mode");
  const resource = request.nextUrl.searchParams.get("resource");
  if (!["no-store", "revalidate"].includes(mode || "") || !["courses", "departments"].includes(resource || "")) {
    return Response.json({ message: "Invalid experiment parameters" }, { status: 400 });
  }
  const authorization = request.headers.get("authorization");
  if (!authorization) return Response.json({ message: "Authentication required" }, { status: 401 });
  const base = process.env.API_URL || "http://localhost:3002";
  const response = await fetch(`${base}/${resource}`, {
    headers: { Authorization: authorization },
    ...(mode === "no-store" ? { cache: "no-store" as const } : { next: { revalidate: 60 } }),
  });
  return Response.json(await response.json(), { status: response.status });
}
