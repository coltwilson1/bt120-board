// Breakthrough 120 board: stores all board data in Netlify Blobs.
// GET  /api/board  -> the whole board (anyone can read; the TV uses this)
// POST /api/board  -> a change, only with the correct PIN (set BOARD_PIN in Netlify)
import { getStore } from "@netlify/blobs";

const METRICS = ["calls", "appts", "listings", "contracts", "closings"];
const TYPES = ["closed", "contract", "listing", "other"];
const DEFAULT = {
  settings: { title: "Breakthrough 120", week: "Coaching Scoreboard", goals: {}, slideSeconds: 10 },
  agents: [],
  shouts: [],
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
const num = (v) => Math.max(0, Math.min(10000000, Math.floor(Number(v) || 0)));
const str = (v, max = 200) => String(v ?? "").trim().slice(0, max);
const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 20);

export default async (req) => {
  const store = getStore({ name: "bt120", consistency: "strong" });
  const photos = getStore({ name: "bt120-photos", consistency: "strong" });
  const load = async () => (await store.get("board", { type: "json" })) || structuredClone(DEFAULT);

  if (req.method === "GET") return json(await load());
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const PIN = process.env.BOARD_PIN;
  if (!PIN) return json({ error: "no_pin" }, 500);

  let body;
  try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }
  if (String(body.pin ?? "") !== String(PIN)) return json({ error: "wrong_pin" }, 401);

  const b = await load();
  const p = body.payload || {};

  switch (body.action) {
    case "checkPin":
      return json(b);

    case "addAgent": {
      const name = str(p.name, 80);
      if (!name) return json({ error: "bad_request" }, 400);
      const a = { id: newId(), name, order: b.agents.reduce((m, x) => Math.max(m, x.order || 0), 0) + 1 };
      METRICS.forEach((k) => (a[k] = 0));
      b.agents.push(a);
      break;
    }

    case "updateAgent": {
      const a = b.agents.find((x) => x.id === p.id);
      if (!a) break;
      const patch = p.patch || {};
      if ("name" in patch && str(patch.name, 80)) a.name = str(patch.name, 80);
      METRICS.forEach((k) => { if (k in patch) a[k] = num(patch[k]); });
      break;
    }

    case "deleteAgent":
      b.agents = b.agents.filter((x) => x.id !== p.id);
      break;

    case "addShout": {
      const name = str(p.name, 80);
      if (!name) return json({ error: "bad_request" }, 400);
      b.shouts.unshift({
        id: newId(),
        name,
        type: TYPES.includes(p.type) ? p.type : "other",
        detail: str(p.detail, 160),
        photo: typeof p.photo === "string" && /^[a-f0-9]{10,40}$/.test(p.photo) ? p.photo : null,
        createdAt: new Date().toISOString(),
      });
      const dropped = b.shouts.slice(40);
      b.shouts = b.shouts.slice(0, 40);
      for (const s of dropped) if (s.photo) await photos.delete(s.photo);
      break;
    }

    case "updateShout": {
      const s = b.shouts.find((x) => x.id === p.id);
      if (!s) return json({ error: "not_found" }, 404);
      const name = str(p.name, 80);
      if (!name) return json({ error: "bad_request" }, 400);
      const newPhoto = typeof p.photo === "string" && /^[a-f0-9]{10,40}$/.test(p.photo) ? p.photo : null;
      if (s.photo && s.photo !== newPhoto) await photos.delete(s.photo);
      s.name = name;
      s.type = TYPES.includes(p.type) ? p.type : "other";
      s.detail = str(p.detail, 160);
      s.photo = newPhoto;
      s.updatedAt = new Date().toISOString();
      break;
    }

    case "deleteShout": {
      const s = b.shouts.find((x) => x.id === p.id);
      b.shouts = b.shouts.filter((x) => x.id !== p.id);
      if (s && s.photo) await photos.delete(s.photo);
      break;
    }

    case "saveSettings": {
      const goals = {};
      METRICS.forEach((k) => { const v = num((p.goals || {})[k]); if (v) goals[k] = v; });
      b.settings = {
        title: str(p.title, 60) || DEFAULT.settings.title,
        week: str(p.week, 80),
        goals,
        slideSeconds: Math.min(120, Math.max(4, num(p.slideSeconds) || 10)),
      };
      break;
    }

    case "resetWeek":
      b.agents.forEach((a) => METRICS.forEach((k) => (a[k] = 0)));
      break;

    default:
      return json({ error: "bad_request" }, 400);
  }

  await store.setJSON("board", b);
  return json(b);
};

export const config = { path: "/api/board" };
