/* ============================================================
   EventPlanner AI — static data: sample clubs + event templates
   Everything here is SAMPLE data for the demo. Replace the club
   records with your own organizations' real details.
   ============================================================ */

window.EP = window.EP || {};

EP.CLUBS = [
  {
    id: "asa", name: "Asian Student Association", short: "ASA", category: "Cultural",
    color: "#c2410c",
    mission: "Celebrating pan-Asian cultures through food, performance, and community — and giving every member a seat at the table.",
    members: 240, founded: 1994, meets: "Thursdays 7pm · Student Center 201",
    allocation: 9000, spent: 5120,
    officers: [["President", "Open seat"], ["Events Chair", "Open seat"], ["Treasurer", "Open seat"], ["Outreach Chair", "Open seat"]],
    vips: [["Dean of Campus Life", "Office of Campus Life"], ["Faculty Advisor", "Dept. of East Asian Studies"], ["Director, CSLE", "Center for Student Leadership & Engagement"]],
    events: [
      { name: "Lunar New Year Gala", month: "Feb", headcount: 300, budget: 6000, prompt: "Lunar New Year gala dinner for 300 students with lion dance performance, red and gold decor, catered dinner, and a photo booth" },
      { name: "Boba & Board Games", month: "Sep", headcount: 80, budget: 600, prompt: "Casual boba and board game night for 80 new members to meet the exec board" },
      { name: "Mid-Autumn Festival", month: "Oct", headcount: 150, budget: 1800, prompt: "Mid-Autumn festival on the quad with mooncake tasting, lantern making, and a live music set for 150 people" }
    ]
  },
  {
    id: "bsa", name: "Black Student Alliance", short: "BSA", category: "Cultural",
    color: "#7c3aed",
    mission: "Building community, advocacy, and celebration for Black students through programming, mentorship, and service.",
    members: 310, founded: 1968, meets: "Mondays 8pm · Multicultural Center",
    allocation: 11000, spent: 4300,
    officers: [["President", "Open seat"], ["VP Programming", "Open seat"], ["Treasurer", "Open seat"], ["Community Liaison", "Open seat"]],
    vips: [["Vice Provost for Diversity", "Office of the Provost"], ["Alumni Board Chair", "Alumni Association"], ["Director, CSLE", "Center for Student Leadership & Engagement"]],
    events: [
      { name: "Black History Month Showcase", month: "Feb", headcount: 400, budget: 7500, prompt: "Black History Month talent showcase for 400 guests with keynote alumni speaker, soul food catering, and live DJ" },
      { name: "Homecoming Cookout", month: "Oct", headcount: 250, budget: 2500, prompt: "Homecoming cookout on the green for 250 students and alumni with BBQ catering, games, and music" },
      { name: "Mentorship Mixer", month: "Nov", headcount: 70, budget: 700, prompt: "Professional mentorship mixer pairing 40 students with 30 alumni mentors, light refreshments" }
    ]
  },
  {
    id: "lsa", name: "Latinx Student Association", short: "LSA", category: "Cultural",
    color: "#059669",
    mission: "A home for Latinx students to celebrate heritage, build leadership, and connect with the wider Atlanta community.",
    members: 190, founded: 1989, meets: "Wednesdays 7:30pm · Student Center 310",
    allocation: 7500, spent: 2950,
    officers: [["President", "Open seat"], ["Events Chair", "Open seat"], ["Treasurer", "Open seat"], ["Social Media", "Open seat"]],
    vips: [["Dean of Students", "Office of the Dean"], ["Faculty Advisor", "Dept. of Spanish & Portuguese"], ["Consulate Cultural Attaché", "Community Partner"]],
    events: [
      { name: "Noche Latina", month: "Oct", headcount: 220, budget: 4200, prompt: "Noche Latina cultural night for 220 guests with salsa lessons, live band, and Latin American catering" },
      { name: "Taco Tuesday Social", month: "Sep", headcount: 100, budget: 800, prompt: "Taco Tuesday welcome social for 100 students with a taco bar and lawn games" }
    ]
  },
  {
    id: "sasa", name: "South Asian Student Association", short: "SASA", category: "Cultural",
    color: "#db2777",
    mission: "Sharing the art, music, food, and stories of South Asia with the whole campus.",
    members: 280, founded: 1991, meets: "Tuesdays 8pm · Student Center Ballroom B",
    allocation: 12000, spent: 8400,
    officers: [["President", "Open seat"], ["Cultural Chair", "Open seat"], ["Treasurer", "Open seat"], ["Marketing Chair", "Open seat"]],
    vips: [["University President's Office", "Office of the President"], ["Faculty Advisor", "Dept. of Religion"], ["Director, CSLE", "Center for Student Leadership & Engagement"]],
    events: [
      { name: "Diwali Night", month: "Nov", headcount: 450, budget: 9000, prompt: "Diwali night celebration for 450 guests with dance performances, diya lighting, Indian buffet dinner, and henna stations" },
      { name: "Holi on the Quad", month: "Mar", headcount: 500, budget: 3500, prompt: "Holi color festival on the quad for 500 students with color powder, DJ, water stations, and street food" }
    ]
  },
  {
    id: "invest", name: "Investment & Finance Club", short: "IFC", category: "Professional",
    color: "#0f766e",
    mission: "Hands-on markets education: stock pitches, a student-managed portfolio, and recruiting prep.",
    members: 160, founded: 2003, meets: "Mondays 6pm · Business School 130",
    allocation: 5000, spent: 2100,
    officers: [["President", "Open seat"], ["Director of Education", "Open seat"], ["Treasurer", "Open seat"], ["Corporate Relations", "Open seat"]],
    vips: [["Dean, Business School", "Business School"], ["Alumni Partner", "Sponsor Firm"], ["Career Center Director", "Career Center"]],
    events: [
      { name: "Wall Street Speaker Panel", month: "Oct", headcount: 120, budget: 1500, prompt: "Finance speaker panel with 3 alumni from investment banks for 120 students, followed by networking reception" },
      { name: "Stock Pitch Competition", month: "Mar", headcount: 90, budget: 2200, prompt: "Stock pitch competition with 12 teams, 3 judges, prizes, and pizza for 90 attendees" }
    ]
  },
  {
    id: "robotics", name: "Robotics & Engineering Club", short: "REC", category: "STEM",
    color: "#2563eb",
    mission: "Building robots, hosting hackathons, and teaching anyone curious how to make hardware move.",
    members: 95, founded: 2011, meets: "Fridays 4pm · Science Commons Makerspace",
    allocation: 6500, spent: 3900,
    officers: [["President", "Open seat"], ["Build Lead", "Open seat"], ["Treasurer", "Open seat"], ["Outreach Lead", "Open seat"]],
    vips: [["Chair, Computer Science", "Dept. of Computer Science"], ["Makerspace Director", "Library Services"], ["Industry Sponsor", "Sponsor Company"]],
    events: [
      { name: "24-Hour Hackathon", month: "Feb", headcount: 150, budget: 5000, prompt: "24-hour hardware hackathon for 150 students with sponsor judges, 3 meals plus midnight snacks, prizes, and swag" },
      { name: "Intro to Arduino Workshop", month: "Sep", headcount: 40, budget: 900, prompt: "Intro to Arduino hands-on workshop for 40 beginners with starter kits and snacks" }
    ]
  },
  {
    id: "dance", name: "Dance Collective", short: "DC", category: "Performing Arts",
    color: "#e11d48",
    mission: "Student choreographers and dancers of every style sharing the stage twice a year.",
    members: 75, founded: 2006, meets: "Sun & Wed 8pm · Dance Studio 2",
    allocation: 8000, spent: 6200,
    officers: [["Artistic Director", "Open seat"], ["Production Manager", "Open seat"], ["Treasurer", "Open seat"], ["Publicity", "Open seat"]],
    vips: [["Chair, Theater & Dance", "Dept. of Theater & Dance"], ["Arts Center Director", "Performing Arts Center"], ["Faculty Advisor", "Dept. of Theater & Dance"]],
    events: [
      { name: "Spring Showcase", month: "Apr", headcount: 350, budget: 5500, prompt: "Spring dance showcase in the performing arts center for 350 audience members with lighting design, ticketing, and a reception" }
    ]
  },
  {
    id: "green", name: "Sustainability Coalition", short: "SC", category: "Service",
    color: "#65a30d",
    mission: "Making campus greener through zero-waste events, gardens, and climate education.",
    members: 120, founded: 2008, meets: "Tuesdays 6pm · Environmental Sciences 105",
    allocation: 4000, spent: 1250,
    officers: [["President", "Open seat"], ["Events Chair", "Open seat"], ["Treasurer", "Open seat"], ["Garden Lead", "Open seat"]],
    vips: [["Director, Office of Sustainability", "Office of Sustainability"], ["Facilities Manager", "Campus Services"], ["Faculty Advisor", "Dept. of Environmental Sciences"]],
    events: [
      { name: "Earth Day Fair", month: "Apr", headcount: 300, budget: 2500, prompt: "Zero-waste Earth Day fair on the quad with 15 partner booths, plant giveaway, and local food trucks for 300 people" }
    ]
  },
  {
    id: "premed", name: "Pre-Health Society", short: "PHS", category: "Professional",
    color: "#0891b2",
    mission: "Supporting future doctors, nurses, and public-health leaders with mentorship, MCAT prep, and service.",
    members: 260, founded: 1999, meets: "Thursdays 6pm · Chemistry Building 240",
    allocation: 5500, spent: 1800,
    officers: [["President", "Open seat"], ["Programming Chair", "Open seat"], ["Treasurer", "Open seat"], ["Service Chair", "Open seat"]],
    vips: [["Dean of Admissions, School of Medicine", "School of Medicine"], ["Pre-Health Advisor", "Pre-Health Advising"], ["Hospital Volunteer Coordinator", "Community Partner"]],
    events: [
      { name: "Med School Admissions Panel", month: "Nov", headcount: 180, budget: 1200, prompt: "Medical school admissions panel for 180 students with 4 admissions officers, Q&A, and light refreshments" }
    ]
  },
  {
    id: "debate", name: "Debate & Model UN", short: "MUN", category: "Academic",
    color: "#9333ea",
    mission: "Competitive debate and diplomacy simulation — and hosting the region's high-school MUN conference.",
    members: 85, founded: 1979, meets: "Mon & Thu 7pm · Humanities 101",
    allocation: 9500, spent: 3300,
    officers: [["Secretary-General", "Open seat"], ["Director of Logistics", "Open seat"], ["Treasurer", "Open seat"], ["Director of Outreach", "Open seat"]],
    vips: [["Chair, Political Science", "Dept. of Political Science"], ["Admissions Outreach Director", "Office of Admission"], ["Director, CSLE", "Center for Student Leadership & Engagement"]],
    events: [
      { name: "High School MUN Conference", month: "Jan", headcount: 400, budget: 8000, prompt: "Two-day high school Model UN conference for 400 delegates across 12 committee rooms with opening ceremony, lunches, and awards" }
    ]
  }
];

