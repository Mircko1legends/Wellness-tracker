"use strict";
/* Care Package — two roles:
 *   receiver (her, English UI): adds wishes with a photo and the product link, owns her delivery address
 *   giver    (you, Italian UI): sees wishes with prices, buys them, tracks budget
 * Data lives in Supabase (see supabase/schema.sql). Without config.js values it runs in demo mode. */

const CFG = window.CP_CONFIG || {};
const LIVE = !!(CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase);

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "text") e.textContent = v;
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat()) {
    if (c == null || c === false) continue;
    e.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return e;
}
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 2400);
}
const safeUrl = u => (/^https?:\/\//i.test(u || "") ? u : null);
const money = (n, cur) => new Intl.NumberFormat(cur === "EUR" ? "it-IT" : "en-ZA",
  { style: "currency", currency: cur, maximumFractionDigits: cur === "EUR" ? 2 : 0 }).format(n || 0);
const monthStart = () => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d.getTime(); };
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now());
function shopFromLink(link) {
  try { return new URL(link).hostname.replace(/^www\./, "").split(".")[0].replace(/^\w/, c => c.toUpperCase()); }
  catch { return ""; }
}
async function run(promise, ok) {
  try { const r = await promise; if (ok) toast(ok); return r; }
  catch (e) { console.error(e); toast(S.role === "giver" ? "Salvataggio non riuscito, riprova" : "Couldn't save, please try again"); }
}
/* Shrinks a photo to max 900px JPEG so uploads stay small */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 900 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => (b ? resolve(b) : reject(new Error("compress failed"))), "image/jpeg", 0.82);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
const blobToDataUrl = b => new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });

/* ---------- state ---------- */
const S = { role: null, email: "", tab: null, wishes: [], prices: {}, settings: { budget_eur: 50, eur_to_zar: 20 },
  myAddress: null, sharedAddress: null, draftImage: null, draftPriority: 2 };
let store = null;

/* ---------- demo store (browser only) ---------- */
function DemoStore() {
  const KEY = "care-package-demo";
  let db;
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch { db = null; }
  if (!db) {
    const now = Date.now();
    db = {
      role: "receiver",
      wishes: [
        { id: "d1", created_at: now - 3e5, title: "Simba Chips Salt & Vinegar 120g", shop: "Checkers", link: "", image: null, emoji: "🍟", priority: 3, note: "the big bag pls", wanted_when: "Friday night", status: "wished" },
        { id: "d2", created_at: now - 2e5, title: "Sour Jelly Tots 100g", shop: "Woolworths", link: "", image: null, emoji: "🍬", priority: 2, note: "", wanted_when: "", status: "wished" },
        { id: "d3", created_at: now - 1e5, title: "Grey oversized hoodie, M", shop: "Superbalist", link: "", image: null, emoji: "🧥", priority: 1, note: "", wanted_when: "", status: "ordered", ordered_at: now - 5e4 }
      ],
      prices: { d1: 32, d2: 25, d3: 449 },
      settings: { budget_eur: 50, eur_to_zar: 20 },
      address: { address: "12 Example Road, Rondebosch", city: "Cape Town", phone: "", notes: "Example data", shared: true }
    };
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast("Demo storage full: remove a photo"); } };
  const changed = () => { save(); load().then(render); };
  return {
    demo: true,
    async init() { return { role: db.role, email: "demo" }; },
    async switchRole() { db.role = db.role === "giver" ? "receiver" : "giver"; save(); location.reload(); },
    async signOut() { localStorage.removeItem(KEY); location.reload(); },
    async listWishes() { return db.wishes.slice().sort((a, b) => b.created_at - a.created_at).map(w => ({ ...w, imageUrl: w.image })); },
    async addWish(w, imageBlob) { const image = imageBlob ? await blobToDataUrl(imageBlob) : null; db.wishes.push({ ...w, id: uid(), created_at: Date.now(), status: "wished", image }); changed(); },
    async updateWish(id, patch) { Object.assign(db.wishes.find(w => w.id === id), patch); changed(); },
    async deleteWish(id) { db.wishes = db.wishes.filter(w => w.id !== id); delete db.prices[id]; changed(); },
    async getPrices() { return { ...db.prices }; },
    async setPrice(id, zar) { if (zar == null) delete db.prices[id]; else db.prices[id] = zar; changed(); },
    async getSettings() { return { ...db.settings }; },
    async saveSettings(s) { db.settings = s; changed(); },
    async getMyAddress() { return db.address; },
    async saveMyAddress(a) { db.address = a; changed(); },
    async getSharedAddress() { return db.address && db.address.shared ? db.address : null; },
    subscribe() {}
  };
}

