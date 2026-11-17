/* ============================================================
   EventPlanner AI — plan engine
   1) parse the prompt  2) build an instant plan from templates
   3) enrich it with the local LLM (Ollama) when available
   ============================================================ */
window.EP = window.EP || {};

const CATEGORIES = ["Venue", "Food & Beverage", "Decor", "AV & Tech", "Entertainment", "Speakers", "Marketing", "Staffing & Security", "Supplies"];
EP.CATEGORIES = CATEGORIES;

/* ---------------- prompt parsing ---------------- */
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
EP.parsePrompt = text => {
  const t = " " + text.toLowerCase() + " ";
  const out = {};
  const hc = t.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\+\s*)?(?:people|guests|attendees|students|ppl|persons|delegates|participants|members|audience|attendee|folks)/);
  if (hc) out.headcount = +hc[1].replace(/,/g, "");
  const bud = t.match(/\$\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(k)?/);
  if (bud) out.budget = Math.round(+bud[1].replace(/,/g, "") * (bud[2] ? 1000 : 1));
  const md = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
  const num = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  const now = new Date();
  let d = null;
  if (md) d = new Date(now.getFullYear(), MONTHS.indexOf(md[1]), +md[2]);
  else if (num) d = new Date(num[3] ? (+num[3] < 100 ? 2000 + +num[3] : +num[3]) : now.getFullYear(), +num[1] - 1, +num[2]);
  if (d && !isNaN(d)) { if (d < now && !(num && num[3])) d.setFullYear(d.getFullYear() + 1); out.date = EP.isoDate(d); }
  const tm = t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (tm) { let h = +tm[1] % 12 + (tm[3] === "pm" ? 12 : 0); out.start = String(h).padStart(2, "0") + ":" + (tm[2] || "00"); }
  return out;
};

EP.isoDate = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
EP.parseDate = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
EP.addDays = (s, n) => { const d = EP.parseDate(s); d.setDate(d.getDate() + n); return EP.isoDate(d); };
EP.fmtDate = (s, opts = { weekday: "short", month: "short", day: "numeric" }) => EP.parseDate(s).toLocaleDateString(undefined, opts);
EP.clock = (start, offsetMin) => {
  const [h, m] = start.split(":").map(Number);
  let tot = h * 60 + m + Math.round(offsetMin);
  tot = ((tot % 1440) + 1440) % 1440;
  const hh = Math.floor(tot / 60), mm = tot % 60;
  return ((hh + 11) % 12 + 1) + ":" + String(mm).padStart(2, "0") + (hh < 12 ? " AM" : " PM");
};

EP.detectType = text => {
  const t = text.toLowerCase();
  let best = "social", score = 0;
  for (const [k, v] of Object.entries(EP.TYPES)) {
    const s = v.keywords.reduce((a, kw) => a + (t.includes(kw) ? kw.length : 0), 0);
    if (s > score) { score = s; best = k; }
  }
  return best;
};

const titleCase = s => s.replace(/\w\S*/g, w => (["and", "of", "the", "for", "with", "on", "a", "an", "in", "to"].includes(w.toLowerCase()) ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1)));
EP.guessTitle = text => {
  let s = text.trim().split(/[.\n]/)[0];
  s = s.replace(/^(plan|organize|host|create|throw|run|we're|we are|i want|help me plan|let's)\s+(a|an|our|the)?\s*/i, "");
  s = s.split(/\s+(for|with|on|at|in|featuring|where|that)\s+/i)[0];
  s = s.replace(/\b(casual|a|an|our)\b\s*/gi, "").trim();
  const words = s.split(/\s+/).slice(0, 6).join(" ");
  return titleCase(words || "Club Event");
};

/* ---------------- instant plan (no AI needed) ---------------- */
EP.buildPlan = input => {
  const parsed = EP.parsePrompt(input.prompt);
  const club = EP.allClubs().find(c => c.id === input.clubId) || null;
  const type = input.type && EP.TYPES[input.type] ? input.type : EP.detectType(input.prompt);
  const T = EP.TYPES[type];
  const h = Math.max(5, +input.headcount || parsed.headcount || 100);
  const date = input.date || parsed.date || EP.defaultDate(type);
  const start = input.start || parsed.start || (type === "festival" ? "12:00" : "18:00");
  const evalQ = q => typeof q === "function" ? q(h) : q;

  const plan = {
    id: EP.uid(), createdAt: Date.now(), prompt: input.prompt, aiUsed: false,
    clubId: club ? club.id : "", clubName: club ? club.name : (input.clubName || "Our Organization"),
    title: EP.guessTitle(input.prompt), type, typeLabel: T.label, layout: T.layout,
    date, start, hours: T.hours, headcount: h,
    targetBudget: +input.budget || parsed.budget || 0,
    venue: input.venue || T.venue,
    contingencyPct: 10
  };

  plan.budgetLines = T.budget.map(([category, item, qty, unit, unitCost, notes]) => ({ id: EP.uid(), category, item, qty: evalQ(qty), unit, unitCost, notes }));
  plan.supplies = T.supplies.map(([item, qty, price, category]) => ({ id: EP.uid(), item, qty: evalQ(qty), price, category, buy: price > 0 }));
  plan.schedule = T.schedule.map(([off, activity, owner]) => ({ id: EP.uid(), offset: off, activity, owner, notes: "" }));
  plan.roles = EP.defaultRoles(plan);
  plan.checklist = EP.defaultChecklist(plan);
  plan.vision = EP.defaultVision(plan);
  plan.vips = (club ? club.vips : [["Director, CSLE", "Center for Student Leadership & Engagement"], ["Faculty Advisor", "Academic Department"]])
    .map(([title, org]) => ({ id: EP.uid(), name: "", title, org, email: "" }));
  plan.zones = null;

  plan.autoTarget = !plan.targetBudget;
  EP.baselineFunding(plan);
  plan.emails = EP.defaultEmails(plan);
  plan.social = EP.defaultSocial(plan);
  return plan;
};

