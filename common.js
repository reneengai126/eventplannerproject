/* ============================================================
   EventPlanner AI — shared helpers: nav, storage, Ollama client
   ============================================================ */
window.EP = window.EP || {};

/* ---------- tiny DOM helpers ---------- */
EP.$ = (s, r = document) => r.querySelector(s);
EP.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
EP.esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
EP.money = n => {
  const v = Math.abs(Math.round((+n || 0) * 100) / 100), whole = v === Math.round(v);
  return (n < 0 ? "-" : "") + "$" + v.toLocaleString(undefined, { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
};
EP.uid = () => Math.random().toString(36).slice(2, 10);

/* ---------- storage (always wrapped: private windows can throw) ---------- */
EP.store = {
  get(k, d) { try { const v = localStorage.getItem("ep:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("ep:" + k, JSON.stringify(v)); } catch { /* ignore */ } }
};

EP.toast = (msg, kind = "") => {
  let box = EP.$("#toasts");
  if (!box) { box = document.createElement("div"); box.id = "toasts"; document.body.appendChild(box); }
  const t = document.createElement("div");
  t.className = "toast " + kind; t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.classList.add("out"), 2800);
  setTimeout(() => t.remove(), 3300);
};

/* ---------- Ollama (local LLM on this desktop) ---------- */
EP.ai = {
  settings() {
    return Object.assign({ url: "http://localhost:11434", model: "", enabled: true, temperature: 0.6 }, EP.store.get("ollama", {}));
  },
  save(s) { EP.store.set("ollama", Object.assign(this.settings(), s)); },
  status: "unknown", models: [],

  async check() {
    const s = this.settings();
    try {
      const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 3000);
      const r = await fetch(s.url.replace(/\/$/, "") + "/api/tags", { signal: ctl.signal });
      clearTimeout(to);
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json();
      this.models = (j.models || []).map(m => m.name);
      if (!s.model || !this.models.includes(s.model)) { if (this.models[0]) this.save({ model: this.models[0] }); }
      this.status = this.models.length ? "online" : "nomodel";
    } catch (e) { this.status = "offline"; this.models = []; }
    EP.renderAIStatus();
    return this.status;
  },

  ready() { return this.status === "online" && this.settings().enabled; },

  /* Chat call. onToken(fullTextSoFar) is called while streaming. Optional JSON schema → structured output. */
  async chat(messages, { onToken, schema, signal, temperature } = {}) {
    const s = this.settings();
    const body = { model: s.model, messages, stream: true, options: { temperature: temperature ?? s.temperature, num_ctx: 8192 } };
    if (schema) body.format = schema;
    const r = await fetch(s.url.replace(/\/$/, "") + "/api/chat", { method: "POST", body: JSON.stringify(body), signal });
    if (!r.ok) throw new Error("Ollama error " + r.status + ": " + (await r.text()).slice(0, 200));
    const reader = r.body.getReader(); const dec = new TextDecoder();
    let buf = "", out = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line) continue;
        const j = JSON.parse(line);
        if (j.error) throw new Error(j.error);
        if (j.message && j.message.content) { out += j.message.content; onToken && onToken(out); }
      }
    }
    return out;
  }
};

/* Pull the first JSON object out of a model reply (small models sometimes wrap it in prose). */
EP.parseJSON = txt => {
  try { return JSON.parse(txt); } catch { /* fall through */ }
  const a = txt.indexOf("{"), b = txt.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(txt.slice(a, b + 1)); } catch { /* ignore */ } }
  return null;
};

EP.renderAIStatus = () => {
  const pill = EP.$("#aiPill"); if (!pill) return;
  const s = EP.ai.settings();
  const map = {
    online: ["on", "Local AI: " + (s.model || "ready")],
    nomodel: ["warn", "Ollama running — no model pulled"],
    offline: ["off", "Local AI offline · instant mode"],
    unknown: ["off", "Checking local AI…"]
  };
  let [cls, text] = map[EP.ai.status] || map.unknown;
  if (EP.ai.status === "online" && !s.enabled) { cls = "warn"; text = "Local AI paused · instant mode"; }
  pill.className = "ai-pill " + cls; pill.querySelector("span").textContent = text;
};