/* ---------- live store (Supabase) ---------- */
function SupaStore() {
  const sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);
  let me = null;
  const must = ({ data, error }) => { if (error) throw error; return data; };
  return {
    demo: false, sb,
    async init() {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return null;
      me = session.user;
      const role = must(await sb.rpc("my_role"));
      return { role, email: me.email };
    },
    async signIn(email) {
      return must(await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: true } }));
    },
    async signOut() { await sb.auth.signOut(); location.reload(); },
    async listWishes() {
      const rows = must(await sb.from("wishes").select("*").order("created_at", { ascending: false }));
      const paths = rows.map(r => r.image_path).filter(Boolean);
      let urls = {};
      if (paths.length) {
        const signed = must(await sb.storage.from("wish-images").createSignedUrls(paths, 60 * 60 * 6));
        signed.forEach(s => { if (s.signedUrl) urls[s.path] = s.signedUrl; });
      }
      return rows.map(r => ({ ...r, created_at: Date.parse(r.created_at), ordered_at: r.ordered_at ? Date.parse(r.ordered_at) : null, imageUrl: urls[r.image_path] || null }));
    },
    async addWish(w, imageBlob) {
      let image_path = null;
      if (imageBlob) {
        image_path = me.id + "/" + uid() + ".jpg";
        must(await sb.storage.from("wish-images").upload(image_path, imageBlob, { contentType: "image/jpeg" }));
      }
      must(await sb.from("wishes").insert({ title: w.title, shop: w.shop, link: w.link, priority: w.priority, note: w.note, wanted_when: w.wanted_when, image_path }));
    },
    async updateWish(id, patch) {
      const p = { ...patch };
      if (p.ordered_at) p.ordered_at = new Date(p.ordered_at).toISOString();
      must(await sb.from("wishes").update(p).eq("id", id));
    },
    async deleteWish(id) {
      const w = S.wishes.find(x => x.id === id);
      must(await sb.from("wishes").delete().eq("id", id));
      if (w && w.image_path) await sb.storage.from("wish-images").remove([w.image_path]);
    },
    async getPrices() {
      const rows = must(await sb.from("prices").select("*"));
      return Object.fromEntries(rows.map(r => [r.wish_id, Number(r.price_zar)]));
    },
    async setPrice(id, zar) {
      if (zar == null) must(await sb.from("prices").delete().eq("wish_id", id));
      else must(await sb.from("prices").upsert({ wish_id: id, price_zar: zar }));
    },
    async getSettings() {
      const row = must(await sb.from("settings").select("*").maybeSingle());
      return row ? { budget_eur: Number(row.budget_eur), eur_to_zar: Number(row.eur_to_zar) } : { budget_eur: 50, eur_to_zar: 20 };
    },
    async saveSettings(s) { must(await sb.from("settings").upsert({ id: 1, ...s })); },
    async getMyAddress() { return must(await sb.from("addresses").select("*").eq("user_id", me.id).maybeSingle()); },
    async saveMyAddress(a) { must(await sb.from("addresses").upsert({ user_id: me.id, ...a, updated_at: new Date().toISOString() })); },
    async getSharedAddress() { const rows = must(await sb.from("addresses").select("*").eq("shared", true).limit(1)); return rows[0] || null; },
    subscribe(fn) {
      sb.channel("wishes").on("postgres_changes", { event: "*", schema: "public", table: "wishes" }, () => fn()).subscribe();
      sb.channel("prices").on("postgres_changes", { event: "*", schema: "public", table: "prices" }, () => fn()).subscribe();
    }
  };
}