/* Default funding mix. With no budget in the prompt, the target is the plan's own estimate. */
EP.baselineFunding = plan => {
  if (plan.autoTarget) plan.targetBudget = Math.ceil(EP.totals(plan).grand / 50) * 50;
  const target = plan.targetBudget;
  plan.funding = [
    { id: EP.uid(), source: "SGS / student activity fund request", amount: Math.round(target * 0.7) },
    { id: EP.uid(), source: "Club treasury / dues", amount: Math.round(target * 0.2) },
    { id: EP.uid(), source: "Sponsorship / co-sponsors", amount: Math.round(target * 0.1) },
    { id: EP.uid(), source: "Ticket sales", amount: 0 }
  ];
};

/* No date given: the first Friday (Saturday for outdoor festivals) at least 8 weeks out — enough lead time for funding & room booking. */
EP.defaultDate = type => {
  const d = new Date(); d.setDate(d.getDate() + 56);
  const want = type === "festival" ? 6 : 5;
  while (d.getDay() !== want) d.setDate(d.getDate() + 1);
  return EP.isoDate(d);
};

EP.allClubs = () => EP.CLUBS.concat(EP.store.get("customClubs", []));

EP.defaultRoles = p => {
  const h = p.headcount;
  return [
    ["Event lead (Events Chair)", 1, "Owns the run-of-show, final decisions, vendor point of contact"],
    ["Treasurer", 1, "Funding request, purchase approvals, receipts & reimbursement"],
    ["Setup / teardown crew", Math.ceil(h / 50) + 2, "Arrive 2 hrs early; tables, decor, signage, cleanup"],
    ["Registration & check-in", Math.max(2, Math.ceil(h / 75)), "Check-in list, wristbands/name tags, headcount tracking"],
    ["VIP & speaker host", p.type === "speaker" || h > 150 ? 2 : 1, "Greets VIPs, escorts to reserved seating, green room"],
    ["Tech / AV lead", 1, "Mics, slides, music, coordinates with venue AV"],
    ["Photographer / social media", 1, "Photos, live stories, post-event recap"],
    ["Floaters & safety", Math.max(1, Math.ceil(h / 100)), "Crowd flow, accessibility help, first point for incidents"]
  ].map(([role, count, duties]) => ({ id: EP.uid(), role, count, shift: "", duties }));
};

EP.defaultChecklist = p => {
  const h = p.headcount, t = p.type;
  const items = [
    [56, "Draft event concept, goals & rough budget with exec board", "President", false],
    [49, "Confirm event date doesn't conflict with major campus events", "Events Chair", false],
    [42, "Submit funding request to Student Government Services (SGS) — check this cycle's deadline", "Treasurer", true],
    [42, "Reserve venue + rain location through campus room reservations", "Events Chair", true],
    [35, "Register the event in Campus Groups and request any required approvals", "Events Chair", true],
    [35, "Request 2 quotes from approved / contracted vendors (catering, rentals)", "Treasurer", true],
    [28, "Send VIP & university leadership invitations", "President", false],
    [28, "Book performers / speakers and collect contracts + W-9s", "Events Chair", true],
    [21, "Place catering order with approved vendor", "Treasurer", true],
    [21, "Launch marketing: poster, Instagram post, listserv email", "Marketing", false],
    [14, "Order supplies from the supply order list", "Treasurer", false],
    [14, "Confirm AV / tech needs with venue", "Tech Lead", false],
    [10, "Recruit volunteers & publish the staffing schedule", "Volunteer Lead", false],
    [7, "Confirm final headcount with caterer", "Treasurer", false],
    [7, "Send RSVP reminder email", "Marketing", false],
    [3, "Print signage, check-in list and run-of-show", "Events Chair", false],
    [2, "Walk-through of the venue with leads", "Events Chair", false],
    [1, "Pick up supplies; charge mics & devices", "Setup crew", false],
    [0, "Event day: setup, run-of-show, teardown", "All officers", false],
    [-2, "Send thank-you emails to VIPs, speakers & vendors", "President", false],
    [-5, "Submit receipts / reimbursement paperwork to SGS", "Treasurer", true],
    [-7, "Post-event report: attendance, budget vs. actual, lessons learned", "President", false]
  ];
  if (h > 100) items.push([21, "Request campus police / security staffing (often required above ~100 guests)", "Events Chair", true]);
  if (t === "festival") items.push([30, "Get grounds / outdoor-space approval and confirm rain location", "Events Chair", true]);
  if (/alcohol|wine|beer|cocktail/i.test(p.prompt)) items.push([35, "Alcohol at RSO events requires special approval and licensed vendor — check policy", "President", true]);
  if (/raffle|auction/i.test(p.prompt)) items.push([30, "Check raffle / gaming rules before advertising prizes", "Treasurer", true]);
  if (/food|dinner|catered|catering|lunch|snack|pizza|boba|bbq|cookout|meal/i.test(p.prompt) || ["gala", "festival", "competition"].includes(t)) items.push([28, "Confirm food-handling rules (outside food may need an approved caterer)", "Treasurer", true]);
  return items.sort((a, b) => b[0] - a[0]).map(([days, task, owner, verify]) => ({ id: EP.uid(), days, task, owner, verify, done: false }));
};