/* ---------- AI settings dialog ---------- */
EP.openSettings = async () => {
  await EP.ai.check();
  const s = EP.ai.settings();
  let dlg = EP.$("#aiDialog");
  if (!dlg) { dlg = document.createElement("dialog"); dlg.id = "aiDialog"; document.body.appendChild(dlg); }
  const opts = EP.ai.models.map(m => `<option ${m === s.model ? "selected" : ""}>${EP.esc(m)}</option>`).join("");
  dlg.innerHTML = `
    <form method="dialog" class="dlg">
      <h3>Local AI settings (Ollama)</h3>
      <p class="muted small">EventPlanner AI runs the language model on <b>your own desktop</b> through Ollama — nothing about your event leaves your computer.</p>
      <label>Ollama URL<input name="url" value="${EP.esc(s.url)}"></label>
      <label>Model
        ${opts ? `<select name="model">${opts}</select>` : `<input name="model" value="${EP.esc(s.model)}" placeholder="e.g. llama3.2, phi4-mini">`}
      </label>
      <label>Creativity <input type="range" name="temperature" min="0" max="1.2" step="0.1" value="${s.temperature}"></label>
      <label class="check"><input type="checkbox" name="enabled" ${s.enabled ? "checked" : ""}> Use local AI (unchecked = instant template mode)</label>
      <div class="status-line ${EP.ai.status}">Status: <b>${EP.ai.status}</b>${EP.ai.models.length ? " · " + EP.ai.models.length + " model(s) installed" : ""}</div>
      ${EP.ai.status !== "online" ? `<div class="help">
        <b>To connect:</b><ol>
        <li>Install Ollama from <a href="https://ollama.com/download" target="_blank" rel="noopener">ollama.com/download</a></li>
        <li>Pull a model: <code>ollama pull llama3.2</code> (or <code>phi4-mini</code>)</li>
        <li>Open this site from <code>http://localhost</code> (run <code>Start-EventPlanner.bat</code>) — Ollama blocks pages opened as files.</li></ol></div>` : ""}
      <div class="row end"><button value="cancel" class="btn ghost">Cancel</button><button value="save" class="btn">Save</button></div>
    </form>`;
  dlg.showModal();
  dlg.onclose = async () => {
    if (dlg.returnValue !== "save") return;
    const f = new FormData(dlg.querySelector("form"));
    EP.ai.save({ url: f.get("url").trim(), model: (f.get("model") || "").trim(), temperature: +f.get("temperature"), enabled: !!f.get("enabled") });
    await EP.ai.check();
    EP.toast("AI settings saved");
  };
};

/* ---------- shared header / footer ---------- */
EP.chrome = active => {
  const links = [["index.html", "Home", "home"], ["planner.html", "Planner Demo", "planner"], ["clubs.html", "Clubs", "clubs"], ["about.html", "How it works", "about"]];
  const header = document.createElement("header");
  header.className = "site";
  header.innerHTML = `
    <a class="brand" href="index.html"><span class="logo">EP</span><span>EventPlanner<b>AI</b></span></a>
    <button class="menu-btn" aria-label="Menu">☰</button>
    <nav>${links.map(([h, t, k]) => `<a href="${h}" class="${k === active ? "active" : ""}">${t}</a>`).join("")}</nav>
    <button id="aiPill" class="ai-pill off" title="Local AI settings"><i></i><span>Checking local AI…</span></button>`;
  document.body.prepend(header);
  header.querySelector(".menu-btn").onclick = () => header.classList.toggle("open");
  header.querySelector("#aiPill").onclick = EP.openSettings;

  const footer = document.createElement("footer");
  footer.className = "site";
  footer.innerHTML = `<div><b>EventPlanner AI</b> · ECON 385 project by Renee Ngai, Alizay Hussain & Angela Zhang</div>
    <div class="muted small">Demo tool — always confirm deadlines, vendors and policies with Student Government Services and CSLE. Club pages use sample data.</div>`;
  document.body.appendChild(footer);
  EP.ai.check();
};
