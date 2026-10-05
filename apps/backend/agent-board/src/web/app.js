// Mobile Web-Oberfläche des Agent Boards (ohne Build, ohne Abhängigkeiten).
const $app = document.getElementById("app");
const $heading = document.getElementById("heading");
const $back = document.getElementById("back");
const $newBtn = document.getElementById("newBtn");
const $live = document.getElementById("live");

const STATUS_LABEL = { open: "offen", in_progress: "in Arbeit", needs_human: "braucht dich", closed: "geschlossen" };
// Bearbeitungsmodell je Issue: "<provider>/<name>". Claude (Standard Opus 5.5) oder eigener Provider (z. B. whisper/large-v3)
const MODELS = [["claude/opus", "Claude Opus 5.5"], ["claude/sonnet", "Claude Sonnet 5.5"], ["claude/haiku", "Claude Haiku 4.5"]];
const MODEL_LABEL = Object.fromEntries(MODELS);
const DEFAULT_MODEL = "claude/opus";
const MODEL_RE = /^[a-z0-9-]+\/[a-z0-9._-]+$/;
const OTHER = "__other";
const FIELD_LABEL = { title: "Titel", body: "Text", model: "Modell" };
const modelLabel = (m) => MODEL_LABEL[m] || m;
/** Auswahl Claude-Modelle + „Anderer Provider…“ (Freitext provider/name); onCommit(model) bei gültiger Änderung. */
function modelPicker(value, onCommit) {
  const v = value || DEFAULT_MODEL;
  const opts = MODELS.map(([m, t]) => h("option", { value: m }, t));
  if (!MODEL_LABEL[v]) opts.push(h("option", { value: v }, v));
  opts.push(h("option", { value: OTHER }, "Anderer Provider…"));
  const sel = h("select", { "aria-label": "Modell" }, opts);
  sel.value = v;
  const custom = h("input", { type: "text", class: "model-custom", placeholder: "provider/name, z. B. whisper/large-v3", "aria-label": "Eigenes Modell (provider/name)", hidden: true, autocapitalize: "off", autocomplete: "off", spellcheck: "false" });
  const value_ = () => (sel.value === OTHER ? custom.value.trim().toLowerCase() : sel.value);
  sel.addEventListener("change", () => {
    custom.hidden = sel.value !== OTHER;
    if (sel.value === OTHER) custom.focus();
    else onCommit?.(sel.value);
  });
  custom.addEventListener("change", () => {
    const m = value_();
    custom.setCustomValidity(MODEL_RE.test(m) ? "" : "Format provider/name, z. B. whisper/large-v3");
    if (MODEL_RE.test(m)) onCommit?.(m);
    else custom.reportValidity();
  });
  return { el: h("span", { class: "model-picker" }, sel, custom), value: value_, valid: () => MODEL_RE.test(value_()) };
}
// Login per Link: ?token=… einmal übernehmen und aus der Adresszeile entfernen
{
  const t = new URLSearchParams(location.search).get("token");
  if (t) {
    save("ab-token", t);
    history.replaceState(null, "", location.pathname + location.hash);
  }
}
const state = { info: null, token: load("ab-token") || "", tab: load("ab-tab") || "active", label: "", q: "" };

function load(k) {
  try { return localStorage.getItem(k); } catch { return null; }
}
function save(k, v) {
  try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch { /* privat */ }
}

// --- DOM-Helfer (nur textContent, kein innerHTML mit Daten) ---
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) el.append(kid instanceof Node ? kid : String(kid));
  return el;
}

