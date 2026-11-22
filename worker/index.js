// G75 Worker: serves the static plan (assets) and /api/recovery, which pulls
// HRV, sleep and resting HR from Garmin Connect for the app's recovery tiles.
//
// Secrets (Cloudflare dashboard > Workers > godefroy-training-plan > Settings > Variables and Secrets):
//   GARMIN_EMAIL, GARMIN_PASSWORD  Garmin Connect login (account without two-step verification)
//   APP_KEY                        private key the app sends in the X-Key header
// Binding: KV namespace "KV" caches Garmin tokens and the last result.
//
// Garmin has no public API for individuals; this uses the same SSO + OAuth flow
// as the Garmin Connect mobile app (as implemented by the open-source "garth").

const SSO = "https://sso.garmin.com/sso";
const SSO_EMBED = SSO + "/embed";
const API = "https://connectapi.garmin.com";
const CONSUMER_URL = "https://thegarth.s3.amazonaws.com/oauth_consumer.json";
const UA_SSO = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
const UA_APP = "com.garmin.android.apps.connectmobile";
const TZ = "Europe/Brussels";
const DATA_TTL = 10 * 60;            // seconds a result is reused before asking Garmin again
const mem = {};                      // per-isolate fallback when no KV is bound

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/recovery") return recovery(request, env, ctx);
    return env.ASSETS.fetch(request);
  }
};

function json(body, status, extra) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: Object.assign({ "content-type": "application/json", "cache-control": "no-store" }, extra || {})
  });
}

async function kvGet(env, k) {
  if (env.KV) { const v = await env.KV.get(k); return v ? JSON.parse(v) : null; }
  const m = mem[k]; return m && m.exp > Date.now() ? m.v : null;
}
async function kvPut(env, k, v, ttl) {
  if (env.KV) return env.KV.put(k, JSON.stringify(v), ttl ? { expirationTtl: Math.max(60, ttl) } : undefined);
  mem[k] = { v, exp: ttl ? Date.now() + ttl * 1000 : Infinity };
}

async function recovery(request, env, ctx) {
  const missing = ["APP_KEY", "GARMIN_EMAIL", "GARMIN_PASSWORD"].filter(k => !env[k]);
  if (missing.length) return json({ error: "not set in Cloudflare: " + missing.join(", ") }, 503);
  if ((request.headers.get("x-key") || "").trim() !== String(env.APP_KEY).trim()) return json({ error: "key not accepted" }, 401);
  const cached = await kvGet(env, "data");
  if (cached && Date.now() - Date.parse(cached.updated) < DATA_TTL * 1000) return json(cached);
  try {
    const data = await collect(env);
    await kvPut(env, "data", data);
    return json(data);
  } catch (e) {
    if (cached) return json(Object.assign({}, cached, { stale: true, error: String(e.message || e) }));
    return json({ error: String(e.message || e) }, 502);
  }
}

