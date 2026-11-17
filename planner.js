/* ============================================================
   EventPlanner AI — planner page UI
   ============================================================ */
(() => {
const { $, $$, esc, money } = EP;
EP.chrome("planner");

let plan = null, aiCtl = null, emailKey = "invitation";

const EXAMPLES = [
  ["Cultural gala", "Lunar New Year gala dinner for 300 students with a lion dance performance, red and gold decor, catered dinner and a photo booth. Budget $6,000."],
  ["Speaker panel", "Finance speaker panel with 3 alumni from investment banks for 120 students, followed by a networking reception at 6pm."],
  ["Outdoor festival", "Holi color festival on the quad for 500 students with color powder, DJ, water stations and street food on April 4 at 1pm"],
  ["Hackathon", "24-hour hardware hackathon for 150 students with sponsor judges, 3 meals plus midnight snacks, prizes and swag. Budget $5k"],
  ["Game night", "Casual boba and board game night for 80 new members to meet the exec board"]
];

/* ---------- setup form ---------- */
$("#examples").innerHTML = EXAMPLES.map(([l], i) => `<button class="btn ghost sm" data-ex="${i}">${l}</button>`).join("");
$("#examples").onclick = e => { const b = e.target.closest("[data-ex]"); if (b) $("#prompt").value = EXAMPLES[b.dataset.ex][1]; };
$("#club").innerHTML = `<option value="">— Not linked to a club —</option>` + EP.allClubs().map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
$("#type").innerHTML += Object.entries(EP.TYPES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("");
$("#useAI").checked = EP.ai.settings().enabled;
$("#useAI").onchange = e => { EP.ai.save({ enabled: e.target.checked }); EP.renderAIStatus(); };

const qs = new URLSearchParams(location.search);
if (qs.get("club")) $("#club").value = qs.get("club");
if (qs.get("prompt")) $("#prompt").value = qs.get("prompt");
if (qs.get("headcount")) $("#headcount").value = qs.get("headcount");
if (qs.get("budget")) $("#budget").value = qs.get("budget");

/* ---------- persistence ---------- */
const savePlan = () => {
  if (!plan) return;
  const all = EP.store.get("plans", []).filter(p => p.id !== plan.id);
  all.unshift(plan);
  EP.store.set("plans", all.slice(0, 30));
};
let saveT; const changed = () => { clearTimeout(saveT); saveT = setTimeout(savePlan, 400); };

/* ---------- progress UI ---------- */
const STEPS = ["Reading your event description", "Building budget, logistics & checklist", "Drawing the event map", "Local AI: vision, run-of-show & event-specific items", "Local AI: writing the member invitation", "Local AI: writing the VIP / leadership email"];
const setStep = (i, state) => { const li = $$("#steps li")[i]; if (li) li.className = state; };

$("#go").onclick = async () => {
  const prompt = $("#prompt").value.trim();
  if (prompt.length < 8) { EP.toast("Describe your event first (a sentence is enough)"); $("#prompt").focus(); return; }
  if (aiCtl) aiCtl.abort();
  $("#go").disabled = true;
  $("#progress").classList.add("on");
  $("#steps").innerHTML = STEPS.map(s => `<li>${s}</li>`).join("");
  $("#stream").textContent = ""; $("#stream").classList.remove("on");

  setStep(0, "run");
  plan = EP.buildPlan({
    prompt, clubId: $("#club").value, type: $("#type").value, date: $("#date").value, start: $("#start").value,
    headcount: $("#headcount").value, budget: $("#budget").value
  });
  plan.venueName = $("#venueName").value.trim();
  if (plan.venueName) plan.emails = EP.defaultEmails(plan);
  setStep(0, "done"); setStep(1, "done"); setStep(2, "done");
  renderAll(); savePlan();
  $("#results").classList.add("on");
  history.replaceState(null, "", "planner.html?plan=" + plan.id);

  const useAI = $("#useAI").checked;
  if (useAI && EP.ai.status !== "online") await EP.ai.check();
  if (!useAI || !EP.ai.ready()) {
    [3, 4, 5].forEach(i => setStep(i, "skip"));
    $$("#steps li")[3].textContent += EP.ai.status === "online" ? " — skipped (AI turned off)" : " — skipped (Ollama not reachable; using instant templates)";
    $("#go").disabled = false;
    EP.toast("Plan ready (instant mode)");
    $("#results").scrollIntoView({ behavior: "smooth" });
    return;
  }
  $("#results").scrollIntoView({ behavior: "smooth" });
  aiCtl = new AbortController();
  $("#stopAI").style.display = "";
  const stream = $("#stream"); stream.classList.add("on");
  const onToken = t => { stream.textContent = t.slice(-1200); stream.scrollTop = stream.scrollHeight; };
  try {
    setStep(3, "run");
    await EP.aiEnrich(plan, { onToken, signal: aiCtl.signal });
    if (plan.autoTarget) EP.baselineFunding(plan);
    plan.emails = Object.assign(EP.defaultEmails(plan), pickEdited(plan.emails));
    setStep(3, "done"); renderAll(); savePlan();
    for (const [i, key] of [[4, "invitation"], [5, "vip"]]) {
      setStep(i, "run");
      const r = await EP.aiEmail(plan, key, { onToken, signal: aiCtl.signal });
      Object.assign(plan.emails[key], r, { ai: true });
      setStep(i, "done"); renderEmails(); savePlan();
    }
    EP.toast("Plan personalized by " + EP.ai.settings().model, "good");
  } catch (err) {
    if (err.name === "AbortError") EP.toast("AI stopped — the plan so far is kept");
    else { console.error(err); EP.toast("AI step failed: " + err.message); }
    $$("#steps li").forEach(li => { if (li.className === "run" || !li.className) li.className = "skip"; });
  } finally {
    aiCtl = null; $("#stopAI").style.display = "none"; $("#go").disabled = false;
  }
};
const pickEdited = emails => Object.fromEntries(Object.entries(emails).filter(([, e]) => e.edited || e.ai));
$("#stopAI").onclick = () => aiCtl && aiCtl.abort();

/* ---------- tabs ---------- */
$("#tabs").onclick = e => {
  const b = e.target.closest("button[data-tab]"); if (!b) return;
  $$("#tabs button").forEach(x => x.classList.toggle("on", x === b));
  $$(".panel").forEach(p => p.classList.toggle("on", p.id === "p-" + b.dataset.tab));
};

const renderAll = () => {
  renderHead(); renderVision(); renderLogistics(); renderBudget(); renderChecklist(); renderEmails(); renderSupplies();
};

const renderHead = () => {
  $("#planClub").textContent = plan.clubName + (plan.aiUsed ? " · personalized by local AI" : " · instant plan");
  $("#planTitle").textContent = plan.title;
  $("#planMeta").textContent = `${EP.fmtDate(plan.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })} · ${EP.clock(plan.start, 0)} · ${plan.headcount} guests · ${plan.typeLabel}`;
  document.title = plan.title + " · EventPlanner AI";
};

/* =============== VISION & MAP =============== */
const renderVision = () => {
  const v = plan.vision, m = EP.renderMap(plan);
  $("#p-vision").innerHTML = `
    <div class="map-wrap">
      <div class="card">
        <div class="row between"><h3 style="margin:0">Event map · ${esc(plan.typeLabel)} layout</h3>
          <div class="row no-print"><select id="layoutSel" style="width:auto">${["banquet", "theater", "classroom", "mixer", "festival"].map(l => `<option ${l === plan.layout ? "selected" : ""} value="${l}">${l[0].toUpperCase() + l.slice(1)} layout</option>`).join("")}</select>
          <button class="btn ghost sm" id="dlMap">Download SVG</button></div></div>
        <p class="muted small">Auto-scaled for ${plan.headcount} guests. Hover any zone for details. Fire-code capacity and exits must be confirmed with the venue.</p>
        <div id="mapBox">${m.svg}</div>
      </div>
      <div class="grid" style="align-content:start">
        <div class="card"><h3>Map legend</h3><div class="legend">${m.zones.map(z => `<div><i style="background:${z.color}"></i>${esc(z.label)}</div>`).join("")}</div></div>
        <div class="card"><h3>Venue needs</h3>
          <div class="small"><b>Recommended:</b> ${esc(plan.venue)}</div>
          <div class="small" style="margin-top:6px"><b>Min. capacity:</b> ${Math.ceil(plan.headcount * 1.1)} (headcount + 10%)</div>
          <div class="small"><b>Setup starts:</b> ${EP.clock(plan.start, Math.min(...plan.schedule.map(s => s.offset), -60))}</div>
        </div>
      </div>
    </div>
    <div class="card" style="margin-top:18px">
      <div class="row between"><div><div class="eyebrow">Event vision</div><h3 style="margin:4px 0 0">${esc(v.theme)}</h3></div>${plan.aiUsed ? '<span class="tag ai">AI generated</span>' : '<span class="tag">Template</span>'}</div>
      <div class="vision-quote">“${esc(v.tagline)}”</div>
      <p>${esc(v.summary)}</p>
      <div class="row">${v.mood.map(m => `<span class="tag">${esc(m)}</span>`).join("")}</div>
      <h4 style="margin:18px 0 4px" class="small muted">COLOR PALETTE</h4>
      <div class="palette">${v.palette.map(c => `<div style="background:${c.hex}" title="${c.hex}">${esc(c.name)}<br>${c.hex}</div>`).join("")}</div>
      <h4 style="margin:18px 0 8px" class="small muted">ATTENDEE JOURNEY</h4>
      <div class="journey">${v.journey.map(s => `<div><b>${esc(s.stage)}</b>${esc(s.text)}</div>`).join("")}</div>
    </div>`;
  $("#layoutSel").onchange = e => { plan.layout = e.target.value; renderVision(); changed(); };
  $("#dlMap").onclick = () => download(plan.title.replace(/\W+/g, "-") + "-map.svg", $("#mapBox").innerHTML, "image/svg+xml");
};

/* =============== LOGISTICS =============== */
const offsetToTime = off => { const [h, m] = plan.start.split(":").map(Number); let t = ((h * 60 + m + off) % 1440 + 1440) % 1440; return String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0"); };
const timeToOffset = val => { const [h, m] = val.split(":").map(Number); const [sh, sm] = plan.start.split(":").map(Number); let d = h * 60 + m - (sh * 60 + sm); if (d < -720) d += 1440; if (d > 1080) d -= 1440; return d; };

const renderLogistics = () => {
  const vols = plan.roles.reduce((a, r) => a + (+r.count || 0), 0);
  const endOff = Math.max(...plan.schedule.map(s => s.offset), plan.hours * 60);
  $("#p-logistics").innerHTML = `
    <div class="kpis">
      <div class="kpi"><div class="l">Date</div><div class="v" style="font-size:1.1rem">${EP.fmtDate(plan.date, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</div></div>
      <div class="kpi"><div class="l">Doors / end</div><div class="v" style="font-size:1.1rem">${EP.clock(plan.start, 0)} – ${EP.clock(plan.start, endOff)}</div></div>
      <div class="kpi"><div class="l">Guests</div><div class="v">${plan.headcount}</div></div>
      <div class="kpi"><div class="l">Staff & volunteers</div><div class="v">${vols}</div></div>
    </div>
    <div class="card" style="margin-bottom:18px">
      <div class="fields" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
        <label>Event title<input data-f="title" value="${esc(plan.title)}"></label>
        <label>Date<input type="date" data-f="date" value="${plan.date}"></label>
        <label>Doors open<input type="time" data-f="start" value="${plan.start}"></label>
        <label>Headcount<input type="number" data-f="headcount" value="${plan.headcount}"></label>
        <label>Venue<input data-f="venueName" value="${esc(plan.venueName || "")}" placeholder="${esc(plan.venue)}"></label>
      </div>
      <p class="muted small" style="margin:8px 0 0">Changing headcount rescales per-guest budget lines and the map.</p>
    </div>
    <div class="row between"><h3>Run of show</h3><div class="row no-print"><button class="btn ghost sm" id="addSched">+ Add row</button><button class="btn ghost sm" id="csvSched">Export CSV</button></div></div>
    <div class="sheet-wrap"><table class="sheet"><thead><tr><th style="width:120px">Time</th><th>Activity</th><th style="width:180px">Owner</th><th>Notes</th><th style="width:40px"></th></tr></thead>
    <tbody id="schedBody">${plan.schedule.map(s => `<tr data-id="${s.id}">
      <td><input type="time" data-k="time" value="${offsetToTime(s.offset)}"></td>
      <td><input data-k="activity" value="${esc(s.activity)}"></td>
      <td><input data-k="owner" value="${esc(s.owner)}"></td>
      <td><input data-k="notes" value="${esc(s.notes === "AI" ? "" : s.notes)}" placeholder="${s.notes === "AI" ? "AI suggested" : ""}"></td>
      <td><button class="x" title="Delete">×</button></td></tr>`).join("")}</tbody></table></div>

    <div class="row between" style="margin-top:24px"><h3>Staffing & roles</h3><div class="row no-print"><button class="btn ghost sm" id="addRole">+ Add role</button></div></div>
    <div class="sheet-wrap"><table class="sheet"><thead><tr><th>Role</th><th class="num" style="width:80px">#</th><th style="width:160px">Shift</th><th>Responsibilities</th><th style="width:40px"></th></tr></thead>
    <tbody id="roleBody">${plan.roles.map(r => `<tr data-id="${r.id}">
      <td><input data-k="role" value="${esc(r.role)}"></td><td class="num"><input type="number" data-k="count" value="${r.count}"></td>
      <td><input data-k="shift" value="${esc(r.shift)}" placeholder="e.g. 4–9 PM"></td><td><input data-k="duties" value="${esc(r.duties)}"></td>
      <td><button class="x">×</button></td></tr>`).join("")}</tbody></table></div>

    <div class="grid g3" style="margin-top:24px">
      <div class="card"><h3>Day-of essentials</h3><ul class="small" style="padding-left:18px;margin:0">
        <li>Printed run-of-show & check-in list</li><li>Venue contact + AV tech phone numbers</li><li>First-aid kit & nearest AED location</li><li>Extension cords, tape, scissors, markers</li><li>Card reader / cash box if selling tickets</li></ul></div>
      <div class="card"><h3>Accessibility</h3><ul class="small" style="padding-left:18px;margin:0">
        <li>Step-free route from entrance to all zones</li><li>Reserved accessible seating near the front</li><li>Mic for every speaker; captions on slides</li><li>Label allergens on all food</li></ul></div>
      <div class="card"><h3>${plan.layout === "festival" ? "Rain plan" : "Contingencies"}</h3><ul class="small" style="padding-left:18px;margin:0">
        ${plan.layout === "festival" ? "<li>Indoor backup space reserved</li><li>Go/no-go call 24 hrs before</li><li>Tents weighted, not staked</li>" : "<li>Overflow seating if RSVPs exceed headcount</li><li>Backup laptop + slides on USB</li>"}
        <li>Point person for incidents: Event lead</li><li>Campus emergency number posted at check-in</li></ul></div>
    </div>`;

  $$("#p-logistics [data-f]").forEach(inp => inp.onchange = () => {
    const f = inp.dataset.f, val = inp.value;
    if (f === "headcount") {
      const old = plan.headcount, nh = Math.max(5, +val || old);
      plan.budgetLines.forEach(l => { if (/per guest|per participant|per table|meal|officer/.test(l.unit)) l.qty = Math.max(1, Math.round(l.qty * nh / old)); });
      plan.headcount = nh;
    } else if (f === "start") plan.start = val || plan.start;
    else if (f === "date") plan.date = val || plan.date;
    else plan[f] = val;
    if (f !== "title") { const edited = pickEdited(plan.emails); plan.emails = Object.assign(EP.defaultEmails(plan), edited); }
    renderAll(); changed();
  });
  bindRows("#schedBody", plan.schedule, (s, k, v) => { if (k === "time") s.offset = timeToOffset(v); else s[k] = v; });
  bindRows("#roleBody", plan.roles, (r, k, v) => r[k] = k === "count" ? +v : v, renderLogistics);
  $("#addSched").onclick = () => { const last = plan.schedule[plan.schedule.length - 1]; plan.schedule.push({ id: EP.uid(), offset: (last ? last.offset : 0) + 15, activity: "", owner: "", notes: "" }); renderLogistics(); changed(); };
  $("#addRole").onclick = () => { plan.roles.push({ id: EP.uid(), role: "", count: 1, shift: "", duties: "" }); renderLogistics(); changed(); };
  $("#csvSched").onclick = () => download("run-of-show.csv", toCSV([["Time", "Activity", "Owner", "Notes"], ...plan.schedule.map(s => [EP.clock(plan.start, s.offset), s.activity, s.owner, s.notes === "AI" ? "" : s.notes]), [], ["Role", "Count", "Shift", "Responsibilities"], ...plan.roles.map(r => [r.role, r.count, r.shift, r.duties])]), "text/csv");
};

/* generic editable-row binding: input → update model; × → delete row */
function bindRows(sel, arr, set, after) {
  const body = $(sel);
  body.addEventListener("input", e => {
    const tr = e.target.closest("tr[data-id]"); if (!tr || !e.target.dataset.k) return;
    const obj = arr.find(o => o.id === tr.dataset.id); if (!obj) return;
    set(obj, e.target.dataset.k, e.target.type === "checkbox" ? e.target.checked : e.target.value, tr);
    changed();
  });
  if (after) body.addEventListener("change", e => { if (e.target.dataset.k) after(); });
  body.addEventListener("click", e => {
    if (!e.target.classList.contains("x")) return;
    const tr = e.target.closest("tr[data-id]"); const i = arr.findIndex(o => o.id === tr.dataset.id);
    if (i >= 0) arr.splice(i, 1);
    tr.remove(); changed(); if (after) after();
  });
}

/* =============== BUDGET =============== */
const renderBudget = () => {
  const t = EP.totals(plan);
  plan.budgetLines.sort((a, b) => EP.CATEGORIES.indexOf(a.category) - EP.CATEGORIES.indexOf(b.category));
  const max = Math.max(...Object.values(t.byCat), 1);
  $("#p-budget").innerHTML = `
    <div class="kpis" id="budgetKpis"></div>
    <div class="notice info no-print">This is a live spreadsheet — edit any cell and totals, funding gap and per-guest cost update instantly. Unit costs are typical estimates; replace them with real vendor quotes before submitting your SGS request.</div>
    <div class="row between"><h3>Expense sheet</h3>
      <div class="row no-print"><button class="btn ghost sm" id="addLine">+ Add line</button><button class="btn ghost sm" id="fitBudget">Fit to target budget</button><button class="btn ghost sm" id="copyTSV">Copy for Google Sheets / Excel</button><button class="btn ghost sm" id="csvBudget">Export CSV</button></div></div>
    <div class="sheet-wrap"><table class="sheet">
      <thead><tr><th style="width:170px">Category</th><th>Item</th><th class="num" style="width:80px">Qty</th><th style="width:120px">Unit</th><th class="num" style="width:110px">Unit cost</th><th class="num" style="width:110px">Total</th><th>Notes</th><th style="width:36px"></th></tr></thead>
      <tbody id="budgetBody">${plan.budgetLines.map(l => `<tr data-id="${l.id}">
        <td><select data-k="category">${EP.CATEGORIES.map(c => `<option ${c === l.category ? "selected" : ""}>${c}</option>`).join("")}</select></td>
        <td><input data-k="item" value="${esc(l.item)}"></td>
        <td class="num"><input type="number" step="any" data-k="qty" value="${l.qty}"></td>
        <td><input data-k="unit" value="${esc(l.unit)}"></td>
        <td class="num"><input type="number" step="0.01" data-k="unitCost" value="${l.unitCost}"></td>
        <td class="num ro" data-total>${money(EP.lineTotal(l))}</td>
        <td><input data-k="notes" value="${esc(l.notes || "")}" title="${esc(l.notes || "")}"></td>
        <td><button class="x" title="Delete line">×</button></td></tr>`).join("")}</tbody>
      <tbody>
        <tr class="linked"><td class="ro"><span class="cat-dot" style="background:${EP.CATEGORY_COLORS.Supplies}"></span>Supplies</td><td class="ro" colspan="4">Supply order list <span class="muted small">(linked to the Supply Orders tab)</span></td><td class="ro num" id="supLinked">${money(t.supplies)}</td><td class="ro small muted" colspan="2">${plan.supplies.filter(s => s.buy).length} items selected</td></tr>
        <tr class="sub"><td colspan="5">Subtotal</td><td class="num" id="subT">${money(t.subtotal)}</td><td colspan="2"></td></tr>
        <tr class="sub"><td colspan="4">Contingency (unexpected costs)</td><td class="num"><input type="number" id="contPct" value="${plan.contingencyPct}" style="width:60px;display:inline-block;text-align:right;padding:4px"> %</td><td class="num" id="contT">${money(t.contingency)}</td><td colspan="2" class="small muted">10% is a common cushion</td></tr>
        <tr class="total"><td colspan="5">TOTAL ESTIMATED COST</td><td class="num" id="grandT">${money(t.grand)}</td><td colspan="2" id="perHead">${money(t.perHead)} per guest</td></tr>
      </tbody></table></div>

    <div class="grid g2" style="margin-top:22px">
      <div class="card">
        <div class="row between"><h3 style="margin:0">Funding sources</h3><button class="btn ghost sm no-print" id="addFund">+ Add source</button></div>
        <div class="sheet-wrap" style="margin-top:10px"><table class="sheet" style="min-width:0"><thead><tr><th>Source</th><th class="num" style="width:130px">Amount</th><th style="width:36px"></th></tr></thead>
          <tbody id="fundBody">${plan.funding.map(f => `<tr data-id="${f.id}"><td><input data-k="source" value="${esc(f.source)}"></td><td class="num"><input type="number" data-k="amount" value="${f.amount}"></td><td><button class="x">×</button></td></tr>`).join("")}</tbody>
          <tbody><tr class="sub"><td>Total funding</td><td class="num" id="fundT">${money(t.funded)}</td><td></td></tr></tbody></table></div>
        <p class="small muted" style="margin-bottom:0"><span class="tag verify">Verify</span> SGS funding deadlines, caps and allowable expenses change each year — confirm the current cycle before submitting.</p>
      </div>
      <div class="card"><h3>Where the money goes</h3><div class="chartbars" id="catBars">${barsHTML(t, max)}</div></div>
    </div>`;
  renderBudgetKpis();

  const body = $("#budgetBody");
  body.addEventListener("input", e => {
    const tr = e.target.closest("tr[data-id]"); const k = e.target.dataset.k; if (!tr || !k) return;
    const l = plan.budgetLines.find(x => x.id === tr.dataset.id);
    l[k] = ["qty", "unitCost"].includes(k) ? +e.target.value : e.target.value;
    tr.querySelector("[data-total]").textContent = money(EP.lineTotal(l));
    refreshBudgetTotals(); changed();
  });
  body.addEventListener("change", e => { if (e.target.dataset.k === "category") { renderBudget(); } });
  body.addEventListener("click", e => {
    if (!e.target.classList.contains("x")) return;
    const id = e.target.closest("tr").dataset.id;
    plan.budgetLines = plan.budgetLines.filter(l => l.id !== id); renderBudget(); changed();
  });
  bindRows("#fundBody", plan.funding, (f, k, v) => { f[k] = k === "amount" ? +v : v; refreshBudgetTotals(); });
  $("#contPct").oninput = e => { plan.contingencyPct = +e.target.value; refreshBudgetTotals(); changed(); };
  $("#addLine").onclick = () => { plan.budgetLines.push({ id: EP.uid(), category: "Supplies", item: "", qty: 1, unit: "flat", unitCost: 0, notes: "" }); renderBudget(); changed(); const inp = $$("#budgetBody tr:last-child [data-k=item]")[0]; inp && inp.focus(); };
  $("#addFund").onclick = () => { plan.funding.push({ id: EP.uid(), source: "", amount: 0 }); renderBudget(); changed(); };
  $("#fitBudget").onclick = () => {
    const before = EP.totals(plan).grand;
    const r = EP.fitToBudget(plan); if (!r) return;
    renderBudget(); renderSupplies(); changed();
    EP.toast(`Scaled flexible costs ×${r.toFixed(2)}: ${money(before)} → ${money(EP.totals(plan).grand)}`);
  };
  const rows = () => [["Category", "Item", "Qty", "Unit", "Unit cost", "Total", "Notes"], ...plan.budgetLines.map(l => [l.category, l.item, l.qty, l.unit, l.unitCost, EP.lineTotal(l), l.notes || ""]),
    ["Supplies", "Supply order list", "", "", "", EP.totals(plan).supplies, ""], ["", "Contingency " + plan.contingencyPct + "%", "", "", "", EP.totals(plan).contingency, ""], ["", "TOTAL", "", "", "", EP.totals(plan).grand, ""],
    [], ["Funding source", "Amount"], ...plan.funding.map(f => [f.source, f.amount])];
  $("#csvBudget").onclick = () => download(plan.title.replace(/\W+/g, "-") + "-budget.csv", toCSV(rows()), "text/csv");
  $("#copyTSV").onclick = () => copy(rows().map(r => r.join("\t")).join("\n"), "Budget copied — paste into Google Sheets or Excel");
};
const barsHTML = (t, max) => Object.entries(t.byCat).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([c, v]) =>
  `<div class="r"><span><span class="cat-dot" style="background:${EP.CATEGORY_COLORS[c] || "#94a3b8"}"></span>${esc(c)}</span><div class="t"><i style="width:${(v / max * 100).toFixed(1)}%;background:${EP.CATEGORY_COLORS[c] || "#94a3b8"}"></i></div><span class="num small">${money(v)}</span></div>`).join("");
const renderBudgetKpis = () => {
  const t = EP.totals(plan), over = t.grand - plan.targetBudget;
  $("#budgetKpis").innerHTML = `
    <div class="kpi"><div class="l">Estimated total</div><div class="v">${money(t.grand)}</div></div>
    <div class="kpi"><div class="l">Target budget</div><div class="v"><input type="number" id="targetIn" value="${plan.targetBudget}" style="font:inherit;padding:0 4px;border:0;border-bottom:1px dashed var(--line);border-radius:0;width:100%"></div></div>
    <div class="kpi ${over > 0 ? "bad" : "good"}"><div class="l">${over > 0 ? "Over target by" : "Under target by"}</div><div class="v">${money(Math.abs(over))}</div></div>
    <div class="kpi ${t.gap < 0 ? "bad" : "good"}"><div class="l">${t.gap < 0 ? "Funding shortfall" : "Funding surplus"}</div><div class="v">${money(Math.abs(t.gap))}</div></div>
    <div class="kpi"><div class="l">Cost per guest</div><div class="v">${money(t.perHead)}</div></div>`;
  $("#targetIn").onchange = e => { plan.targetBudget = +e.target.value; plan.autoTarget = false; renderBudgetKpis(); changed(); };
};
const refreshBudgetTotals = () => {
  const t = EP.totals(plan);
  $("#subT").textContent = money(t.subtotal); $("#contT").textContent = money(t.contingency); $("#grandT").textContent = money(t.grand);
  $("#perHead").textContent = money(t.perHead) + " per guest"; $("#fundT").textContent = money(t.funded); $("#supLinked").textContent = money(t.supplies);
  $("#catBars").innerHTML = barsHTML(t, Math.max(...Object.values(t.byCat), 1));
  renderBudgetKpis();
};

/* =============== CHECKLIST =============== */
const GROUPS = [[42, "6+ weeks before"], [28, "4–6 weeks before"], [14, "2–4 weeks before"], [7, "1–2 weeks before"], [1, "Final week"], [0, "Event day"], [-999, "After the event"]];
const renderChecklist = () => {
  const today = EP.isoDate(new Date());
  const done = plan.checklist.filter(c => c.done).length;
  $("#ckCount").textContent = done + "/" + plan.checklist.length;
  const groups = GROUPS.map(([min, label], i) => ({ label, items: plan.checklist.filter(c => c.days >= min && (i === 0 || c.days < GROUPS[i - 1][0])) })).filter(g => g.items.length);
  const daysLeft = Math.round((EP.parseDate(plan.date) - EP.parseDate(today)) / 864e5);
  $("#p-checklist").innerHTML = `
    <div class="kpis">
      <div class="kpi"><div class="l">Days until event</div><div class="v">${daysLeft}</div></div>
      <div class="kpi"><div class="l">Completed</div><div class="v">${done} / ${plan.checklist.length}</div><div class="bar" style="margin-top:8px"><i style="width:${(done / Math.max(1, plan.checklist.length) * 100).toFixed(0)}%;background:var(--good)"></i></div></div>
      <div class="kpi bad"><div class="l">Overdue</div><div class="v">${plan.checklist.filter(c => !c.done && EP.addDays(plan.date, -c.days) < today).length}</div></div>
      <div class="kpi"><div class="l">Need verification</div><div class="v">${plan.checklist.filter(c => c.verify).length}</div></div>
    </div>
    ${daysLeft < 42 ? `<div class="notice">Your event is ${daysLeft} days away — some standard lead times have already passed. Red items are overdue: contact SGS / CSLE now about expedited options.</div>` : ""}
    <div class="row between no-print" style="margin-bottom:12px">
      <div class="row" style="flex:1;min-width:260px"><input id="newTask" placeholder="Add a task…" style="flex:1"><input type="number" id="newDays" value="14" style="width:90px" title="Days before event"><button class="btn sm" id="addTask">Add</button></div>
      <div class="row"><button class="btn ghost sm" id="icsBtn">Add deadlines to calendar (.ics)</button><button class="btn ghost sm" id="csvCk">Export CSV</button></div>
    </div>
    <div class="checklist">${groups.map(g => `<div class="ck-group"><h4><span>${g.label}</span><span>${g.items.filter(c => c.done).length}/${g.items.length}</span></h4>
      ${g.items.map(c => { const due = EP.addDays(plan.date, -c.days); const late = !c.done && due < today; const soon = !c.done && !late && due <= EP.addDays(today, 7);
        return `<div class="ck ${c.done ? "done" : ""}" data-id="${c.id}"><input type="checkbox" ${c.done ? "checked" : ""}>
        <div><div class="t">${esc(c.task)}</div><div class="meta">${esc(c.owner)} ${c.verify ? '<span class="tag verify">Verify with SGS/CSLE</span>' : ""} ${c.ai ? '<span class="tag ai">AI</span>' : ""}</div></div>
        <div class="due ${late ? "late" : soon ? "soon" : ""}">${late ? "Overdue · " : ""}${EP.fmtDate(due)}<br><span class="muted" style="font-weight:400">${c.days > 0 ? c.days + " days before" : c.days === 0 ? "event day" : -c.days + " days after"}</span></div></div>`; }).join("")}</div>`).join("")}</div>`;
  $("#p-checklist .checklist").onchange = e => {
    const row = e.target.closest(".ck"); const c = plan.checklist.find(x => x.id === row.dataset.id);
    c.done = e.target.checked; renderChecklist(); changed();
  };
  $("#addTask").onclick = () => {
    const task = $("#newTask").value.trim(); if (!task) return;
    plan.checklist.push({ id: EP.uid(), task, days: +$("#newDays").value || 0, owner: "Events Chair", verify: false, done: false });
    plan.checklist.sort((a, b) => b.days - a.days); renderChecklist(); changed();
  };
  $("#csvCk").onclick = () => download("event-checklist.csv", toCSV([["Due date", "Task", "Owner", "Verify with SGS/CSLE", "Done"], ...plan.checklist.map(c => [EP.addDays(plan.date, -c.days), c.task, c.owner, c.verify ? "yes" : "", c.done ? "yes" : ""])]), "text/csv");
  $("#icsBtn").onclick = () => {
    const ev = plan.checklist.filter(c => !c.done).map(c => { const d = EP.addDays(plan.date, -c.days).replace(/-/g, "");
      return `BEGIN:VEVENT\r\nUID:${c.id}@eventplanner.ai\r\nDTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z\r\nDTSTART;VALUE=DATE:${d}\r\nSUMMARY:${icsEsc("[" + plan.title + "] " + c.task)}\r\nDESCRIPTION:${icsEsc("Owner: " + c.owner)}\r\nEND:VEVENT`; });
    download("event-deadlines.ics", `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//EventPlanner AI//EN\r\n${ev.join("\r\n")}\r\nEND:VCALENDAR`, "text/calendar");
  };
};
const icsEsc = s => s.replace(/[\\;,]/g, m => "\\" + m).replace(/\n/g, "\\n");

/* =============== EMAILS =============== */
const TONES = ["warm and professional", "formal and respectful", "excited and energetic", "short and direct"];
const renderEmails = () => {
  const keys = Object.keys(plan.emails);
  const isSocial = emailKey === "social";
  const e = isSocial ? null : plan.emails[emailKey];
  const personal = e && e.body.includes("{{name}}");
  $("#p-emails").innerHTML = `
    <div class="email-layout">
      <div class="email-list">
        ${keys.map(k => `<button data-k="${k}" class="${k === emailKey ? "on" : ""}">${esc(plan.emails[k].label)} ${plan.emails[k].ai ? '<span class="tag ai">AI</span>' : ""}<small>${esc(plan.emails[k].audience)}</small></button>`).join("")}
        <button data-k="social" class="${isSocial ? "on" : ""}">Social media post<small>Instagram caption</small></button>
      </div>
      <div class="card email-editor">
        ${isSocial ? `
          <h3>Instagram / social caption</h3>
          <textarea class="body" id="socialTxt" style="min-height:240px">${esc(plan.social)}</textarea>
          <div class="row" style="margin-top:10px"><button class="btn sm" id="copySocial">Copy caption</button>${aiBtns()}</div>` : `
          <div class="fields">
            <label class="full">To<input id="eTo" value="${esc(e.to)}"></label>
            <label class="full">Subject<input id="eSubj" value="${esc(e.subject)}"></label>
          </div>
          <label style="margin-top:10px">Body<textarea class="body" id="eBody">${esc(e.body)}</textarea></label>
          <div class="row" style="margin-top:10px">
            <button class="btn sm" id="copyEmail">Copy</button>
            <a class="btn ghost sm" id="gmail" target="_blank" rel="noopener">Open in Gmail</a>
            <a class="btn ghost sm" id="mailto">Open in mail app</a>
            ${aiBtns()}
          </div>
          ${personal ? `
          <hr style="border:0;border-top:1px solid var(--line);margin:22px 0">
          <div class="row between"><h3 style="margin:0">Recipients · personalized mail merge</h3><button class="btn ghost sm" id="addVip">+ Add recipient</button></div>
          <p class="muted small">Each recipient gets their own copy with <code>{{name}}</code> and <code>{{title}}</code> filled in.</p>
          <div class="sheet-wrap vip-table"><table class="sheet" style="min-width:560px"><thead><tr><th>Name</th><th>Title / role</th><th>Office</th><th>Email</th><th style="width:36px"></th></tr></thead>
          <tbody id="vipBody">${plan.vips.map(v => `<tr data-id="${v.id}"><td><input data-k="name" value="${esc(v.name)}" placeholder="Dr. Jane Doe"></td><td><input data-k="title" value="${esc(v.title)}"></td><td><input data-k="org" value="${esc(v.org)}"></td><td><input data-k="email" value="${esc(v.email)}" placeholder="name@university.edu"></td><td><button class="x">×</button></td></tr>`).join("")}</tbody></table></div>
          <div class="row" style="margin-top:10px"><button class="btn sm" id="mergeBtn">Generate ${plan.vips.length} personalized emails</button></div>
          <div class="personalized" id="merged"></div>` : ""}`}
      </div>
    </div>`;

  $(".email-list").onclick = ev => { const b = ev.target.closest("button[data-k]"); if (b) { emailKey = b.dataset.k; renderEmails(); } };
  const aiGo = $("#aiRewrite");
  if (aiGo) aiGo.onclick = () => rewrite();
  if (isSocial) {
    $("#socialTxt").oninput = ev => { plan.social = ev.target.value; changed(); };
    $("#copySocial").onclick = () => copy(plan.social, "Caption copied");
    return;
  }
  const sync = () => {
    e.to = $("#eTo").value; e.subject = $("#eSubj").value; e.body = $("#eBody").value;
    const to = e.to.includes("{{") || e.to.includes("[") ? "" : e.to;
    $("#gmail").href = gmailURL(to, e.subject, e.body);
    $("#mailto").href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(e.subject)}&body=${encodeURIComponent(e.body)}`;
  };
  ["#eTo", "#eSubj", "#eBody"].forEach(s => $(s).oninput = () => { sync(); e.edited = true; changed(); });
  sync();
  $("#copyEmail").onclick = () => copy("Subject: " + e.subject + "\n\n" + e.body, "Email copied");
  if (personal) {
    bindRows("#vipBody", plan.vips, (v, k, val) => v[k] = val);
    $("#addVip").onclick = () => { plan.vips.push({ id: EP.uid(), name: "", title: "", org: "", email: "" }); renderEmails(); changed(); };
    $("#mergeBtn").onclick = () => {
      const fill = (s, v) => s.replace(/\{\{name\}\}/g, v.name || v.title).replace(/\{\{title\}\}/g, v.title || "our guest").replace(/\{\{email\}\}/g, v.email);
      $("#merged").innerHTML = plan.vips.map((v, i) => {
        const subj = fill(e.subject, v), body = fill(e.body, v);
        return `<details ${i === 0 ? "open" : ""}><summary>${esc(v.name || v.title)} <span class="muted small">${esc(v.email || "no email yet")}</span></summary>
          <pre><b>Subject:</b> ${esc(subj)}\n\n${esc(body)}</pre>
          <div class="row"><a class="btn sm" target="_blank" rel="noopener" href="${gmailURL(v.email, subj, body)}">Open in Gmail</a><a class="btn ghost sm" href="mailto:${encodeURIComponent(v.email)}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}">Mail app</a></div></details>`;
      }).join("");
    };
  }
};
const aiBtns = () => `<span style="flex:1"></span>
  <select id="tone" style="width:auto">${TONES.map(t => `<option>${t}</option>`).join("")}</select>
  <input id="aiInstr" placeholder="Extra instructions (optional)" style="width:220px">
  <button class="btn gold sm" id="aiRewrite">✨ Rewrite with local AI</button>`;
const gmailURL = (to, su, body) => `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to || "")}&su=${encodeURIComponent(su)}&body=${encodeURIComponent(body)}`;

async function rewrite() {
  if (EP.ai.status !== "online") await EP.ai.check();
  if (EP.ai.status !== "online") { EP.toast("Ollama isn't reachable — click the AI status pill for setup help"); return; }
  const btn = $("#aiRewrite"), tone = $("#tone").value, instructions = $("#aiInstr").value;
  btn.disabled = true; btn.textContent = "Writing…";
  try {
    if (emailKey === "social") {
      const ta = $("#socialTxt");
      const out = await EP.ai.chat([{ role: "user", content: `Write an Instagram caption (max 80 words, with emojis and 4-6 hashtags) for "${plan.title}" hosted by ${plan.clubName} on ${EP.fmtDate(plan.date, { weekday: "long", month: "long", day: "numeric" })} at ${EP.clock(plan.start, 0)}. Vibe: ${plan.vision.summary}. Tone: ${tone}. ${instructions}. Output only the caption.` }], { onToken: t => ta.value = t, temperature: 0.8 });
      plan.social = out.trim(); renderEmails();
    } else {
      const body = $("#eBody"), subj = $("#eSubj");
      const r = await EP.aiEmail(plan, emailKey, { tone, instructions, onToken: t => { body.value = t.replace(/^subject:.*\n+/i, ""); const m = t.match(/subject:\s*(.+)/i); if (m) subj.value = m[1]; } });
      Object.assign(plan.emails[emailKey], r, { ai: true, edited: true });
      renderEmails();
    }
    changed(); EP.toast("Rewritten by " + EP.ai.settings().model);
  } catch (err) { EP.toast("AI error: " + err.message); btn.disabled = false; btn.textContent = "✨ Rewrite with local AI"; }
}

/* =============== SUPPLIES =============== */
const renderSupplies = () => {
  const pref = EP.store.get("store", "amazon");
  const sel = plan.supplies.filter(s => s.buy);
  $("#supCount").textContent = sel.length;
  const tot = EP.suppliesTotal(plan);
  $("#p-supplies").innerHTML = `
    <div class="kpis">
      <div class="kpi"><div class="l">Items to order</div><div class="v">${sel.length}</div></div>
      <div class="kpi"><div class="l">Estimated cost</div><div class="v" id="supTot">${money(tot)}</div></div>
      <div class="kpi"><div class="l">Order by</div><div class="v" style="font-size:1.1rem">${EP.fmtDate(EP.addDays(plan.date, -14))}</div></div>
    </div>
    <div class="notice info no-print">Checked items flow into the Budget tab automatically. Store buttons open a live product search for each item — compare prices, then buy with your club's card or the approved purchasing process (keep receipts for reimbursement).</div>
    <div class="row between"><h3>Supply order list</h3>
      <div class="row no-print"><label class="small" style="display:flex;gap:6px;align-items:center">Preferred store <select id="prefStore" style="width:auto">${EP.STORES.map(s => `<option value="${s.id}" ${s.id === pref ? "selected" : ""}>${s.name}</option>`).join("")}</select></label>
      <button class="btn ghost sm" id="addSup">+ Add item</button><button class="btn ghost sm" id="copyList">Copy shopping list</button><button class="btn ghost sm" id="csvSup">Export CSV</button></div></div>
    <div class="sheet-wrap"><table class="sheet">
      <thead><tr><th style="width:44px">Buy</th><th>Item</th><th style="width:130px">Category</th><th class="num" style="width:70px">Qty</th><th class="num" style="width:100px">Est. price</th><th class="num" style="width:100px">Total</th><th style="width:250px">Shop online</th><th style="width:36px"></th></tr></thead>
      <tbody id="supBody">${plan.supplies.map(s => `<tr data-id="${s.id}">
        <td style="text-align:center"><input type="checkbox" data-k="buy" ${s.buy ? "checked" : ""} style="width:18px;height:18px"></td>
        <td><input data-k="item" value="${esc(s.item)}">${s.ai ? '' : ''}</td>
        <td><input data-k="category" value="${esc(s.category)}"></td>
        <td class="num"><input type="number" data-k="qty" value="${s.qty}"></td>
        <td class="num"><input type="number" step="0.01" data-k="price" value="${s.price}"></td>
        <td class="num ro" data-total>${money(s.qty * s.price)}</td>
        <td class="ro"><div class="store-links">${storeLinks(s.item, pref)}</div></td>
        <td><button class="x">×</button></td></tr>`).join("")}</tbody></table></div>`;
  $("#prefStore").onchange = e => { EP.store.set("store", e.target.value); renderSupplies(); };
  const body = $("#supBody");
  body.addEventListener("input", e => {
    const tr = e.target.closest("tr[data-id]"); const k = e.target.dataset.k; if (!tr || !k) return;
    const s = plan.supplies.find(x => x.id === tr.dataset.id);
    s[k] = k === "buy" ? e.target.checked : ["qty", "price"].includes(k) ? +e.target.value : e.target.value;
    tr.querySelector("[data-total]").textContent = money(s.qty * s.price);
    if (k === "item") tr.querySelector(".store-links").innerHTML = storeLinks(s.item, EP.store.get("store", "amazon"));
    $("#supTot").textContent = money(EP.suppliesTotal(plan));
    $("#supCount").textContent = plan.supplies.filter(x => x.buy).length;
    changed();
  });
  body.addEventListener("change", e => { if (e.target.dataset.k === "buy" || ["qty", "price"].includes(e.target.dataset.k)) renderBudget(); });
  body.addEventListener("click", e => {
    if (!e.target.classList.contains("x")) return;
    const id = e.target.closest("tr").dataset.id; plan.supplies = plan.supplies.filter(s => s.id !== id);
    renderSupplies(); renderBudget(); changed();
  });
  $("#addSup").onclick = () => { plan.supplies.push({ id: EP.uid(), item: "", qty: 1, price: 0, category: "Misc", buy: true }); renderSupplies(); changed(); };
  $("#copyList").onclick = () => copy(plan.supplies.filter(s => s.buy).map(s => `☐ ${s.qty} × ${s.item} (~${money(s.price)} ea)`).join("\n") + `\n\nEstimated total: ${money(EP.suppliesTotal(plan))}`, "Shopping list copied");
  $("#csvSup").onclick = () => download("supply-order-list.csv", toCSV([["Buy", "Item", "Category", "Qty", "Est. price", "Total", ...EP.STORES.map(s => s.name + " link")], ...plan.supplies.map(s => [s.buy ? "yes" : "", s.item, s.category, s.qty, s.price, s.qty * s.price, ...EP.STORES.map(st => st.url(s.item))])]), "text/csv");
};
const storeLinks = (item, pref) => {
  const q = item.replace(/\(.*?\)/g, "").trim() || "party supplies";
  const stores = [...EP.STORES].sort((a, b) => (b.id === pref) - (a.id === pref));
  return stores.map(s => `<a href="${s.url(q)}" target="_blank" rel="noopener" ${s.id === pref ? 'style="background:var(--navy);color:#fff"' : ""}>${s.name}</a>`).join("");
};

/* ---------- utilities ---------- */
function toCSV(rows) { return rows.map(r => r.map(c => { const s = String(c ?? ""); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(",")).join("\r\n"); }
function download(name, content, type) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
async function copy(text, msg) {
  try { await navigator.clipboard.writeText(text); EP.toast(msg); }
  catch { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); EP.toast(msg); }
}

$("#printBtn").onclick = () => window.print();
$("#exportJson").onclick = () => download(plan.title.replace(/\W+/g, "-") + ".eventplan.json", JSON.stringify(plan, null, 2), "application/json");
$("#savedBtn").onclick = () => {
  const all = EP.store.get("plans", []);
  let dlg = $("#savedDlg"); if (!dlg) { dlg = document.createElement("dialog"); dlg.id = "savedDlg"; document.body.appendChild(dlg); }
  dlg.innerHTML = `<form method="dialog" class="dlg"><h3>Saved plans</h3><p class="muted small">Plans auto-save in this browser.</p>
    <div class="saved-list">${all.map(p => `<a href="planner.html?plan=${p.id}"><span><b>${esc(p.title)}</b><br><span class="small muted">${esc(p.clubName)} · ${EP.fmtDate(p.date)}</span></span><span class="small muted">${p.headcount} guests</span></a>`).join("") || "<p class='muted'>None yet.</p>"}</div>
    <div class="row end"><button class="btn ghost">Close</button></div></form>`;
  dlg.showModal();
};

/* ---------- load saved plan from URL, or auto-run ---------- */
const pid = qs.get("plan");
if (pid) {
  const p = EP.store.get("plans", []).find(x => x.id === pid);
  if (p) { plan = p; $("#prompt").value = p.prompt; $("#club").value = p.clubId; renderAll(); $("#results").classList.add("on"); setTimeout(() => $("#results").scrollIntoView(), 50); }
} else if (qs.get("go") && $("#prompt").value) {
  setTimeout(() => $("#go").click(), 300);
}
})();