function ago(iso) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "gerade eben";
  if (s < 3600) return `vor ${Math.floor(s / 60)} Min.`;
  if (s < 86400) return `vor ${Math.floor(s / 3600)} Std.`;
  return new Date(iso).toLocaleDateString("de-DE", { day: "numeric", month: "short" });
}
function size(n) {
  return n < 1024 ? `${n} B` : n < 1048576 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`;
}
const pill = (s) => h("span", { class: `pill s-${s}` }, STATUS_LABEL[s] || s);

// --- API ---
async function api(method, path, body) {
  const headers = {};
  if (state.token) headers.authorization = `Bearer ${state.token}`;
  let payload;
  if (body instanceof Blob) {
    payload = body;
    headers["content-type"] = body.type || "application/octet-stream";
  } else if (body !== undefined) {
    payload = JSON.stringify(body);
    headers["content-type"] = "application/json";
  }
  const res = await fetch(path, { method, headers, body: payload });
  if (res.status === 401) {
    showLogin();
    throw new Error("Anmeldung nötig");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
  return data;
}
const fileUrl = (a, dl, suffix = "", extra = {}) =>
  `v1/files/${a.sha256}${suffix}?${new URLSearchParams({ ...(state.token ? { token: state.token } : {}), ...(dl ? { download: "1" } : {}), ...extra })}`;
const isHeic = (m) => /^image\/(heic|heif)/.test(m);

async function uploadAll(fileList) {
  const refs = [];
  for (const f of fileList) {
    if (state.info && f.size > state.info.maxFileBytes) throw new Error(`${f.name} ist zu groß (max. ${size(state.info.maxFileBytes)})`);
    const a = await api("POST", `v1/files?name=${encodeURIComponent(f.name || "foto.jpg")}`, f);
    refs.push({ sha256: a.sha256, name: a.name });
  }
  return refs;
}

// --- Ansichten ---
function setHeader(title, back) {
  $heading.textContent = title;
  $back.hidden = !back;
  $newBtn.hidden = !!back;
  document.title = `${title} · Agent Board`;
}

function showLogin(msg) {
  if (state.info?.login) return showPasswordLogin(msg);
  setHeader("Anmelden", false);
  $newBtn.hidden = true;
  const input = h("input", { type: "password", placeholder: "Schlüssel (admin, z. B. AB_API_KEY)", autocomplete: "current-password" });
  $app.replaceChildren(
    h("form", { class: "compose", onsubmit: async (e) => {
      e.preventDefault();
      state.token = input.value.trim();
      save("ab-token", state.token);
      await boot();
    } },
    h("p", { class: "meta" }, "Der Server verlangt einen Schlüssel (Rolle admin für die volle Oberfläche). Er wird nur in diesem Browser gespeichert."),
    msg ? h("p", { class: "error" }, msg) : null,
    input,
    h("button", { class: "btn primary", type: "submit" }, "Anmelden")),
  );
}

/** Anmeldung mit Nutzername/Passwort (Server mit AB_LOGIN_USER/AB_LOGIN_PASSWORD); liefert den Schlüssel. */
function showPasswordLogin(msg) {
  setHeader("Anmelden", false);
  $newBtn.hidden = true;
  const user = h("input", { type: "text", placeholder: "Nutzername", autocomplete: "username", autocapitalize: "off", spellcheck: "false", required: true });
  const password = h("input", { type: "password", placeholder: "Passwort", autocomplete: "current-password", required: true });
  $app.replaceChildren(
    h("form", { class: "compose", onsubmit: async (e) => {
      e.preventDefault();
      const res = await fetch("v1/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: user.value, password: password.value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) return showPasswordLogin(data.error?.message || `HTTP ${res.status}`);
      state.token = data.token;
      save("ab-token", state.token);
      await boot();
    } },
    msg ? h("p", { class: "error" }, msg) : null,
    user,
    password,
    h("button", { class: "btn primary", type: "submit" }, "Anmelden")),
  );
}

async function renderList() {
  setHeader("Agent Board", false);
  const params = new URLSearchParams();
  if (state.tab === "me") params.set("for", "me");
  else params.set("status", state.tab);
  if (state.label) params.set("label", state.label);
  if (state.q) params.set("q", state.q);
  const [list, mine, labels] = await Promise.all([
    api("GET", `v1/issues?${params}`),
    api("GET", "v1/issues?for=me&limit=1"),
    api("GET", "v1/labels"),
  ]);
  const tab = (id, text, count, alert) =>
    h("button", { class: "tab", role: "tab", "aria-selected": String(state.tab === id), onclick: () => {
      state.tab = id;
      save("ab-tab", id);
      route();
    } }, text, count ? h("span", { class: `count${alert ? " alert" : ""}` }, count) : null);
  const search = h("input", { class: "search", type: "search", placeholder: "Suchen …", value: state.q, onchange: (e) => {
    state.q = e.target.value.trim();
    route();
  } });
  $app.replaceChildren(
    h("div", { class: "tabs", role: "tablist" },
      tab("active", "Offen"), tab("me", "Für mich", mine.total, mine.total > 0), tab("closed", "Geschlossen"), tab("all", "Alle")),
    search,
    labels.labels.length ? h("div", { class: "chips" }, labels.labels.map((l) =>
      h("button", { class: "chip", "aria-pressed": String(state.label === l.label), onclick: () => {
        state.label = state.label === l.label ? "" : l.label;
        route();
      } }, l.label))) : null,
    list.issues.length
      ? h("div", { class: "list" }, list.issues.map((i) =>
        h("a", { class: "card", href: `#/issue/${i.id}` },
          h("div", { class: "row" }, pill(i.status), h("span", { class: "title" }, `#${i.id} ${i.title}`),
            i.model && i.model !== DEFAULT_MODEL ? h("span", { class: "chip model" }, modelLabel(i.model)) : null),
          h("div", { class: "row meta" }, `${i.author} · ${ago(i.updatedAt)}`, i.commentCount ? ` · ${i.commentCount} Komm.` : "",
            i.labels.map((l) => h("span", { class: "chip" }, l))))))
      : h("p", { class: "empty" }, state.tab === "me" ? "Nichts wartet auf dich." : "Keine Issues."),
  );
}