/* ---------- loading ---------- */
async function load() {
  S.wishes = await store.listWishes();
  if (S.role === "giver") {
    [S.prices, S.settings, S.sharedAddress] = await Promise.all([store.getPrices(), store.getSettings(), store.getSharedAddress()]);
  } else {
    S.myAddress = await store.getMyAddress();
  }
}

async function boot() {
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
  store = LIVE ? SupaStore() : DemoStore();
  let who;
  try { who = await store.init(); }
  catch (e) { console.error(e); return renderError("Could not connect. Check your internet and config.js."); }
  if (!who) return renderLogin();
  if (!who.role) return renderError("This account (" + who.email + ") is not on the guest list. Ask to be added in supabase/schema.sql.", true);
  S.role = who.role; S.email = who.email;
  S.tab = S.role === "giver" ? "buy" : "wishes";
  document.documentElement.lang = S.role === "giver" ? "it" : "en";
  await load();
  render();
  store.subscribe(async () => { await load(); render(); });
}

/* ---------- screens ---------- */
function renderError(msg, withSignOut) {
  $("#app").replaceChildren(h("div", { class: "login" }, h("h1", null, "Care ", h("span", null, "Package")),
    h("p", { class: "notice" }, msg), withSignOut ? h("button", { class: "ghost", onclick: () => store.signOut() }, "Sign out") : null));
}

function renderLogin() {
  const f = h("form", { onsubmit: async e => {
      e.preventDefault();
      const email = e.target.email.value.trim();
      if (!email) return;
      const btn = e.target.querySelector("button"); btn.disabled = true;
      try { await store.signIn(email); f.replaceChildren(h("p", { class: "notice" }, "Check your inbox: we sent a sign-in link to " + email + ". Controlla la posta: ti abbiamo mandato un link per entrare.")); }
      catch (err) { console.error(err); toast("Could not send the link. Try again."); btn.disabled = false; }
    } },
    h("label", { class: "f" }, "Email", h("input", { id: "email", name: "email", type: "email", autocomplete: "email", required: true })),
    h("button", { type: "submit" }, "Send me a sign-in link"));
  $("#app").replaceChildren(h("div", { class: "login" },
    h("h1", null, "Care ", h("span", null, "Package")),
    h("p", { class: "hint" }, "Wishes from South Africa, gifts from Italy. Desideri dal Sudafrica, regali dall'Italia."),
    h("div", { class: "card" }, f)));
}

function render() {
  const giver = S.role === "giver";
  const tabs = giver
    ? [["buy", "🛍️", "Da comprare"], ["done", "🎁", "Inviati"], ["budget", "💶", "Budget"]]
    : [["wishes", "♡", "My wishes"], ["arriving", "🎁", "Arriving"], ["settings", "⚙️", "Settings"]];
  const toBuy = S.wishes.filter(w => w.status === "wished").length;
  const coming = S.wishes.filter(w => w.status === "ordered").length;
  const top = h("header", { class: "top" },
    h("div", { class: "top-row" }, h("h1", null, "Care ", h("span", null, "Package")),
      h("span", { class: "badge" }, giver ? "Tu · prezzi visibili" : "You · private")),
    giver ? null : locChip());
  const content = {
    buy: giverBuy, done: giverDone, budget: giverBudget,
    wishes: receiverWishes, arriving: receiverArriving, settings: receiverSettings
  }[S.tab]();
  const nav = h("nav", { class: "tabs", "aria-label": giver ? "Sezioni" : "Sections" }, h("div", { class: "in" },
    tabs.map(([id, icon, label]) => h("button", { type: "button", "aria-current": S.tab === id ? "page" : null,
      onclick: () => { S.tab = id; render(); window.scrollTo(0, 0); } },
      h("i", null, icon), h("span", null, label,
        id === "buy" && toBuy ? h("span", { class: "dot" }, toBuy) : null,
        id === "arriving" && coming ? h("span", { class: "dot" }, coming) : null)))));
  const demo = store.demo ? h("div", { class: "notice" },
    h("b", null, giver ? "Modalità demo: dati di esempio salvati solo in questo browser." : "Demo mode: example data, saved in this browser only."),
    h("button", { class: "ghost small", type: "button", onclick: () => store.switchRole() }, giver ? "Passa alla vista di lei" : "Switch to the giver's view (IT)")) : null;
  $("#app").replaceChildren(top, h("main", null, demo, content), nav);
}