const PALETTES = {
  gala: [["Midnight", "#1e1b4b"], ["Gold leaf", "#d4a017"], ["Crimson", "#9f1239"], ["Ivory", "#f5efe0"]],
  speaker: [["Navy", "#0d2b5e"], ["Slate", "#475569"], ["Sky", "#38bdf8"], ["Paper", "#f8fafc"]],
  workshop: [["Teal", "#0f766e"], ["Sunshine", "#facc15"], ["Graphite", "#334155"], ["Mint", "#d1fae5"]],
  social: [["Coral", "#f97316"], ["Berry", "#db2777"], ["Lilac", "#a78bfa"], ["Cream", "#fff7ed"]],
  festival: [["Marigold", "#f59e0b"], ["Fuchsia", "#d946ef"], ["Leaf", "#16a34a"], ["Sky", "#0ea5e9"]],
  performance: [["Velvet", "#4c1d95"], ["Spotlight", "#fde68a"], ["Ruby", "#be123c"], ["Black", "#111827"]],
  competition: [["Electric", "#2563eb"], ["Lime", "#84cc16"], ["Ink", "#0f172a"], ["Silver", "#cbd5e1"]],
  fundraiser: [["Heart", "#e11d48"], ["Hope", "#0ea5e9"], ["Warm grey", "#78716c"], ["Linen", "#faf5ee"]]
};

EP.defaultVision = p => {
  const T = EP.TYPES[p.type];
  return {
    theme: p.title,
    tagline: { gala: "An evening to remember", speaker: "Big ideas, up close", workshop: "Learn it by building it", social: "Come for the food, stay for the people", festival: "All of campus, one celebration", performance: "Lights up, stage on", competition: "Build. Compete. Win.", fundraiser: "Small gifts, big impact" }[p.type],
    summary: `${/^[aeiou]/i.test(T.vision[0]) ? "An" : "A"} ${T.vision.join(", ")} ${T.label.toLowerCase()} for about ${p.headcount} guests, hosted by ${p.clubName}. ${T.venue}.`,
    mood: T.vision,
    palette: PALETTES[p.type].map(([name, hex]) => ({ name, hex })),
    journey: [
      ["Arrive", "Clear signage from the nearest entrance leads to a staffed check-in table."],
      ["Welcome", "Guests get a name tag or wristband and a quick orientation of the space."],
      ["Experience", "The main program runs on time with food and activities nearby."],
      ["Connect", "Built-in moments for photos, mingling and meeting the exec board."],
      ["Leave", "A thank-you, a feedback QR code, and a teaser for the next event."]
    ].map(([stage, text]) => ({ stage, text }))
  };
};

EP.defaultEmails = p => {
  const when = EP.fmtDate(p.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) + " at " + EP.clock(p.start, 0);
  const venue = p.venueName || "[Venue — confirm room]";
  const sig = `Warm regards,\n[Your Name]\n[Your Role], ${p.clubName}\n[email] · [phone]`;
  return {
    invitation: {
      label: "Member invitation", audience: "Club members & campus",
      to: "[club listserv]",
      subject: `You're invited: ${p.title} — ${EP.fmtDate(p.date)}`,
      body: `Hi everyone,\n\n${p.clubName} is excited to invite you to ${p.title}! ${p.vision.tagline}.\n\nWhen: ${when}\nWhere: ${venue}\nWhat to expect: ${p.vision.mood.slice(0, 3).join(", ")} vibes, food, and a great community.\n\nPlease RSVP by ${EP.fmtDate(EP.addDays(p.date, -7))} so we can plan food and seating: [RSVP link]\n\nBring a friend — everyone is welcome!\n\n${sig}`
    },
    vip: {
      label: "VIP / leadership invite", audience: "Deans, advisors, administrators",
      to: "{{email}}",
      subject: `Invitation: ${p.title} hosted by ${p.clubName}`,
      body: `Dear {{name}},\n\nOn behalf of ${p.clubName}, I would like to personally invite you, as {{title}}, to ${p.title} on ${when} at ${venue}.\n\nWe are expecting about ${p.headcount} students for ${p.vision.summary.split(". ")[0].replace(/^A /, "a ").toLowerCase()}. Your presence would mean a great deal to our members, and we would be honored to recognize you during the program. Reserved seating will be held for you and a guest.\n\nCould you let us know by ${EP.fmtDate(EP.addDays(p.date, -10))} whether you are able to attend? I am happy to share the full program or answer any questions.\n\nThank you for your continued support of student life.\n\n${sig}`
    },
    sponsor: {
      label: "Sponsorship request", audience: "Departments, local businesses",
      to: "[sponsor contact]",
      subject: `Partnership opportunity: ${p.title} (${p.headcount} attendees)`,
      body: `Hello [Name],\n\nI'm reaching out from ${p.clubName} about ${p.title}, a ${p.typeLabel.toLowerCase()} on ${when} with roughly ${p.headcount} attendees.\n\nWe're seeking a co-sponsor contribution of [amount] toward [food / decor / prizes]. In return we can offer logo placement on our posters and social media, a verbal thank-you during the program, and a table at the event.\n\nWould you be open to a quick call this week?\n\n${sig}`
    },
    vendor: {
      label: "Vendor quote request", audience: "Caterers & rental companies",
      to: "[vendor email]",
      subject: `Quote request — ${p.headcount} guests on ${EP.fmtDate(p.date)}`,
      body: `Hello,\n\n${p.clubName} is planning ${p.title} on ${when} for approximately ${p.headcount} guests at ${venue}.\n\nCould you send a quote for:\n- [Menu / items needed]\n- Delivery, setup & pickup\n- Serving staff (if applicable)\n\nPlease also confirm you are an approved vendor for on-campus student organization events and whether you can invoice the university directly. Our budget for this line is approximately [amount].\n\nThank you!\n\n${sig}`
    },
    reminder: {
      label: "RSVP reminder", audience: "Registered guests",
      to: "[RSVP list]",
      subject: `Reminder: ${p.title} is this ${EP.fmtDate(p.date, { weekday: "long" })}!`,
      body: `Hi there,\n\nJust a reminder that ${p.title} is coming up on ${when} at ${venue}.\n\n- Doors open at ${EP.clock(p.start, 0)}\n- Please bring your student ID for check-in\n- Can't make it anymore? Let us know so we can free up your spot\n\nSee you there!\n\n${sig}`
    },
    thankyou: {
      label: "Thank-you (post-event)", audience: "VIPs, speakers, vendors",
      to: "{{email}}",
      subject: `Thank you for joining ${p.title}`,
      body: `Dear {{name}},\n\nThank you for being part of ${p.title}. With about ${p.headcount} guests, it was one of our most meaningful events this semester, and your support made a real difference.\n\nWe would love to stay in touch and welcome you at future ${p.clubName} events.\n\nWith gratitude,\n${sig}`
    }
  };
};