function attachments(list) {
  if (!list || !list.length) return null;
  return h("div", { class: "atts" }, list.map((a) => {
    const heic = isHeic(a.mime);
    // Vorschau (HEIC/große Fotos) anzeigen; HEIC ohne gespeicherte Vorschau wird serverseitig umgerechnet
    const thumb = a.preview ? fileUrl(a.preview) : heic ? fileUrl(a, false, "/preview", { max: "800" }) : fileUrl(a);
    const showImage = a.mime.startsWith("image/") && a.mime !== "image/svg+xml";
    if (!showImage) {
      return h("a", { class: "att", href: fileUrl(a, true), target: "_blank", rel: "noopener" }, h("span", {}, a.name), h("span", { class: "meta" }, size(a.size)));
    }
    // Tippen = Original (HEIC als Download, da nicht jeder Browser es anzeigt)
    return h("a", { class: "att img", href: fileUrl(a, heic), target: "_blank", rel: "noopener", title: `${a.name} (${size(a.size)}) – Original öffnen` },
      h("img", { src: thumb, alt: a.name, loading: "lazy", onerror: (e) => e.target.replaceWith(h("span", { class: "meta" }, a.name)) }));
  }));
}

function eventText(e) {
  const ev = e.event;
  switch (ev.kind) {
    case "opened": return "hat das Issue eröffnet";
    case "status": return `${ev.to === "closed" ? "hat geschlossen" : ev.from === "closed" ? "hat wiedereröffnet" : `Status → ${STATUS_LABEL[ev.to]}`}${ev.reason ? `: ${ev.reason}` : ""}`;
    case "labels": return `Labels ${[...ev.added.map((l) => `+${l}`), ...ev.removed.map((l) => `−${l}`)].join(" ")}`;
    case "assign": return ev.to ? (ev.to === e.author ? "hat übernommen" : `zugewiesen an ${ev.to}`) : "Zuweisung entfernt";
    case "mention": return `erwähnt @${ev.user}`;
    case "edit": return `bearbeitet (${ev.fields.map((f) => FIELD_LABEL[f] || f).join(", ")})`;
    default: return ev.kind;
  }
}

