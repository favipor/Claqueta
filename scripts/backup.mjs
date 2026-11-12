// Copia de seguridad de Claqueta: exporta todas las tablas (y los usuarios) a un JSON.
// La ejecuta GitHub Actions cada semana (.github/workflows/backup.yml); el archivo se cifra antes de guardarse.
import { writeFileSync } from "node:fs";

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const TABLES = [
  "profiles", "admins", "user_titles", "user_seasons", "user_episodes", "follows", "profile_visits",
  "comments", "comment_reports", "comment_blocks", "lists", "list_items", "notifications",
  "dm_threads", "messages", "dm_reads", "user_blocks", "push_subscriptions",
  "analytics_daily", "analytics_users", "error_logs",
];

async function table(name) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${URL_}/rest/v1/${name}?select=*`, { headers: { ...H, Range: `${from}-${from + 999}`, "Range-Unit": "items" } });
    if (res.status === 404) return null; // tabla que aún no existe
    if (!res.ok) throw new Error(`${name}: ${res.status} ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

async function users() {
  const out = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`${URL_}/auth/v1/admin/users?page=${page}&per_page=1000`, { headers: H });
    if (!res.ok) throw new Error(`usuarios: ${res.status}`);
    const { users: list } = await res.json();
    out.push(...list.map((u) => ({ id: u.id, email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at, app_metadata: u.app_metadata, user_metadata: u.user_metadata })));
    if (list.length < 1000) return out;
  }
}

const backup = { created_at: new Date().toISOString(), tables: {}, auth_users: await users() };
for (const t of TABLES) {
  const rows = await table(t);
  if (rows) backup.tables[t] = rows;
  console.log(`${t}: ${rows ? rows.length : "no existe"}`);
}
console.log(`usuarios: ${backup.auth_users.length}`);
writeFileSync("backup.json", JSON.stringify(backup));