/* ---------- Event-type templates used by the instant planner ---------- */
/* qty can be a number or a function of headcount (h). */
EP.TYPES = {
  gala: {
    label: "Gala / Cultural Night", layout: "banquet", hours: 4,
    keywords: ["gala", "night", "banquet", "formal", "culture", "cultural", "celebration", "new year", "diwali", "showcase", "dinner", "noche", "awards"],
    venue: "Ballroom or multipurpose hall with stage and catering kitchen access",
    budget: [
      ["Venue", "Ballroom / hall reservation + setup fee", 1, "flat", 350, "Many on-campus spaces are free for RSOs; setup/cleaning fees still apply"],
      ["Food & Beverage", "Catered dinner (approved vendor)", h => h, "per guest", 15, "Get 2 quotes; confirm vendor is on the approved list"],
      ["Food & Beverage", "Beverages & water service", h => h, "per guest", 1.5, ""],
      ["Food & Beverage", "Dessert", h => h, "per guest", 2, ""],
      ["Decor", "Centerpieces & table linens", h => Math.ceil(h / 8), "per table", 18, "8 guests per round table"],
      ["Decor", "Stage backdrop & lighting accents", 1, "flat", 250, ""],
      ["AV & Tech", "Sound system, mics & tech staff", 1, "flat", 400, "Book through venue AV services"],
      ["Entertainment", "Performers / DJ honorarium", 1, "flat", 500, "Contract + W-9 usually required"],
      ["Marketing", "Posters, flyers & social ads", 1, "flat", 120, ""],
      ["Staffing & Security", "Event security officers", h => Math.max(1, Math.ceil(h / 150)), "officer (4 hrs)", 160, "Often required above ~100 guests"],
      ["Supplies", "Photo booth props & signage", 1, "flat", 90, ""]
    ],
    schedule: [[-150, "Load-in, decor & table setup", "Events Chair"], [-60, "AV & sound check, performer run-through", "Tech Lead"], [-30, "Registration table opens, volunteers briefed", "Volunteer Lead"], [0, "Doors open — welcome & photo booth", "Hospitality"], [20, "Opening remarks & land acknowledgment", "President"], [35, "Dinner service", "Catering"], [90, "Performances block", "Emcee"], [150, "VIP remarks & recognition", "President"], [170, "Raffle / closing & group photo", "Emcee"], [190, "Guests depart, teardown begins", "All officers"]],
    supplies: [["Table linens (round, 120\")", t => Math.ceil(t / 8), 12, "Decor"], ["LED tea light candles (24 pk)", t => Math.ceil(t / 60), 14, "Decor"], ["Photo booth backdrop stand", 1, 45, "Decor"], ["Name badges / lanyards (100 pk)", t => Math.ceil(t / 100), 16, "Registration"], ["Disposable plates & cutlery set (100 pk)", t => Math.ceil(t / 100), 32, "Food Service"], ["Extension cords & power strips", 3, 15, "AV"], ["Gaffer tape", 2, 12, "AV"], ["Trash & recycling bags (50 pk)", 2, 14, "Cleanup"]],
    vision: ["elegant", "celebratory", "warm lighting", "stage-centered"]
  },
  speaker: {
    label: "Speaker / Panel", layout: "theater", hours: 2,
    keywords: ["speaker", "panel", "talk", "lecture", "keynote", "fireside", "q&a", "admissions", "alumni panel", "discussion"],
    venue: "Auditorium or lecture hall with podium, projector and 2+ handheld mics",
    budget: [
      ["Venue", "Auditorium / lecture hall reservation", 1, "flat", 0, "Usually free for RSOs — confirm with room reservations"],
      ["Speakers", "Speaker honorarium / thank-you gift", 3, "speaker", 75, "Honoraria may need a contract + W-9"],
      ["Speakers", "Speaker travel & parking", 1, "flat", 60, ""],
      ["Food & Beverage", "Light refreshments / reception", h => h, "per guest", 6, ""],
      ["Food & Beverage", "Speaker green-room snacks", 1, "flat", 40, ""],
      ["AV & Tech", "Mics, projector & recording", 1, "flat", 150, ""],
      ["Marketing", "Flyers & social ads", 1, "flat", 60, ""],
      ["Supplies", "Name tents, signage, pens", 1, "flat", 40, ""]
    ],
    schedule: [[-60, "Room setup, test slides & mics", "Tech Lead"], [-30, "Speakers arrive — green room", "Hospitality"], [0, "Doors open, check-in", "Volunteer Lead"], [10, "Welcome & speaker introductions", "President"], [20, "Panel discussion", "Moderator"], [70, "Audience Q&A", "Moderator"], [95, "Closing remarks & thank-you gifts", "President"], [100, "Networking reception", "All officers"], [140, "Teardown", "All officers"]],
    supplies: [["Table name tents (50 pk)", 1, 11, "Signage"], ["Thank-you gift bags", 3, 6, "Gifts"], ["Bottled water (24 pk)", t => Math.ceil(t / 24), 6, "Food Service"], ["Sign-in clipboards & pens", 1, 15, "Registration"], ["Easel sign stand", 2, 22, "Signage"]],
    vision: ["professional", "focused", "conversational", "clean"]
  },
  workshop: {
    label: "Workshop / Training", layout: "classroom", hours: 2,
    keywords: ["workshop", "training", "class", "lesson", "tutorial", "bootcamp", "hands-on", "arduino", "prep", "skills"],
    venue: "Classroom or makerspace with tables, outlets and projector",
    budget: [
      ["Venue", "Classroom / lab reservation", 1, "flat", 0, ""],
      ["Supplies", "Participant kits / materials", h => h, "per participant", 12, "Price varies widely — get exact kit quotes"],
      ["Food & Beverage", "Snacks & drinks", h => h, "per guest", 5, ""],
      ["Speakers", "Instructor thank-you", 1, "flat", 50, ""],
      ["Marketing", "Flyers & sign-up form promo", 1, "flat", 30, ""]
    ],
    schedule: [[-45, "Set up stations & materials", "Workshop Lead"], [0, "Check-in & hand out kits", "Volunteers"], [10, "Intro & safety briefing", "Instructor"], [25, "Hands-on session 1", "Instructor"], [70, "Break & snacks", "Hospitality"], [80, "Hands-on session 2 / build", "Instructor"], [115, "Share-outs & feedback survey", "President"], [125, "Cleanup", "All officers"]],
    supplies: [["Participant notebooks & pens", t => t, 2, "Materials"], ["Power strips", t => Math.ceil(t / 8), 15, "AV"], ["Snack variety pack (50 ct)", t => Math.ceil(t / 50), 25, "Food Service"], ["Name tags (100 pk)", 1, 8, "Registration"]],
    vision: ["hands-on", "collaborative", "bright", "practical"]
  },
  social: {
    label: "Social / Mixer", layout: "mixer", hours: 2.5,
    keywords: ["social", "mixer", "game night", "board game", "karaoke", "movie", "welcome", "meet", "boba", "networking", "hangout", "mentorship"],
    venue: "Lounge, atrium or multipurpose room with open floor",
    budget: [
      ["Venue", "Lounge / multipurpose room", 1, "flat", 0, ""],
      ["Food & Beverage", "Food (pizza / boba / snacks)", h => h, "per guest", 7, ""],
      ["Food & Beverage", "Drinks & ice", h => h, "per guest", 1.5, ""],
      ["Entertainment", "Games, music & activities", 1, "flat", 80, ""],
      ["Decor", "Balloons, tablecloths, signage", 1, "flat", 60, ""],
      ["Marketing", "Social media & flyers", 1, "flat", 30, ""]
    ],
    schedule: [[-60, "Set up food tables, games & playlist", "Events Chair"], [0, "Doors open — icebreaker bingo", "Hospitality"], [15, "Welcome from the exec board", "President"], [25, "Food served, activity stations open", "All officers"], [90, "Group game / raffle", "Emcee"], [135, "Group photo & wrap-up", "President"], [150, "Teardown", "All officers"]],
    supplies: [["Party tablecloths (12 pk)", 1, 14, "Decor"], ["Balloon kit", 1, 20, "Decor"], ["Paper plates, cups & napkins (100 ct)", t => Math.ceil(t / 100), 22, "Food Service"], ["Icebreaker bingo cards", 1, 10, "Activities"], ["Bluetooth speaker rental", 1, 0, "AV"], ["Trash bags", 1, 12, "Cleanup"]],
    vision: ["casual", "upbeat", "welcoming", "interactive"]
  },
  festival: {
    label: "Outdoor Festival / Fair", layout: "festival", hours: 3,
    keywords: ["festival", "fair", "quad", "outdoor", "holi", "cookout", "bbq", "food truck", "earth day", "carnival", "tasting", "lawn", "green", "taco"],
    venue: "Quad or outdoor green (rain location required) with power access",
    budget: [
      ["Venue", "Outdoor space reservation + rain location", 1, "flat", 100, "Outdoor events often need a facilities & grounds approval"],
      ["Venue", "Tent & table rentals", 1, "flat", 450, ""],
      ["Food & Beverage", "Food (trucks / catering / tastings)", h => h, "per guest", 8, ""],
      ["Food & Beverage", "Water stations", h => Math.ceil(h / 50), "station", 25, ""],
      ["AV & Tech", "Outdoor PA / DJ", 1, "flat", 350, ""],
      ["Entertainment", "Activity booths & materials", 1, "flat", 300, ""],
      ["Staffing & Security", "Security / crowd management", h => Math.max(1, Math.ceil(h / 200)), "officer (4 hrs)", 160, ""],
      ["Marketing", "Banners & social ads", 1, "flat", 150, ""],
      ["Supplies", "Waste sorting stations & cleanup", 1, "flat", 80, ""]
    ],
    schedule: [[-180, "Tents, tables & power run", "Facilities + Events Chair"], [-60, "Booths set, PA check", "Tech Lead"], [0, "Festival opens", "All officers"], [15, "Welcome announcement", "President"], [30, "Food service & activity booths open", "Hospitality"], [90, "Main performance / featured activity", "Emcee"], [160, "Raffle & closing", "President"], [180, "Teardown & waste sort", "All officers"]],
    supplies: [["Pop-up canopy tent 10x10", 2, 120, "Venue"], ["Folding tables (6 ft) rental", t => Math.ceil(t / 40), 12, "Venue"], ["Compostable plates & cutlery (100 ct)", t => Math.ceil(t / 100), 30, "Food Service"], ["Water cooler dispensers", t => Math.ceil(t / 75), 18, "Food Service"], ["Sunscreen & first-aid kit", 1, 35, "Safety"], ["Vinyl banner (custom)", 1, 60, "Signage"], ["Zip ties & tent weights", 1, 30, "Venue"]],
    vision: ["vibrant", "open-air", "colorful", "family-style"]
  },
  performance: {
    label: "Concert / Performance", layout: "theater", hours: 3,
    keywords: ["concert", "performance", "recital", "dance showcase", "show", "talent", "theater", "theatre", "band", "spring showcase", "open mic"],
    venue: "Performing arts center or auditorium with stage lighting",
    budget: [
      ["Venue", "Theater / auditorium rental", 1, "flat", 600, ""],
      ["AV & Tech", "Lighting & sound technicians", 1, "flat", 700, "Venue often requires its own techs"],
      ["Entertainment", "Costumes / performer stipends", 1, "flat", 800, ""],
      ["Marketing", "Posters, programs & ticketing fees", 1, "flat", 250, ""],
      ["Food & Beverage", "Post-show reception", h => h, "per guest", 4, ""],
      ["Staffing & Security", "Ushers & security", h => Math.max(1, Math.ceil(h / 150)), "officer (4 hrs)", 160, ""],
      ["Supplies", "Flowers & performer gifts", 1, "flat", 120, ""]
    ],
    schedule: [[-240, "Tech rehearsal & lighting focus", "Production Manager"], [-90, "Dress rehearsal", "Artistic Director"], [-30, "House opens, ushers in place", "House Manager"], [0, "Show begins — welcome", "Emcee"], [60, "Intermission", "House Manager"], [75, "Act II", "Artistic Director"], [140, "Bows & thank-yous", "President"], [150, "Lobby reception", "Hospitality"], [190, "Strike & load-out", "All officers"]],
    supplies: [["Printed programs", t => t, 0.6, "Marketing"], ["Glow tape (stage)", 2, 10, "Stage"], ["Bouquets for performers", 5, 18, "Gifts"], ["Ticket wristbands (500 ct)", 1, 25, "Registration"]],
    vision: ["dramatic", "spotlit", "artistic", "energetic"]
  },
  competition: {
    label: "Hackathon / Competition", layout: "classroom", hours: 6,
    keywords: ["hackathon", "competition", "pitch", "tournament", "case", "challenge", "conference", "model un", "mun", "delegates", "judges"],
    venue: "Large hall with breakout rooms, strong Wi-Fi and power",
    budget: [
      ["Venue", "Main hall + breakout rooms", 1, "flat", 200, ""],
      ["Food & Beverage", "Meals", h => h * 2, "meal", 11, "Number of meals depends on duration"],
      ["Food & Beverage", "Snacks, coffee & late-night food", h => h, "per guest", 5, ""],
      ["Entertainment", "Prizes & awards", 1, "flat", 900, "Gift cards may have tax/reporting rules"],
      ["Marketing", "Swag (t-shirts / stickers)", h => h, "per guest", 7, ""],
      ["AV & Tech", "Projectors, mics & extra power", 1, "flat", 250, ""],
      ["Speakers", "Judges' thank-you gifts", 4, "judge", 30, ""],
      ["Staffing & Security", "Overnight / building security", 1, "flat", 320, ""]
    ],
    schedule: [[-120, "Setup rooms, power & Wi-Fi check", "Logistics Lead"], [-30, "Check-in & swag pickup", "Volunteers"], [0, "Opening ceremony & rules", "President"], [30, "Competition / hacking begins", "All officers"], [180, "Meal break", "Hospitality"], [300, "Submissions due", "Logistics Lead"], [315, "Presentations / judging", "Judges"], [360, "Awards & closing", "President"], [380, "Cleanup", "All officers"]],
    supplies: [["Power strips (6 outlet)", t => Math.ceil(t / 6), 15, "AV"], ["Award trophies / plaques", 3, 25, "Awards"], ["Custom stickers (250 ct)", 1, 60, "Swag"], ["Coffee urns & cups", 2, 35, "Food Service"], ["Whiteboard markers", 3, 10, "Materials"], ["Name badges (100 pk)", t => Math.ceil(t / 100), 16, "Registration"]],
    vision: ["high-energy", "focused", "competitive", "tech-forward"]
  },
  fundraiser: {
    label: "Fundraiser / Charity", layout: "mixer", hours: 3,
    keywords: ["fundraiser", "charity", "auction", "bake sale", "donation", "benefit", "5k", "drive"],
    venue: "Atrium or hall with display tables near high foot traffic",
    budget: [
      ["Venue", "Space reservation", 1, "flat", 0, ""],
      ["Food & Beverage", "Refreshments", h => h, "per guest", 4, ""],
      ["Supplies", "Auction / raffle items & display", 1, "flat", 200, "Raffles may require special approval"],
      ["Marketing", "Flyers, social ads, QR donation signs", 1, "flat", 80, ""],
      ["Supplies", "Payment reader & cash box", 1, "flat", 50, ""],
      ["Decor", "Tablecloths & signage", 1, "flat", 60, ""]
    ],
    schedule: [[-60, "Set up displays & payment stations", "Treasurer"], [0, "Doors open", "All officers"], [20, "Welcome & cause presentation", "President"], [60, "Silent auction / activity", "Events Chair"], [150, "Winners announced", "Emcee"], [170, "Thank-you & total raised", "President"], [180, "Teardown & cash reconciliation", "Treasurer"]],
    supplies: [["Cash box with lock", 1, 25, "Finance"], ["QR code table stands", 4, 8, "Signage"], ["Bid sheet clipboards", 10, 3, "Activities"], ["Tablecloths (6 pk)", 1, 15, "Decor"]],
    vision: ["purpose-driven", "inviting", "community", "bright"]
  }
};

/* Online stores for the supply order list (search links only — no account needed) */
EP.STORES = [
  { id: "amazon", name: "Amazon", url: q => "https://www.amazon.com/s?k=" + encodeURIComponent(q) },
  { id: "target", name: "Target", url: q => "https://www.target.com/s?searchTerm=" + encodeURIComponent(q) },
  { id: "walmart", name: "Walmart", url: q => "https://www.walmart.com/search?q=" + encodeURIComponent(q) },
  { id: "costco", name: "Costco", url: q => "https://www.costco.com/CatalogSearch?keyword=" + encodeURIComponent(q) },
  { id: "webstaurant", name: "WebstaurantStore", url: q => "https://www.webstaurantstore.com/search/" + encodeURIComponent(q.replace(/[()"]/g, "")) + ".html" }
];

EP.CATEGORY_COLORS = {
  "Venue": "#2563eb", "Food & Beverage": "#ea580c", "Decor": "#db2777", "AV & Tech": "#7c3aed",
  "Entertainment": "#059669", "Speakers": "#0891b2", "Marketing": "#ca8a04", "Staffing & Security": "#475569",
  "Supplies": "#65a30d", "Contingency": "#94a3b8"
};