async function renderIssue(id) {
  const { issue, entries } = await api("GET", `v1/issues/${id}`);
  setHeader(`#${issue.id}`, true);
  const me = state.info?.user;
  const agent = state.info?.agent;
  const closed = issue.status === "closed";

  const text = h("textarea", { placeholder: "Kommentar schreiben …", "aria-label": "Kommentar" });
  const picked = h("div", { class: "files-picked" });
  const fileInput = h("input", { type: "file", multiple: true, onchange: () => {
    picked.textContent = [...fileInput.files].map((f) => `${f.name} (${size(f.size)})`).join(", ");
  } });
  const err = h("p", { class: "error" });
  const send = async (status) => {
    err.textContent = "";
    const buttons = form.querySelectorAll("button");
    buttons.forEach((b) => (b.disabled = true));
    try {
      const body = text.value.trim();
      const refs = await uploadAll(fileInput.files);
      if (body || refs.length) {
        await api("POST", `v1/issues/${id}/comments`, { author: me, body: body || "Datei angehängt", attachments: refs, ...(status ? { status } : {}) });
      } else if (status) {
        await api("PATCH", `v1/issues/${id}`, { author: me, status });
      }
      await renderIssue(id);
    } catch (e) {
      err.textContent = e.message;
      buttons.forEach((b) => (b.disabled = false));
    }
  };
  const form = h("form", { class: "compose", onsubmit: (e) => { e.preventDefault(); void send(); } },
    text,
    h("div", { class: "actions" },
      h("label", { class: "btn filelabel" }, "Datei/Foto", fileInput),
      h("button", { class: "btn primary grow", type: "submit" }, "Kommentieren")),
    picked,
    h("div", { class: "actions" },
      closed
        ? h("button", { class: "btn grow", type: "button", onclick: () => send("open") }, "Wiedereröffnen")
        : h("button", { class: "btn grow", type: "button", onclick: () => send("closed") }, "Schließen"),
      issue.status === "needs_human"
        ? h("button", { class: "btn grow", type: "button", onclick: () => send("open") }, "Zurück an Claude")
        : null),
    err);

  const labelInput = h("input", { type: "text", placeholder: "Label hinzufügen", "aria-label": "Label" });
  const labels = h("div", { class: "chips" }, issue.labels.map((l) =>
    h("button", { class: "chip", title: "Label entfernen", onclick: async () => {
      await api("PATCH", `v1/issues/${id}`, { author: me, removeLabels: [l] });
      await renderIssue(id);
    } }, l, h("span", { class: "x" }, "×"))));

  $app.replaceChildren(
    h("div", { class: "card", style: "margin-top:12px" },
      h("div", { class: "row" }, pill(issue.status), h("span", { class: "title" }, issue.title),
        h("label", { class: "chip model", title: "Modell (provider/name): claude/… bearbeitet Claude, andere Provider ihr eigener Worker" },
          modelPicker(issue.model, async (m) => {
            await api("PATCH", `v1/issues/${id}`, { author: me, model: m });
            await renderIssue(id);
          }).el)),
      h("div", { class: "meta" }, `${issue.author} · ${ago(issue.createdAt)}${issue.assignee ? ` · → ${issue.assignee}` : ""}${issue.closedBy ? ` · geschlossen von ${issue.closedBy}` : ""}`),
      issue.body ? h("div", { class: "body" }, issue.body) : null,
      attachments(issue.attachments),
      labels,
      h("form", { class: "label-edit", onsubmit: async (e) => {
        e.preventDefault();
        const v = labelInput.value.trim();
        if (!v) return;
        await api("PATCH", `v1/issues/${id}`, { author: me, addLabels: v.split(",") });
        await renderIssue(id);
      } }, labelInput, h("button", { class: "btn", type: "submit" }, "+"))),
    issue.status === "needs_human" ? h("div", { class: "banner" }, "Claude braucht deine Entscheidung oder Hilfe – antworte unten.") : null,
    h("div", { class: "timeline" }, entries.filter((e) => !(e.type === "event" && e.event.kind === "opened")).map((e) =>
      e.type === "comment"
        ? h("div", { class: `card comment${e.author === me ? " mine" : ""}${agent && (e.author === agent || /^[:\-_/.@]/.test(e.author.slice(agent.length)) && e.author.startsWith(agent)) ? " agent" : ""}` },
          h("div", { class: "meta" }, `${e.author} · ${ago(e.createdAt)}`),
          h("div", { class: "body" }, e.body),
          attachments(e.attachments))
        : h("div", { class: "event" }, `${e.author} ${eventText(e)} · ${ago(e.createdAt)}`))),
    form,
  );
}