EP.defaultSocial = p => `${p.vision.tagline.toUpperCase()} ✨\n\n${p.clubName} presents ${p.title}!\n📅 ${EP.fmtDate(p.date, { weekday: "long", month: "long", day: "numeric" })}\n⏰ ${EP.clock(p.start, 0)}\n📍 [Venue]\n\nFood, community and ${p.vision.mood[0]} energy — RSVP at the link in bio! 🔗\n\n#${p.clubName.replace(/[^A-Za-z]/g, "")} #StudentLife #${p.title.replace(/[^A-Za-z]/g, "")}`;

/* ---------------- money math ---------------- */
EP.lineTotal = l => (+l.qty || 0) * (+l.unitCost || 0);
EP.suppliesTotal = p => p.supplies.filter(s => s.buy).reduce((a, s) => a + (+s.qty || 0) * (+s.price || 0), 0);
EP.totals = p => {
  const lines = p.budgetLines.reduce((a, l) => a + EP.lineTotal(l), 0);
  const supplies = EP.suppliesTotal(p);
  const subtotal = lines + supplies;
  const contingency = subtotal * (+p.contingencyPct || 0) / 100;
  const grand = subtotal + contingency;
  const funded = (p.funding || []).reduce((a, f) => a + (+f.amount || 0), 0);
  const byCat = {};
  p.budgetLines.forEach(l => byCat[l.category] = (byCat[l.category] || 0) + EP.lineTotal(l));
  byCat["Supplies"] = (byCat["Supplies"] || 0) + supplies;
  byCat["Contingency"] = contingency;
  return { lines, supplies, subtotal, contingency, grand, funded, gap: funded - grand, perHead: grand / Math.max(1, p.headcount), byCat };
};

/* Scale variable costs so the plan fits the target budget. */
EP.fitToBudget = p => {
  const t = EP.totals(p);
  const target = +p.targetBudget; if (!target) return false;
  const fixedish = l => l.category === "Venue" || l.category === "Staffing & Security";
  const flex = p.budgetLines.filter(l => !fixedish(l)).reduce((a, l) => a + EP.lineTotal(l), 0) + t.supplies;
  const fixed = t.subtotal - flex;
  const allowedSub = target / (1 + p.contingencyPct / 100);
  const ratio = Math.max(0.2, Math.min(3, (allowedSub - fixed) / Math.max(1, flex)));
  p.budgetLines.forEach(l => { if (!fixedish(l)) l.unitCost = Math.round(l.unitCost * ratio * 100) / 100; });
  p.supplies.forEach(s => s.price = Math.round(s.price * ratio * 100) / 100);
  return ratio;
};