// ---------- dates ----------
function localDate(offsetDays) {
  const d = new Date(Date.now() + (offsetDays || 0) * 864e5);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

// ---------- Garmin data ----------
async function collect(env) {
  const g = await garmin(env);
  const today = localDate(0);
  const prof = (await kvGet(env, "profile")) || await g.get("/userprofile-service/socialProfile").then(async p => { await kvPut(env, "profile", { displayName: p.displayName }); return p; });
  const who = encodeURIComponent(prof.displayName);
  const [hrv, sleep, rhr] = await Promise.all([
    getHrv(g, today).catch(() => null),
    getSleep(g, who, today).catch(() => null),
    getRhr(g, who, today).catch(() => null)
  ]);
  return { updated: new Date().toISOString(), date: today, hrv, sleep, rhr };
}

async function getHrv(g, today) {
  let days = [];
  try {
    const r = await g.get(`/hrv-service/hrv/daily/${localDate(-27)}/${today}`);
    days = (r.hrvSummaries || []).filter(s => s.weeklyAvg).map(s => ({
      date: s.calendarDate, weeklyAvg: s.weeklyAvg, status: s.status,
      balancedLow: s.baseline && s.baseline.balancedLow, balancedUpper: s.baseline && s.baseline.balancedUpper
    }));
  } catch (e) { /* the 4-week chart is optional */ }
  let cur = null;
  for (const d of [today, localDate(-1)]) {
    const r = await g.get(`/hrv-service/hrv/${d}`).catch(() => null);
    if (r && r.hrvSummary && r.hrvSummary.weeklyAvg) { cur = r.hrvSummary; break; }
  }
  if (!cur) return null;
  const b = cur.baseline || {};
  return { date: cur.calendarDate, status: cur.status, weeklyAvg: cur.weeklyAvg, lastNight: cur.lastNightAvg,
    lowUpper: b.lowUpper, balancedLow: b.balancedLow, balancedUpper: b.balancedUpper, days };
}

async function getSleep(g, who, today) {
  for (const d of [today, localDate(-1)]) {
    const r = await g.get(`/wellness-service/wellness/dailySleepData/${who}?date=${d}&nonSleepBufferMinutes=60`).catch(() => null);
    const s = r && r.dailySleepDTO;
    if (!s || !s.sleepTimeSeconds) continue;
    const sc = (s.sleepScores && s.sleepScores.overall) || {};
    const t0 = s.sleepStartTimestampGMT, names = ["deep", "light", "rem", "awake"];
    const levels = (r.sleepLevels || []).map(l => {
      const a = Date.parse(l.startGMT + "Z"), z = Date.parse(l.endGMT + "Z");
      return [names[Math.round(l.activityLevel)] || "light", Math.round((a - t0) / 6e4), Math.round((z - t0) / 6e4)];
    }).filter(l => l[2] > l[1]);
    const hm = ms => new Date(ms).toISOString().slice(11, 16);
    return { date: s.calendarDate, score: sc.value, qualifier: sc.qualifierKey, seconds: s.sleepTimeSeconds,
      deep: s.deepSleepSeconds, light: s.lightSleepSeconds, rem: s.remSleepSeconds, awake: s.awakeSleepSeconds,
      start: hm(s.sleepStartTimestampLocal), end: hm(s.sleepEndTimestampLocal), levels };
  }
  return null;
}

async function getRhr(g, who, today) {
  const r = await g.get(`/userstats-service/wellness/daily/${who}?fromDate=${localDate(-20)}&untilDate=${today}&metricId=60`);
  const m = r && r.allMetrics && r.allMetrics.metricsMap && r.allMetrics.metricsMap.WELLNESS_RESTING_HEART_RATE;
  const days = (m || []).filter(x => x.value).map(x => ({ date: x.calendarDate, value: Math.round(x.value) }));
  return days.length ? { days } : null;
}

// ---------- Garmin auth ----------
async function garmin(env) {
  let o2 = await kvGet(env, "oauth2");
  if (!o2 || o2.expires_at - 120 < Date.now() / 1000) o2 = await refreshOauth2(env);
  const get = async (path, retry) => {
    const res = await fetch(API + path, { headers: { authorization: "Bearer " + o2.access_token, "user-agent": UA_APP, "di-backend": "connectapi.garmin.com" } });
    if (res.status === 401 && !retry) { o2 = await refreshOauth2(env, true); return get(path, true); }
    if (res.status === 204) return null;
    if (!res.ok) throw new Error("Garmin " + res.status + " " + path.split("?")[0]);
    return res.json();
  };
  return { get };
}

async function refreshOauth2(env, forceLogin) {
  const consumer = await consumerKeys(env);
  let o1 = forceLogin ? null : await kvGet(env, "oauth1");
  let o2;
  if (o1) o2 = await exchange(consumer, o1).catch(() => null);
  if (!o2) {
    o1 = await login(env, consumer);
    await kvPut(env, "oauth1", o1, 300 * 864e2);  // Garmin's OAuth1 token lasts about a year
    o2 = await exchange(consumer, o1);
  }
  o2.expires_at = Math.floor(Date.now() / 1000) + (o2.expires_in || 3600);
  await kvPut(env, "oauth2", o2, o2.expires_in || 3600);
  return o2;
}

async function consumerKeys(env) {
  let c = await kvGet(env, "consumer");
  if (!c) {
    c = await (await fetch(CONSUMER_URL)).json();
    await kvPut(env, "consumer", c, 7 * 864e2);
  }
  return c;
}

async function exchange(consumer, o1) {
  const url = API + "/oauth-service/oauth/exchange/user/2.0";
  const auth = await oauthHeader("POST", url, {}, consumer, o1);
  const res = await fetch(url, { method: "POST", headers: { authorization: auth, "user-agent": UA_APP, "content-type": "application/x-www-form-urlencoded" }, body: "" });
  if (!res.ok) throw new Error("Garmin token exchange " + res.status);
  return res.json();
}

// SSO login with cookies kept by hand (fetch has no cookie jar).
async function login(env, consumer) {
  const jar = {};
  const go = async (url, opts) => {
    for (let i = 0; i < 6; i++) {
      const h = Object.assign({ "user-agent": UA_SSO }, (opts && opts.headers) || {});
      const ck = Object.entries(jar).map(([k, v]) => k + "=" + v).join("; ");
      if (ck) h.cookie = ck;
      const res = await fetch(url, Object.assign({}, opts, { headers: h, redirect: "manual" }));
      (res.headers.getSetCookie ? res.headers.getSetCookie() : []).forEach(c => {
        const p = c.split(";")[0], i2 = p.indexOf("="); if (i2 > 0) jar[p.slice(0, i2).trim()] = p.slice(i2 + 1).trim();
      });
      const loc = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && loc) { url = new URL(loc, url).toString(); opts = { method: "GET" }; continue; }
      return res;
    }
    throw new Error("Garmin SSO: too many redirects");
  };
  const qs = o => new URLSearchParams(o).toString();
  const embed = SSO_EMBED + "?" + qs({ id: "gauth-widget", embedWidget: "true", gauthHost: SSO });
  const signin = SSO + "/signin?" + qs({ id: "gauth-widget", embedWidget: "true", gauthHost: SSO_EMBED, service: SSO_EMBED,
    source: SSO_EMBED, redirectAfterAccountLoginUrl: SSO_EMBED, redirectAfterAccountCreationUrl: SSO_EMBED });
  await go(embed);
  const page = await (await go(signin, { headers: { referer: embed } })).text();
  const csrf = (page.match(/name="_csrf"\s+value="(.+?)"/) || [])[1];
  if (!csrf) throw new Error("Garmin SSO: no CSRF token (login page blocked?)");
  const res = await go(signin, { method: "POST", headers: { referer: signin, "content-type": "application/x-www-form-urlencoded" },
    body: qs({ username: env.GARMIN_EMAIL, password: env.GARMIN_PASSWORD, embed: "true", _csrf: csrf }) });
  const html = await res.text();
  if (/MFA|verifyMFA/i.test(html) && !/embed\?ticket=/.test(html)) throw new Error("Garmin SSO: two-step verification is on");
  const ticket = (html.match(/embed\?ticket=([^"]+)"/) || [])[1];
  if (!ticket) throw new Error("Garmin SSO: login failed (check email/password, or Garmin is rate-limiting)");
  const url = API + "/oauth-service/oauth/preauthorized";
  const params = { ticket, "login-url": SSO_EMBED, "accepts-mfa-tokens": "true" };
  const auth = await oauthHeader("GET", url, params, consumer, null);
  const r = await fetch(url + "?" + qs(params), { headers: { authorization: auth, "user-agent": UA_APP } });
  if (!r.ok) throw new Error("Garmin OAuth1 " + r.status);
  const o = Object.fromEntries(new URLSearchParams(await r.text()));
  if (!o.oauth_token) throw new Error("Garmin OAuth1: no token");
  return { oauth_token: o.oauth_token, oauth_token_secret: o.oauth_token_secret };
}

// ---------- OAuth 1.0a (HMAC-SHA1) ----------
const enc = s => encodeURIComponent(s).replace(/[!'()*]/g, c => "%" + c.charCodeAt(0).toString(16).toUpperCase());
export async function oauthHeader(method, url, params, consumer, token, nonce, ts) {
  const o = {
    oauth_consumer_key: consumer.consumer_key,
    oauth_nonce: nonce || crypto.randomUUID().replace(/-/g, ""),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: ts || String(Math.floor(Date.now() / 1000)),
    oauth_version: "1.0"
  };
  if (token) o.oauth_token = token.oauth_token;
  const all = Object.assign({}, params, o);
  const norm = Object.keys(all).map(k => [enc(k), enc(all[k])]).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1).map(p => p[0] + "=" + p[1]).join("&");
  const base = [method.toUpperCase(), enc(url), enc(norm)].join("&");
  const key = enc(consumer.consumer_secret) + "&" + (token ? enc(token.oauth_token_secret) : "");
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(base)))));
  o.oauth_signature = sig;
  return "OAuth " + Object.keys(o).map(k2 => enc(k2) + '="' + enc(o[k2]) + '"').join(", ");
}