function locChip() {
  const a = S.myAddress;
  return h("button", { type: "button", class: "loc", onclick: () => { S.tab = "settings"; render(); } },
    "📍 ", a && a.city ? h("span", null, a.city, " · ", h("b", null, "from Settings")) : h("b", null, "Set your delivery address"));
}

function thumb(w) {
  return w.imageUrl ? h("img", { src: w.imageUrl, alt: w.title, loading: "lazy" }) : (w.emoji || "🎁");
}

/* ----- receiver ----- */
function receiverWishes() {
  const preview = h("div", { class: "photo-pick" });
  const fileIn = h("input", { id: "photo", type: "file", accept: "image/*", "aria-label": "Product photo", onchange: async e => {
    const f = e.target.files[0]; if (!f) return;
    try { S.draftImage = await compressImage(f); } catch { toast("That photo didn't work, try another one"); return; }
    const url = URL.createObjectURL(S.draftImage);
    preview.replaceChildren(h("img", { src: url, alt: "" }), fileIn);
  } });
  preview.append(h("span", { style: "font-size:34px" }, "📸"), h("span", null, "Add the product photo", h("br"), "(a screenshot from the shop works great)"), fileIn);
  if (S.draftImage) preview.replaceChildren(h("img", { src: URL.createObjectURL(S.draftImage), alt: "" }), fileIn);

  const prios = [[1, "nice to have"], [2, "really want"], [3, "NEED it 🔥"]];
  const chips = h("div", { class: "chips", role: "group", "aria-label": "How much do you want it?" }, prios.map(([v, l]) =>
    h("button", { type: "button", class: "chip", "aria-pressed": String(S.draftPriority === v), onclick: e => {
      S.draftPriority = v; chips.querySelectorAll(".chip").forEach((c, i) => c.setAttribute("aria-pressed", String(prios[i][0] === v)));
    } }, l)));

  const form = h("form", { onsubmit: async e => {
      e.preventDefault();
      const f = e.target, title = f.title.value.trim(), link = safeUrl(f.link.value.trim()) || "";
      if (!title) { toast("Write what it is"); return; }
      const btn = f.querySelector("button[type=submit]"); btn.disabled = true;
      await run(store.addWish({ title, link, shop: f.shop.value.trim() || shopFromLink(link), priority: S.draftPriority,
        wanted_when: f.when.value.trim(), note: f.note.value.trim() }, S.draftImage), "Added to your wishes ♡");
      S.draftImage = null; S.draftPriority = 2; btn.disabled = false;
      if (!LIVE) return; await load(); render();
    } },
    preview,
    h("label", { class: "f" }, "Link to the exact product", h("input", { id: "link", name: "link", type: "url", inputmode: "url", placeholder: "Paste it from Checkers, Takealot, Woolworths…",
      oninput: e => { const s = shopFromLink(e.target.value); const sh = form.querySelector("#shop"); if (s && !sh.value) sh.placeholder = s; } })),
    h("label", { class: "f" }, "What is it?", h("input", { id: "title", name: "title", maxlength: "120", placeholder: "e.g. Simba Chips Salt & Vinegar 120g", required: true })),
    h("label", { class: "f" }, "Shop", h("input", { id: "shop", name: "shop", maxlength: "60", placeholder: "e.g. Checkers Sixty60" })),
    h("div", null, h("p", { class: "label" }, "How much do you want it?"), chips),
    h("div", { class: "row" },
      h("label", { class: "f" }, "When would be perfect?", h("input", { id: "when", name: "when", maxlength: "60", placeholder: "optional" })),
      h("label", { class: "f" }, "Little details", h("input", { id: "note", name: "note", maxlength: "160", placeholder: "size, flavour…" }))),
    h("button", { type: "submit" }, "♡ Add to my wishes"),
    h("p", { class: "hint", style: "margin:0;text-align:center" }, "No prices here. Your friend sees them and decides 🎁"));

  const open = S.wishes.filter(w => w.status === "wished");
  const grid = open.length ? h("div", { class: "grid" }, open.map(w => h("article", { class: "wish" },
    h("div", { class: "img" }, thumb(w)),
    h("div", { class: "info" }, h("div", { class: "t" }, w.title),
      h("div", { class: "m" }, [w.shop, w.wanted_when].filter(Boolean).join(" · ")),
      w.priority >= 3 ? h("span", { class: "tag need", style: "justify-self:start" }, "NEED") : null),
    h("div", { class: "acts" }, h("button", { class: "ghost small", type: "button", onclick: () => run(store.deleteWish(w.id), "Removed") }, "Remove")))))
    : h("p", { class: "empty" }, "No wishes yet. Add the first one above!");

  return [h("section", { class: "card" }, h("h2", null, "Make a wish ✨"), h("p", { class: "hint" }, "Find it on the shop's website, take a screenshot and paste the link."), form),
    h("section", null, h("p", { class: "label" }, "My wishes · " + open.length), grid)];
}