/* ---------------- floor plan / event map (SVG) ---------------- */
EP.renderMap = p => {
  const W = 820, H = 540, pad = 30, h = p.headcount;
  const room = { x: pad, y: pad, w: W - pad * 2, h: H - pad * 2 - 20 };
  const out = [], zones = [];
  const Z = (label, color) => { const z = zones.find(z => z.label === label); if (!z) zones.push({ label, color }); return color; };
  const rect = (x, y, w, hh, label, color, rx = 8, txt = true) => {
    out.push(`<g class="zone"><title>${EP.esc(label)}</title><rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="${rx}" fill="${Z(label, color)}" fill-opacity=".85" stroke="#fff" stroke-width="2"/>${txt ? `<text x="${x + w / 2}" y="${y + hh / 2 + 4}" text-anchor="middle" font-size="${Math.min(13, Math.max(9, w / 10))}" font-weight="600" fill="#fff">${EP.esc(label)}</text>` : ""}</g>`);
  };
  const outdoor = p.layout === "festival";
  out.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="${outdoor ? "#ecf7e6" : "#fbfaf7"}"/>`);
  if (outdoor) {
    out.push(`<path d="M ${W / 2 - 40} ${H} L ${W / 2 - 40} ${H / 2 + 20} Q ${W / 2} ${H / 2 - 10} ${W / 2 + 40} ${H / 2 + 20} L ${W / 2 + 40} ${H}" fill="#e7dcc4"/>`);
    out.push(`<rect x="${room.x}" y="${room.y}" width="${room.w}" height="${room.h}" rx="40" fill="none" stroke="#86b97a" stroke-width="3" stroke-dasharray="10 8"/>`);
    out.push(`<text x="${W - pad - 10}" y="${pad + 22}" text-anchor="end" font-size="12" fill="#4d7c3f" font-weight="600">THE QUAD (outdoor)</text>`);
  } else {
    out.push(`<rect x="${room.x}" y="${room.y}" width="${room.w}" height="${room.h}" rx="6" fill="#fff" stroke="#13203a" stroke-width="4"/>`);
    // entrance gap
    out.push(`<rect x="${W / 2 - 50}" y="${room.y + room.h - 3}" width="100" height="8" fill="#fbfaf7"/>`);
    out.push(`<rect x="${room.x - 3}" y="${room.y + 60}" width="8" height="50" fill="#fbfaf7"/><text x="${room.x + 10}" y="${room.y + 90}" font-size="9" fill="#b91c1c" font-weight="700">EXIT</text>`);
    out.push(`<rect x="${room.x + room.w - 5}" y="${room.y + 60}" width="8" height="50" fill="#fbfaf7"/><text x="${room.x + room.w - 12}" y="${room.y + 90}" text-anchor="end" font-size="9" fill="#b91c1c" font-weight="700">EXIT</text>`);
  }
  out.push(`<text x="${W / 2}" y="${H - 8}" text-anchor="middle" font-size="12" font-weight="700" fill="#13203a">▲ MAIN ENTRANCE</text>`);

  const inner = { x: room.x + 20, y: room.y + 20, w: room.w - 40, h: room.h - 40 };
  const C = { stage: "#7c3aed", seat: "#2563eb", vip: "#d4a017", food: "#ea580c", drink: "#0891b2", reg: "#059669", photo: "#db2777", av: "#475569", act: "#65a30d", green: "#0f766e", aid: "#dc2626" };
  const regY = inner.y + inner.h - 50;

  if (p.layout === "banquet") {
    rect(inner.x + inner.w / 2 - 150, inner.y, 300, 56, "Stage & podium", C.stage);
    rect(inner.x + inner.w / 2 - 110, inner.y + 62, 220, 46, "Dance floor / performance", "#a78bfa");
    rect(inner.x, inner.y + 70, 70, 230, "Buffet line", C.food, 8, false);
    out.push(`<text transform="translate(${inner.x + 39},${inner.y + 185}) rotate(-90)" text-anchor="middle" font-size="12" font-weight="600" fill="#fff">BUFFET LINE</text>`);
    rect(inner.x + inner.w - 70, inner.y + 70, 70, 120, "Drinks", C.drink);
    rect(inner.x + inner.w - 70, inner.y + 200, 70, 100, "Dessert", "#f97316");
    rect(inner.x, regY, 150, 46, "Registration", C.reg);
    rect(inner.x + inner.w - 130, regY, 130, 46, "Photo booth", C.photo);
    rect(inner.x + inner.w / 2 + 70, regY + 6, 90, 36, "AV booth", C.av);
    const tables = Math.ceil(h / 8);
    const area = { x: inner.x + 90, y: inner.y + 120, w: inner.w - 180, h: regY - inner.y - 135 };
    const cols = Math.max(3, Math.round(Math.sqrt(tables * area.w / area.h)));
    const rows = Math.ceil(tables / cols);
    const cw = area.w / cols, rh = area.h / rows, r = Math.max(6, Math.min(22, Math.min(cw, rh) / 2 - 4));
    let n = 0;
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols && n < tables; j++, n++) {
      const vip = i === 0 && (j === Math.floor(cols / 2) || j === Math.floor(cols / 2) - 1);
      const cx = area.x + cw * j + cw / 2, cy = area.y + rh * i + rh / 2;
      out.push(`<g class="zone"><title>${vip ? "VIP table" : "Guest table"} ${n + 1} (8 seats)</title><circle cx="${cx}" cy="${cy}" r="${r}" fill="${Z(vip ? "VIP tables" : "Round tables (8 seats)", vip ? C.vip : C.seat)}" fill-opacity=".85" stroke="#fff" stroke-width="2"/>${r > 12 ? `<text x="${cx}" y="${cy + 4}" font-size="10" text-anchor="middle" fill="#fff" font-weight="700">${n + 1}</text>` : ""}</g>`);
    }
  } else if (p.layout === "theater") {
    rect(inner.x + inner.w / 2 - 190, inner.y, 380, 60, p.type === "performance" ? "Stage" : "Stage — panel & podium", C.stage);
    rect(inner.x, inner.y, 90, 70, p.type === "performance" ? "Backstage" : "Green room", C.green);
    rect(inner.x + inner.w - 90, inner.y, 90, 70, "AV / lighting", C.av);
    const seatsPerRow = Math.min(36, Math.max(10, Math.ceil(Math.sqrt(h * 2.4))));
    const rowsN = Math.ceil(h / seatsPerRow);
    const area = { x: inner.x + 40, y: inner.y + 90, w: inner.w - 80, h: regY - inner.y - 110 };
    const rh = Math.min(16, area.h / rowsN), sw = (area.w - 40) / seatsPerRow;
    for (let i = 0; i < rowsN; i++) for (let j = 0; j < seatsPerRow; j++) {
      if (i * seatsPerRow + j >= h) break;
      const vip = i === 0;
      const x = area.x + j * sw + (j >= seatsPerRow / 2 ? 40 : 0);
      out.push(`<rect x="${x}" y="${area.y + i * rh}" width="${Math.max(2, sw - 2)}" height="${Math.max(3, rh - 3)}" rx="2" fill="${Z(vip ? "Reserved VIP row" : "Audience seating", vip ? C.vip : C.seat)}" fill-opacity=".8"/>`);
    }
    out.push(`<text x="${inner.x + inner.w / 2}" y="${area.y + Math.min(area.h, rowsN * rh) + 14}" text-anchor="middle" font-size="10" fill="#7a8494">center aisle · ${rowsN} rows × ${seatsPerRow} seats</text>`);
    rect(inner.x, regY, 150, 46, "Registration", C.reg);
    rect(inner.x + inner.w - 170, regY, 170, 46, p.type === "performance" ? "Lobby reception" : "Refreshments", C.food);
  } else if (p.layout === "classroom") {
    rect(inner.x + inner.w / 2 - 130, inner.y, 260, 50, p.type === "competition" ? "Main stage & judges" : "Instructor & screen", C.stage);
    const breakout = p.type === "competition";
    const areaW = breakout ? inner.w - 160 : inner.w - 110;
    const tables = Math.ceil(h / 6);
    const cols = Math.max(2, Math.round(Math.sqrt(tables * 1.8)));
    const rows = Math.ceil(tables / cols);
    const area = { x: inner.x + 10, y: inner.y + 70, w: areaW - 20, h: regY - inner.y - 85 };
    const cw = area.w / cols, rh = area.h / rows; let n = 0;
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols && n < tables; j++, n++) {
      out.push(`<rect x="${area.x + cw * j + 4}" y="${area.y + rh * i + 4}" width="${cw - 8}" height="${Math.max(6, rh - 10)}" rx="4" fill="${Z(breakout ? "Team tables (6 seats)" : "Work tables (6 seats)", C.seat)}" fill-opacity=".8"><title>Table ${n + 1}</title></rect>`);
    }
    if (breakout) {
      rect(inner.x + inner.w - 140, inner.y, 140, 90, "Breakout room A", C.green);
      rect(inner.x + inner.w - 140, inner.y + 100, 140, 90, "Breakout room B", C.green);
      rect(inner.x + inner.w - 140, inner.y + 200, 140, 90, "Food & coffee", C.food);
      rect(inner.x + inner.w - 140, inner.y + 300, 140, regY - inner.y - 310, "Mentor / help desk", C.act);
    } else {
      rect(inner.x + inner.w - 90, inner.y + 70, 90, 140, "Snacks", C.food);
      rect(inner.x + inner.w - 90, inner.y + 220, 90, 110, "Supply table", C.act);
    }
    rect(inner.x, regY, 160, 46, "Check-in & kits", C.reg);
    rect(inner.x + inner.w - 120, regY, 120, 46, "AV / power", C.av);
  } else if (p.layout === "mixer") {
    rect(inner.x + inner.w / 2 - 90, inner.y, 180, 46, "DJ / welcome mic", C.stage);
    rect(inner.x, inner.y, 90, 200, "Food station", C.food);
    rect(inner.x + inner.w - 90, inner.y, 90, 130, "Drinks", C.drink);
    rect(inner.x + inner.w - 160, inner.y + 150, 160, 130, p.type === "fundraiser" ? "Auction / raffle display" : "Games & activity corner", C.act);
    rect(inner.x, inner.y + 220, 120, 100, "Lounge seating", "#a16207");
    rect(inner.x, regY, 150, 46, p.type === "fundraiser" ? "Check-in & donations" : "Welcome & name tags", C.reg);
    rect(inner.x + inner.w - 130, regY, 130, 46, "Photo wall", C.photo);
    const n = Math.min(30, Math.ceil(h / 6));
    const area = { x: inner.x + 140, y: inner.y + 70, w: inner.w - 330, h: regY - inner.y - 90 };
    const cols = Math.ceil(Math.sqrt(n * area.w / area.h)), rows = Math.ceil(n / cols);
    let k = 0;
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols && k < n; j++, k++) {
      const cx = area.x + area.w / cols * (j + .5) + (i % 2 ? 12 : -12), cy = area.y + area.h / rows * (i + .5);
      out.push(`<circle cx="${cx}" cy="${cy}" r="11" fill="${Z("Cocktail / high-top tables", C.seat)}" fill-opacity=".8" stroke="#fff" stroke-width="2"><title>High-top ${k + 1}</title></circle>`);
    }
  } else { // festival
    rect(inner.x + inner.w / 2 - 140, inner.y, 280, 60, "Main stage / DJ", C.stage);
    const booths = Math.min(16, Math.max(6, Math.ceil(h / 30)));
    const per = Math.ceil(booths / 2);
    for (let i = 0; i < per; i++) {
      const y = inner.y + 80 + i * ((regY - inner.y - 100) / per);
      const hh = (regY - inner.y - 100) / per - 8;
      rect(inner.x, y, 110, hh, i < 2 ? "Food booth" : "Activity booth", i < 2 ? C.food : C.act, 6, false);
      rect(inner.x + inner.w - 110, y, 110, hh, i < 2 ? "Food truck" : "Partner / club booth", i < 2 ? "#c2410c" : C.green, 6, false);
    }
    rect(inner.x + inner.w / 2 - 170, inner.y + 80, 340, regY - inner.y - 170, "Open lawn / activity area", "#86efac");
    rect(inner.x + 130, regY - 70, 90, 40, "Water", C.drink);
    rect(inner.x + inner.w - 220, regY - 70, 90, 40, "First aid", C.aid);
    rect(inner.x + inner.w / 2 - 60, regY - 70, 120, 40, "Waste & recycling", "#57534e");
    rect(inner.x, regY, 150, 46, "Welcome tent", C.reg);
    rect(inner.x + inner.w - 130, regY, 130, 46, "Photo spot", C.photo);
  }
  const svg = `<svg class="map-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="Inter, sans-serif" role="img" aria-label="Floor plan for ${EP.esc(p.title)}">${out.join("")}</svg>`;
  return { svg, zones };
};