function renderNew() {
  setHeader("Neues Issue", true);
  const title = h("input", { type: "text", placeholder: "Titel", required: true, "aria-label": "Titel" });
  const body = h("textarea", { placeholder: "Beschreibung (optional)", "aria-label": "Beschreibung" });
  const labels = h("input", { type: "text", placeholder: "Labels, kommagetrennt", "aria-label": "Labels" });
  const model = modelPicker(DEFAULT_MODEL);
  const picked = h("div", { class: "files-picked" });
  const fileInput = h("input", { type: "file", multiple: true, onchange: () => {
    picked.textContent = [...fileInput.files].map((f) => `${f.name} (${size(f.size)})`).join(", ");
  } });
  const err = h("p", { class: "error" });
  $app.replaceChildren(h("form", { class: "compose", onsubmit: async (e) => {
    e.preventDefault();
    err.textContent = "";
    try {
      if (!model.valid()) throw new Error("Modell im Format provider/name angeben, z. B. whisper/large-v3");
      const refs = await uploadAll(fileInput.files);
      const issue = await api("POST", "v1/issues", {
        title: title.value.trim(), body: body.value, author: state.info?.user,
        labels: labels.value.split(",").map((s) => s.trim()).filter(Boolean), attachments: refs, model: model.value(),
      });
      location.hash = `#/issue/${issue.id}`;
    } catch (ex) {
      err.textContent = ex.message;
    }
  } }, title, body, labels,
  h("label", { class: "field" }, "Modell", model.el),
  h("div", { class: "actions" }, h("label", { class: "btn filelabel" }, "Datei/Foto", fileInput), h("button", { class: "btn primary grow", type: "submit" }, "Anlegen")),
  picked, err));
  title.focus();
}

// --- Routing & Live-Updates ---
let rendering = Promise.resolve();
function route() {
  rendering = rendering.then(async () => {
    const m = /^#\/issue\/(\d+)/.exec(location.hash);
    try {
      if (m) await renderIssue(Number(m[1]));
      else if (location.hash === "#/new") renderNew();
      else await renderList();
    } catch (e) {
      if (e.message !== "Anmeldung nötig") $app.replaceChildren(h("p", { class: "error" }, e.message));
    }
  });
}

let es;
let refreshTimer;
function connectLive() {
  es?.close();
  es = new EventSource(`v1/events${state.token ? `?token=${encodeURIComponent(state.token)}` : ""}`);
  es.onopen = () => $live.classList.add("on");
  es.onerror = () => $live.classList.remove("on");
  es.addEventListener("issue", () => {
    // nicht beim Tippen neu zeichnen
    const typing = document.activeElement && ["TEXTAREA", "INPUT"].includes(document.activeElement.tagName) && document.activeElement.value;
    if (typing || location.hash === "#/new") return;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(route, 300);
  });
}

async function boot() {
  const info = await fetch(`v1/info${state.token ? `?token=${encodeURIComponent(state.token)}` : ""}`).then((r) => r.json());
  if (info.authRequired && !info.authOk) {
    state.info = info;
    return showLogin(state.token ? "Anmeldung abgelaufen oder ungültig." : "");
  }
  state.info = info;
  connectLive();
  route();
}

window.addEventListener("hashchange", route);
boot().catch((e) => $app.replaceChildren(h("p", { class: "error" }, `Server nicht erreichbar: ${e.message}`)));
