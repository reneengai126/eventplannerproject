/* ============================================================
   EventPlanner AI — club directory + club detail pages
   ============================================================ */
window.EP = window.EP || {};

EP.clubCard = c => {
  const pct = Math.min(100, Math.round(c.spent / Math.max(1, c.allocation) * 100));
  return `<a class="card club-card" href="club.html?id=${encodeURIComponent(c.id)}">
    <div class="row"><div class="club-badge" style="background:${c.color}">${EP.esc(c.short)}</div>
      <div><h3 style="margin:0">${EP.esc(c.name)}</h3><span class="tag">${EP.esc(c.category)}</span> <span class="muted small">${c.members} members</span></div></div>
    <p class="muted small" style="margin:0">${EP.esc(c.mission)}</p>
    <div><div class="row between small"><span>Semester budget used</span><b>${EP.money(c.spent)} / ${EP.money(c.allocation)}</b></div>
      <div class="bar" style="margin-top:4px"><i style="width:${pct}%;background:${c.color}"></i></div></div>
    <div class="small muted">${c.events.length} signature event${c.events.length === 1 ? "" : "s"} ready to plan →</div>
  </a>`;
};

EP.renderClubDirectory = () => {
  const cats = ["All", ...new Set(EP.allClubs().map(c => c.category))];
  let cat = "All", q = "";
  const draw = () => {
    const list = EP.allClubs().filter(c => (cat === "All" || c.category === cat) && (c.name + " " + c.mission).toLowerCase().includes(q));
    EP.$("#clubGrid").innerHTML = list.map(EP.clubCard).join("") || `<p class="muted">No clubs match.</p>`;
    EP.$("#filters").innerHTML = cats.map(c => `<button class="${c === cat ? "on" : ""}" data-c="${EP.esc(c)}">${EP.esc(c)}</button>`).join("");
  };
  EP.$("#filters").onclick = e => { const b = e.target.closest("button"); if (b) { cat = b.dataset.c; draw(); } };
  EP.$("#search").oninput = e => { q = e.target.value.toLowerCase(); draw(); };
  EP.$("#addClubBtn").onclick = () => EP.$("#addClub").showModal();
  EP.$("#addClub").onclose = () => {
    const dlg = EP.$("#addClub"); if (dlg.returnValue !== "save") return;
    const f = new FormData(dlg.querySelector("form"));
    const name = (f.get("name") || "").trim(); if (!name) return;
    const club = {
      id: "c-" + EP.uid(), name, short: (f.get("short") || name.split(/\s+/).map(w => w[0]).join("").slice(0, 4)).toUpperCase(),
      category: f.get("category"), color: f.get("color"), mission: f.get("mission") || "", members: +f.get("members") || 0,
      founded: new Date().getFullYear(), meets: f.get("meets") || "", allocation: +f.get("allocation") || 0, spent: 0,
      officers: [["President", ""], ["Events Chair", ""], ["Treasurer", ""]],
      vips: [["Faculty Advisor", ""], ["Director, CSLE", "Center for Student Leadership & Engagement"]],
      events: [], custom: true
    };
    const all = EP.store.get("customClubs", []); all.push(club); EP.store.set("customClubs", all);
    location.href = "club.html?id=" + club.id;
  };
  draw();
};