/* ---------------- LLM enrichment (Ollama) ---------------- */
const PLAN_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" }, theme: { type: "string" }, tagline: { type: "string" }, vision: { type: "string" },
    mood: { type: "array", items: { type: "string" } },
    palette: { type: "array", items: { type: "object", properties: { name: { type: "string" }, hex: { type: "string" } }, required: ["name", "hex"] } },
    journey: { type: "array", items: { type: "object", properties: { stage: { type: "string" }, text: { type: "string" } }, required: ["stage", "text"] } },
    schedule: { type: "array", items: { type: "object", properties: { minutesFromStart: { type: "integer" }, activity: { type: "string" }, owner: { type: "string" } }, required: ["minutesFromStart", "activity", "owner"] } },
    extraBudgetItems: { type: "array", items: { type: "object", properties: { category: { type: "string", enum: CATEGORIES }, item: { type: "string" }, qty: { type: "number" }, unitCost: { type: "number" }, notes: { type: "string" } }, required: ["category", "item", "qty", "unitCost"] } },
    extraSupplies: { type: "array", items: { type: "object", properties: { item: { type: "string" }, qty: { type: "number" }, price: { type: "number" }, category: { type: "string" } }, required: ["item", "qty", "price"] } },
    extraChecklist: { type: "array", items: { type: "object", properties: { task: { type: "string" }, daysBefore: { type: "integer" }, owner: { type: "string" } }, required: ["task", "daysBefore", "owner"] } },
    socialPost: { type: "string" }
  },
  required: ["title", "tagline", "vision", "palette", "journey", "schedule", "extraBudgetItems", "extraSupplies", "extraChecklist", "socialPost"]
};