function receiverArriving() {
  const list = S.wishes.filter(w => w.status !== "wished");
  if (!list.length) return h("p", { class: "empty" }, "Nothing on the way yet. When your friend sends something, it shows up here 🎁");
  return h("div", { class: "list" }, list.map(w => h("article", { class: "buy" + (w.status === "arrived" ? " done" : "") },
    h("div", { class: "img" }, thumb(w)),
    h("div", { class: "body" }, h("div", { class: "t" }, w.title),
      h("div", { class: "m" }, w.status === "arrived" ? h("span", { class: "tag ok" }, "arrived ✓") : h("span", { class: "tag new" }, "on the way 🛵"), w.shop || null),
      w.status === "ordered" ? h("button", { type: "button", onclick: () => run(store.updateWish(w.id, { status: "arrived" }), "Yay! Enjoy 🎉") }, "It arrived!") : null))));
}

function receiverSettings() {
  const a = S.myAddress || {};
  const form = h("form", { onsubmit: e => {
      e.preventDefault(); const f = e.target;
      run(store.saveMyAddress({ address: f.address.value.trim(), city: f.city.value.trim(), phone: f.phone.value.trim(), notes: f.notes.value.trim(), shared: f.shared.checked }), "Saved privately 🔒")
        .then(async () => { if (LIVE) { await load(); render(); } });
    } },
    h("p", { class: "lock" }, "🔒 Only you can see this"),
    h("label", { class: "f" }, "City / area", h("input", { id: "city", name: "city", value: a.city || "", placeholder: "e.g. Rondebosch, Cape Town" })),
    h("label", { class: "f" }, "Delivery address (default)", h("textarea", { id: "address", name: "address", autocomplete: "street-address" }, a.address || "")),
    h("label", { class: "f" }, "Phone for the driver", h("input", { id: "phone", name: "phone", type: "tel", value: a.phone || "" })),
    h("label", { class: "f" }, "Delivery notes", h("input", { id: "notes", name: "notes", value: a.notes || "", placeholder: "gate code, complex name…" })),
    h("div", { class: "addr" }, h("label", { class: "switch" },
      h("span", null, h("b", null, "Share address with my friend"), h("br"), h("span", { class: "hint" }, "So they can send deliveries to your door. Ask a parent first.")),
      h("input", { id: "shared", name: "shared", type: "checkbox", role: "switch", checked: !!a.shared }))),
    h("button", { type: "submit" }, "Save"));
  return [h("section", { class: "card" }, h("h2", null, "Settings"), form),
    h("button", { class: "ghost", type: "button", onclick: () => store.signOut() }, store.demo ? "Reset demo" : "Sign out")];
}