EP.renderClubPage = () => {
  const id = new URLSearchParams(location.search).get("id");
  const c = EP.allClubs().find(x => x.id === id);
  const root = EP.$("#club");
  if (!c) { root.innerHTML = `<div class="club-hero"><h1>Club not found</h1><a class="btn" href="clubs.html">Back to all clubs</a></div>`; return; }
  document.title = c.name + " · EventPlanner AI";
  const plans = EP.store.get("plans", []).filter(p => p.clubId === c.id);
  const planned = plans.reduce((a, p) => a + EP.totals(p).grand, 0);
  const remaining = c.allocation - c.spent - planned;
  const pct = v => Math.max(0, Math.min(100, v / Math.max(1, c.allocation) * 100)).toFixed(1);
  const planURL = e => `planner.html?club=${encodeURIComponent(c.id)}&headcount=${e.headcount}&budget=${e.budget}&prompt=${encodeURIComponent(e.prompt)}&go=1`;

  root.innerHTML = `
    <section class="club-hero" style="border-bottom:4px solid ${c.color}">
      <a href="clubs.html" class="small">← All clubs</a>
      <div class="row" style="margin-top:14px;gap:18px;align-items:flex-start">
        <div class="club-badge" style="background:${c.color};width:72px;height:72px;font-size:1.3rem">${EP.esc(c.short)}</div>
        <div style="flex:1;min-width:240px">
          <span class="tag">${EP.esc(c.category)}</span>${c.custom ? ' <span class="tag">Added by you</span>' : ' <span class="tag">Sample club</span>'}
          <h1 style="margin:.2em 0">${EP.esc(c.name)}</h1>
          <p class="muted" style="max-width:720px;margin:0">${EP.esc(c.mission)}</p>
        </div>
        <a class="btn gold lg" href="planner.html?club=${encodeURIComponent(c.id)}">Plan a new event</a>
      </div>
    </section>

    <section style="padding:24px 0">
      <div class="kpis">
        <div class="kpi"><div class="l">Members</div><div class="v">${c.members}</div></div>
        <div class="kpi"><div class="l">Semester allocation</div><div class="v">${EP.money(c.allocation)}</div></div>
        <div class="kpi"><div class="l">Spent so far</div><div class="v">${EP.money(c.spent)}</div></div>
        <div class="kpi"><div class="l">In saved plans</div><div class="v">${EP.money(planned)}</div></div>
        <div class="kpi ${remaining < 0 ? "bad" : "good"}"><div class="l">${remaining < 0 ? "Over allocation" : "Remaining"}</div><div class="v">${EP.money(Math.abs(remaining))}</div></div>
      </div>
      <div class="card">
        <div class="row between small"><b>Semester budget</b><span class="muted">${c.meets ? "Meets " + EP.esc(c.meets) : ""}</span></div>
        <div class="bar" style="height:16px;margin-top:8px;display:flex"><i style="width:${pct(c.spent)}%;background:${c.color};border-radius:0"></i><i style="width:${pct(planned)}%;background:${c.color};opacity:.4;border-radius:0"></i></div>
        <div class="legend" style="grid-auto-flow:column;justify-content:start;gap:18px;margin-top:8px"><div><i style="background:${c.color}"></i>Spent</div><div><i style="background:${c.color};opacity:.4"></i>Planned with EventPlanner AI</div><div><i style="background:var(--surface-2)"></i>Available</div></div>
      </div>
    </section>

    <section class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr));align-items:start">
      <div class="grid">
        <div class="card">
          <h3>Signature events</h3>
          <p class="muted small" style="margin-top:-4px">One click generates the full plan — budget, map, logistics, checklist, emails and supplies.</p>
          <div class="grid" style="gap:10px">
          ${c.events.length ? c.events.map(e => `<div class="row between" style="border:1px solid var(--line);border-radius:10px;padding:12px 14px">
              <div style="flex:1;min-width:180px"><b>${EP.esc(e.name)}</b><div class="small muted">${e.month} · ~${e.headcount} guests · ${EP.money(e.budget)} budget</div></div>
              <a class="btn sm" href="${planURL(e)}">Plan with AI →</a></div>`).join("") : `<p class="muted small">No signature events yet — plan one and it will show up below.</p>`}
          </div>
        </div>
        <div class="card">
          <h3>Saved plans</h3>
          <div class="saved-list">${plans.length ? plans.map(p => `<a href="planner.html?plan=${p.id}"><span><b>${EP.esc(p.title)}</b><br><span class="small muted">${EP.fmtDate(p.date)} · ${p.headcount} guests</span></span><b>${EP.money(EP.totals(p).grand)}</b></a>`).join("") : `<p class="muted small" style="margin:0">Plans you create for ${EP.esc(c.short)} appear here automatically.</p>`}</div>
        </div>
      </div>
      <div class="grid">
        <div class="card"><h3>Executive board</h3>
          <div class="grid" style="gap:8px">${c.officers.map(([r, n]) => `<div class="row between small"><span>${EP.esc(r)}</span><span class="muted">${EP.esc(n || "—")}</span></div>`).join("")}</div>
          <p class="muted small" style="margin-bottom:0">Officer names are placeholders in this demo.</p></div>
        <div class="card"><h3>VIP & leadership contacts</h3>
          <p class="muted small" style="margin-top:-4px">Pre-loaded into the VIP mail merge for every plan.</p>
          <div class="grid" style="gap:8px">${c.vips.map(([t, o]) => `<div class="small"><b>${EP.esc(t)}</b><br><span class="muted">${EP.esc(o)}</span></div>`).join("")}</div></div>
        <div class="card"><h3>Officer handoff notes</h3>
          <p class="muted small">Knowledge that usually leaves with graduating seniors — keep it here for next year's board.</p>
          <textarea id="notes" rows="6" placeholder="e.g. Book the ballroom the day registration opens. Caterer X needs a PO 3 weeks ahead…"></textarea>
          <div class="small muted" id="noteSaved" style="margin-top:4px">Saved in this browser.</div></div>
      </div>
    </section>`;
  const notes = EP.$("#notes");
  notes.value = EP.store.get("notes:" + c.id, "");
  notes.oninput = () => EP.store.set("notes:" + c.id, notes.value);
};