const SYSTEM = `You are EventPlanner AI, an assistant that helps university student-organization officers (presidents, events chairs, treasurers) plan on-campus events.
Be concrete, realistic and budget-conscious; use typical US college prices in USD. Never invent specific university policies, deadlines, or vendor names — say "confirm with SGS/CSLE" instead. Respond ONLY with JSON matching the schema.`;

EP.aiEnrich = async (plan, { onToken, signal } = {}) => {
  const user = `Event request: """${plan.prompt}"""
Host club: ${plan.clubName}
Event type: ${plan.typeLabel}
Date: ${plan.date}, start ${plan.start}, about ${plan.hours} hours
Headcount: ${plan.headcount}
Target budget: $${plan.targetBudget}
Already in the budget (do NOT repeat): ${plan.budgetLines.map(l => l.item).join("; ")}
Already on the supply list (do NOT repeat): ${plan.supplies.map(s => s.item).join("; ")}

Return:
- title: a catchy event name (max 6 words)
- tagline: max 8 words
- vision: 2-3 sentences describing the look, feel and attendee experience
- mood: 4 single adjectives
- palette: 4 colors {name, hex} matching the theme
- journey: 5 steps of the attendee experience {stage, text}
- schedule: 8-10 run-of-show items, minutesFromStart (negative = setup before doors) with owner role
- extraBudgetItems: 2-4 costs specific to THIS event's description not already listed
- extraSupplies: 3-6 specific items to buy online not already listed (qty and unit price)
- extraChecklist: 3-5 tasks specific to this event with daysBefore
- socialPost: an Instagram caption with emojis and hashtags`;
  const txt = await EP.ai.chat([{ role: "system", content: SYSTEM }, { role: "user", content: user }], { schema: PLAN_SCHEMA, onToken, signal, temperature: 0.5 });
  const j = EP.parseJSON(txt);
  if (!j) throw new Error("The model did not return valid JSON");
  return EP.mergeAI(plan, j);
};

const str = (v, max = 400) => typeof v === "string" ? v.trim().slice(0, max) : "";
const numOr = (v, d) => (typeof v === "number" && isFinite(v) && v >= 0 ? v : d);