/* ----- giver ----- */
const rate = () => S.settings.eur_to_zar || 20;
function spentThisMonthEur() {
  const m = monthStart();
  return S.wishes.filter(w => w.status !== "wished" && (w.ordered_at || 0) >= m).reduce((a, w) => a + (S.prices[w.id] || 0), 0) / rate();
}

function addressBox() {
  const a = S.sharedAddress;
  if (!a) return h("p", { class: "notice" }, "Lei non ha ancora condiviso l'indirizzo. Può farlo da Settings → \"Share address with my friend\".");
  const full = [a.address, a.city].filter(Boolean).join(", ");
  return h("div", { class: "addr" }, h("p", { class: "label", style: "margin:0" }, "Indirizzo di consegna"),
    h("div", { class: "row", style: "align-items:center" }, h("b", { style: "flex:1 1 200px" }, full),
      h("button", { class: "ghost small", type: "button", style: "flex:0 0 auto", onclick: async () => {
        try { await navigator.clipboard.writeText(full); toast("Indirizzo copiato"); } catch { toast("Selezionalo e copialo a mano"); } } }, "Copia")),
    a.phone ? h("span", { class: "hint", style: "margin:0" }, "Telefono per il rider: " + a.phone) : null,
    a.notes ? h("span", { class: "hint", style: "margin:0" }, "Note: " + a.notes) : null);
}

function giverBuy() {
  const open = S.wishes.filter(w => w.status === "wished").sort((a, b) => b.priority - a.priority || b.created_at - a.created_at);
  const city = S.sharedAddress && S.sharedAddress.city ? S.sharedAddress.city : "South Africa";
  const list = open.length ? h("div", { class: "list" }, open.map(w => {
    const p = S.prices[w.id];
    const link = safeUrl(w.link);
    const fastest = "https://www.google.com/search?q=" + encodeURIComponent(w.title + " delivery " + city);
    return h("article", { class: "buy" },
      h("div", { class: "img" }, thumb(w)),
      h("div", { class: "body" },
        h("div", { class: "t" }, w.title),
        h("div", { class: "m" }, w.priority >= 3 ? h("span", { class: "tag need" }, "lo vuole tanto 🔥") : w.priority === 1 ? h("span", { class: "tag" }, "se capita") : null,
          p == null ? h("span", { class: "tag new" }, "manca prezzo") : null, w.shop || null, w.wanted_when ? "⏰ " + w.wanted_when : null),
        w.note ? h("div", { class: "m" }, "“" + w.note + "”") : null,
        h("div", { class: "price" },
          h("input", { id: "price-" + w.id, type: "number", min: "0", step: "1", inputmode: "decimal", placeholder: "R", value: p ?? "", "aria-label": "Prezzo in rand",
            onchange: e => { const v = parseFloat(e.target.value); run(store.setPrice(w.id, isNaN(v) ? null : v), "Prezzo salvato"); } }),
          h("span", { class: "eur" }, p ? "≈ " + money(p / rate(), "EUR") : "")),
        h("div", { class: "row", style: "gap:6px" },
          link ? h("a", { href: link, target: "_blank", rel: "noopener", class: "chip", style: "flex:0 0 auto;text-decoration:none" }, "Apri prodotto") : null,
          h("a", { href: fastest, target: "_blank", rel: "noopener", class: "chip", style: "flex:0 0 auto;text-decoration:none" }, "Chi consegna prima?"),
          h("button", { type: "button", class: "small", style: "flex:0 0 auto", onclick: () => run(store.updateWish(w.id, { status: "ordered", ordered_at: Date.now() }), "Fatto! Lei lo vede in arrivo 🛵") }, "L'ho comprato"))));
  })) : h("p", { class: "empty" }, "Nessun desiderio in attesa. Quando lei aggiunge qualcosa, compare qui.");
  return [addressBox(), h("section", null, h("p", { class: "label" }, "I suoi desideri · " + open.length), list)];
}

