// Celebration photos.
// GET  /api/photo?id=...            -> the image (the TV uses this)
// POST /api/photo  (header x-board-pin) -> upload an image, returns {id}
import { getStore } from "@netlify/blobs";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX = 5 * 1024 * 1024;

export default async (req) => {
  const photos = getStore({ name: "bt120-photos", consistency: "strong" });
  const url = new URL(req.url);

  if (req.method === "GET") {
    const id = url.searchParams.get("id") || "";
    if (!/^[a-f0-9]{10,40}$/.test(id)) return new Response("Not found", { status: 404 });
    const hit = await photos.getWithMetadata(id, { type: "arrayBuffer" });
    if (!hit) return new Response("Not found", { status: 404 });
    return new Response(hit.data, {
      headers: {
        "content-type": ALLOWED.includes(hit.metadata?.type) ? hit.metadata.type : "image/jpeg",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  }

  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const PIN = process.env.BOARD_PIN;
  if (!PIN) return Response.json({ error: "no_pin" }, { status: 500 });
  if (String(req.headers.get("x-board-pin") ?? "") !== String(PIN))
    return Response.json({ error: "wrong_pin" }, { status: 401 });

  const type = (req.headers.get("content-type") || "").split(";")[0].trim();
  if (!ALLOWED.includes(type)) return Response.json({ error: "bad_type" }, { status: 400 });
  const data = await req.arrayBuffer();
  if (!data.byteLength || data.byteLength > MAX) return Response.json({ error: "too_large" }, { status: 400 });

  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  await photos.set(id, data, { metadata: { type } });
  return Response.json({ id });
};

export const config = { path: "/api/photo" };