EP.mergeAI = (plan, j) => {
  if (str(j.title, 80)) plan.title = str(j.title, 80);
  const v = plan.vision;
  if (str(j.theme, 120)) v.theme = str(j.theme, 120); else v.theme = plan.title;
  if (str(j.tagline, 100)) v.tagline = str(j.tagline, 100);
  if (str(j.vision, 800)) v.summary = str(j.vision, 800);
  if (Array.isArray(j.mood) && j.mood.length) v.mood = j.mood.map(m => str(m, 30)).filter(Boolean).slice(0, 5);
  if (Array.isArray(j.palette)) {
    const pal = j.palette.filter(c => /^#[0-9a-f]{6}$/i.test(c.hex || "")).map(c => ({ name: str(c.name, 20) || c.hex, hex: c.hex })).slice(0, 5);
    if (pal.length >= 3) v.palette = pal;
  }
  if (Array.isArray(j.journey)) {
    const jr = j.journey.filter(s => str(s.stage) && str(s.text)).map(s => ({ stage: str(s.stage, 24), text: str(s.text, 200) })).slice(0, 6);
    if (jr.length >= 3) v.journey = jr;
  }
  if (Array.isArray(j.schedule)) {
    const sc = j.schedule.filter(s => str(s.activity) && Number.isFinite(s.minutesFromStart) && Math.abs(s.minutesFromStart) < 60 * 30)
      .map(s => ({ id: EP.uid(), offset: s.minutesFromStart, activity: str(s.activity, 140), owner: str(s.owner, 40) || "Events Chair", notes: "AI" }))
      .sort((a, b) => a.offset - b.offset);
    if (sc.length >= 5) plan.schedule = sc;
  }
  (j.extraBudgetItems || []).slice(0, 5).forEach(b => {
    if (!str(b.item) || !CATEGORIES.includes(b.category)) return;
    const unitCost = numOr(b.unitCost, 0), qty = numOr(b.qty, 1);
    if (unitCost * qty > Math.max(150, plan.targetBudget * 0.25)) return; // reject wild / duplicate big-ticket numbers
    if (plan.budgetLines.some(l => l.item.toLowerCase() === str(b.item).toLowerCase())) return;
    plan.budgetLines.push({ id: EP.uid(), category: b.category, item: str(b.item, 100), qty, unit: "", unitCost, notes: str(b.notes, 140) || "Suggested by AI — get a real quote", ai: true });
  });
  (j.extraSupplies || []).slice(0, 8).forEach(s => {
    if (!str(s.item)) return;
    const price = numOr(s.price, 0); if (price > 1000) return;
    if (numOr(s.qty, 1) * price > Math.max(100, plan.targetBudget * 0.15)) return;
    plan.supplies.push({ id: EP.uid(), item: str(s.item, 90), qty: Math.max(1, Math.round(numOr(s.qty, 1))), price, category: str(s.category, 30) || "Event-specific", buy: true, ai: true });
  });
  (j.extraChecklist || []).slice(0, 6).forEach(c => {
    if (!str(c.task) || !Number.isFinite(c.daysBefore)) return;
    plan.checklist.push({ id: EP.uid(), days: Math.max(-14, Math.min(120, c.daysBefore)), task: str(c.task, 160), owner: str(c.owner, 40) || "Events Chair", verify: false, done: false, ai: true });
  });
  plan.checklist.sort((a, b) => b.days - a.days);
  if (str(j.socialPost, 1200)) plan.social = str(j.socialPost, 1200);
  plan.aiUsed = true;
  return plan;
};

/* Ask the LLM to (re)write one email. Streams into onToken; returns {subject, body}. */
EP.aiEmail = async (plan, key, { tone = "warm and professional", instructions = "", onToken, signal } = {}) => {
  const e = plan.emails[key];
  const facts = `Event: ${plan.title} (${plan.typeLabel})
Host: ${plan.clubName}
Date/time: ${EP.fmtDate(plan.date, { weekday: "long", month: "long", day: "numeric" })} at ${EP.clock(plan.start, 0)}
Venue: ${plan.venueName || "[Venue]"}
Expected guests: ${plan.headcount}
Vision: ${plan.vision.summary}
Tagline: ${plan.vision.tagline}`;
  const personal = e.to === "{{email}}" ? "Address the recipient as {{name}} and mention their role {{title}} — keep these placeholders exactly as written so they can be mail-merged." : "";
  const prompt = `Write the "${e.label}" email for this event, aimed at: ${e.audience}.
${facts}
Tone: ${tone}. ${personal}
${instructions ? "Extra instructions from the planner: " + instructions : ""}
Keep it under 220 words. Use [brackets] for any detail you don't know (like links or names). Sign off as [Your Name], [Your Role], ${plan.clubName}.
Format exactly:
Subject: <subject line>

<email body>`;
  const txt = await EP.ai.chat([{ role: "system", content: "You write clear, friendly emails for university student organizations. Output only the email in the requested format." }, { role: "user", content: prompt }], { onToken, signal, temperature: 0.7 });
  const m = txt.match(/subject:\s*(.+)\n([\s\S]*)/i);
  return m ? { subject: m[1].trim().replace(/^\*+|\*+$/g, ""), body: m[2].trim() } : { subject: e.subject, body: txt.trim() };
};