function giverDone() {
  const list = S.wishes.filter(w => w.status !== "wished");
  if (!list.length) return h("p", { class: "empty" }, "Ancora nessun regalo inviato.");
  return h("div", { class: "list" }, list.map(w => h("article", { class: "buy" },
    h("div", { class: "img" }, thumb(w)),
    h("div", { class: "body" }, h("div", { class: "t" }, w.title),
      h("div", { class: "m" }, w.status === "arrived" ? h("span", { class: "tag ok" }, "arrivato ✓") : h("span", { class: "tag new" }, "in viaggio"),
        S.prices[w.id] ? money(S.prices[w.id], "ZAR") + " ≈ " + money(S.prices[w.id] / rate(), "EUR") : null,
        w.ordered_at ? new Date(w.ordered_at).toLocaleDateString("it-IT") : null),
      w.status === "ordered" ? h("button", { class: "ghost small", type: "button", style: "justify-self:start", onclick: () => run(store.updateWish(w.id, { status: "wished", ordered_at: null }), "Riportato tra i desideri") }, "Annulla") : null))));
}

function giverBudget() {
  const spent = spentThisMonthEur(), budget = S.settings.budget_eur || 0;
  const openZar = S.wishes.filter(w => w.status === "wished").reduce((a, w) => a + (S.prices[w.id] || 0), 0);
  const pct = budget ? Math.min(100, (spent / budget) * 100) : 0;
  const form = h("form", { onsubmit: e => { e.preventDefault(); const f = e.target;
      run(store.saveSettings({ budget_eur: parseFloat(f.budget.value) || 0, eur_to_zar: parseFloat(f.rate.value) || 20 }), "Impostazioni salvate")
        .then(async () => { if (LIVE) { await load(); render(); } }); } },
    h("div", { class: "row" },
      h("label", { class: "f" }, "Budget mensile (€)", h("input", { id: "budget", name: "budget", type: "number", min: "0", step: "1", value: budget })),
      h("label", { class: "f" }, "Cambio: 1 € = R", h("input", { id: "rate", name: "rate", type: "number", min: "1", step: "0.01", value: rate() }))),
    h("button", { type: "submit" }, "Salva"));
  return [
    h("section", { class: "card" },
      h("div", { class: "stats" },
        h("div", { class: "stat" }, h("small", null, "Speso questo mese"), h("b", null, money(spent, "EUR"))),
        h("div", { class: "stat" }, h("small", null, "Budget"), h("b", null, money(budget, "EUR"))),
        h("div", { class: "stat" }, h("small", null, "Lista aperta"), h("b", null, money(openZar, "ZAR")))),
      h("div", { class: "bar" }, h("i", { class: spent > budget ? "over" : "", style: "width:" + pct + "%" })),
      h("p", { class: "hint", style: "margin:10px 0 0" }, "Prezzi e budget li vedi solo tu: lei non può leggerli nemmeno dal database.")),
    h("section", { class: "card" }, h("h2", null, "Impostazioni"), form),
    h("button", { class: "ghost", type: "button", onclick: () => store.signOut() }, store.demo ? "Azzera demo" : "Esci")];
}

boot();
