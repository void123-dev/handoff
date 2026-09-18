export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400",
};

export function corsOptions(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function corsJson(data: unknown, init?: { status?: number; extra?: HeadersInit }): Response {
  return Response.json(data, {
    status: init?.status ?? 200,
    headers: {
      ...CORS_HEADERS,
      "Cache-Control": "public, max-age=12",
      ...(init?.extra ?? {}),
    },
  });
}

export function corsText(
  body: string,
  contentType: string,
  extra?: HeadersInit,
): Response {
  return new Response(body, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Cache-Control": "public, max-age=12",
      "Content-Type": contentType,
      ...(extra ?? {}),
    },
  });
}
