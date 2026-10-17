# GigSaathi: a calm AI friend for gig workers

Multilingual (English, हिन्दी, ਪੰਜਾਬੀ, Hinglish) GenAI assistant for delivery partners, drivers and daily-wage workers in India.
Built for PromptWars "Gig Worker Companion". Every feature is a real end-to-end flow: real model calls (Ollama Cloud), a real database (SQLite), no mock data.

## What it does

| Area | Real logic behind it |
|---|---|
| Earnings | Speak or type "14 orders, ₹1850, petrol 300". The model extracts the numbers, they are saved to the database, and net per order and per hour, streaks and badges are computed from your real entries. The coach explains your actual week. |
| Safety | Model guidance for night, rain, accidents and harassment. SOS tab: one-tap calls, live location to WhatsApp, fake call, accident checklist. |
| Rights and schemes | Instant eligibility check (age, income, e-Shram, bank) plus a model explanation in your language. |
| Documents | Paste a notice or deactivation email; the model explains it simply. The summary is saved and reused. |
| Complaint | The model interviews you, then drafts a complaint using your real ledger and the saved document summary. Copy it or share on WhatsApp. |
| Saathi (emotions and fun) | Mood check-in with a caring reply, gentle support number after several low days, surprises (jokes, riddles, facts, rights), "hype me up", confetti, badges. |
| Just talk | One box or mic that routes any sentence to the right module. |

Connected on purpose: earnings data feeds the coach and the complaint; the document summary feeds the complaint; moods feed Saathi.

## Run it

```
cp .env.example .env     # set OLLAMA_API_KEY and OLLAMA_MODEL
npm start                # Node 22.13+, no npm install needed
npm test                 # 42 tests, no network needed
```

On start the server makes one real model call and prints `AI check OK` or `AI check FAILED` with the reason and the model names your key can use. You can also open `/api/health/model` at any time.

No login: each browser gets an anonymous session (random token in an HttpOnly cookie; only its hash is stored). Evaluators can use the app immediately, no credentials needed.

## For evaluators: 5-minute walkthrough

1. Earnings tab: type `14 orders, ₹1850, petrol 300, Zomato, 8 hours` and press Add. Numbers appear, the chart and stats update, and the row survives a page reload (database).
2. Ask the earnings coach "Explain my week". It answers from your saved numbers.
3. Documents tab: paste any notice text, press Explain simply. Then Complaint tab: Draft my complaint. It uses your entries and the document summary.
4. Rights tab: fill the short form. Instant results, then a model explanation in the selected language.
5. Switch language (top right) and ask anything. Replies are in that language. Try the mic (Chrome or Edge).
6. Saathi tab: tap a mood, press Surprise me, try "Just talk" at the top.
7. SOS tab: Fake call, and location sharing.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `OLLAMA_API_KEY` | none | Ollama Cloud key. Stays on the server. |
| `OLLAMA_MODEL` | `gpt-oss:120b` | Model tag. Check yours with `curl -H "Authorization: Bearer $OLLAMA_API_KEY" https://ollama.com/api/tags`. |
| `DB_PATH` | `./data/gigsaathi.db` | SQLite file. Must be on a persistent disk in production. |
| `PORT` | 3000 | Set automatically by most hosts. |
| `TRUST_PROXY` | 0 | Set to 1 behind a proxy so rate limiting sees real client IPs. |
| `RATE_LIMIT_PER_MIN` | 40 | AI calls per IP per minute (data calls get 4x). |

## Deploy

A `Dockerfile` is included (Node 22, non-root, health check, `/data` volume).

- Render, Railway or Fly.io: create a web service from this repo, add a persistent disk or volume mounted at `/data`, and set `OLLAMA_API_KEY` and `OLLAMA_MODEL` as environment variables.
- Cloud Run: works, but its disk is ephemeral, so saved data is lost when an instance is replaced. Use it only for a short demo, or move the store to a managed database (see below).
- Never commit `.env` (it is gitignored and excluded from the Docker image).

## Architecture

```
server.js          HTTP wiring: security headers, routing, rate limits, streaming chat
lib/prompts.js     system prompts per module and language (context is fenced as data)
lib/ollama.js      Ollama Cloud client (stream, one-shot, model check)
lib/db.js          SQLite store with migrations (swap-able interface)
lib/session.js     anonymous cookie sessions (token hash only)
lib/validate.js    strict validation of every request
lib/parse.js       free text to ledger entry (model first, regex only as a clearly-labelled backup)
lib/route.js       "just talk" router (model first, keyword backup)
lib/http.js        JSON IO, limiter, in-memory gzip + ETag static server
public/js/*.js     small ES modules; logic.js is pure and unit tested
test/              node:test suites: logic, database, validation, HTTP integration
```

Swapping the database: `openStore()` returns a plain object (createWorker, addEntry, listEntries, ...). Implement the same methods on Postgres or Firestore and pass it to `createApp({ store })`.

## Honest failure behaviour

If the model cannot be reached the app says so. It never shows a canned answer as if the AI wrote it. The only non-model fallbacks are the regex reader for entries (flagged "basic reading, please check") and the keyword router.

## Security and privacy

- API key server-side only; CSP with no inline scripts or styles; nosniff, frame and referrer protections.
- Strict validation, size limits, per-IP rate limits, parameterised SQL, escaped output (model text can never become HTML).
- Prompt-injection hardening: pasted documents and app context are fenced and marked as data.
- No personal identifiers collected. Workers can download (`/api/export`) or permanently delete (`/api/me`) all their data.
- Chat messages are not stored; only earnings entries, moods and the document summary are.

## Accessibility

Skip link, landmarks, WAI-ARIA tabs with arrow-key support, labelled controls, live regions for chat and toasts, focus rings, 44px targets, light and dark themes with AA contrast, reduced-motion support, Easy mode (bigger text and replies read aloud), voice in and out.

## Known limits

- Document help takes pasted text or a .txt file (no photo OCR).
- Voice input uses the browser's speech recognition (Chrome or Edge).
- Scheme facts are given as guidance; users are always told to confirm on the official website.
