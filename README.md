# EventPlanner AI

AI event planning for student organizations (ECON 385 project). Describe an event in one sentence and get a full plan:

- **Vision & Map**: theme, tagline, color palette, attendee journey, and a floor plan scaled to your headcount (banquet, theater, classroom, mixer or outdoor festival). You can download the map as an SVG.
- **Logistics sheet**: an editable run of show, staffing roles sized to the headcount, plus accessibility and contingency notes.
- **Budget spreadsheet**: live totals, contingency, funding sources, cost per guest, a "fit to target budget" button, and CSV export or copy to Google Sheets/Excel.
- **Checklist**: deadlines counted back from the event date, with policy-dependent items tagged *Verify with SGS/CSLE*. Exports to `.ics` calendar or CSV.
- **Emails & invites**: member invitation, VIP/leadership mail merge, sponsor and vendor requests, reminder, thank-you, and an Instagram caption. Any of them can be rewritten by the local AI, and they open in Gmail or your mail app.
- **Supply orders**: quantities scaled to headcount, with search links to Amazon, Target, Walmart, Costco and WebstaurantStore. Checked items feed into the budget.
- **Club pages**: each club has budget tracking, one-click plans for its signature events, VIP contacts, saved plans and officer handoff notes. You can add your own club.

## Run it

1. Double-click **`Start-EventPlanner.bat`**. It serves the site at http://localhost:8080 and opens your browser. Nothing needs to be installed because it uses built-in PowerShell.
2. For the AI features, have **Ollama** running with a model pulled:
   ```
   ollama pull llama3.2
   ```
   (`phi4-mini` is already installed on this machine.) The status pill in the top-right turns green when it connects. Click it to pick the model.

Without Ollama the planner still works. It uses instant templates.

> Don't open the `.html` files directly (file://). Ollama only accepts requests from `http://localhost` pages.

## Files

| File | Purpose |
|---|---|
| `index.html`, `planner.html`, `clubs.html`, `club.html`, `about.html` | Pages |
| `js/data.js` | Sample clubs, event-type templates, store links (edit these to use real data) |
| `js/engine.js` | Prompt parsing, template plan, map drawing, Ollama prompts + validation |
| `js/planner.js` | Planner UI (tabs, spreadsheets, emails, exports) |
| `js/common.js` | Nav, storage, Ollama client |
| `serve.ps1` | Tiny local web server |

Plans auto-save in the browser (localStorage). Club data is sample data. Costs are estimates, and deadlines must be confirmed with SGS/CSLE.
