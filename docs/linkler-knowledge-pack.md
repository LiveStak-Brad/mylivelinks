# Linkler Knowledge Pack Generator

Create a structured “Site Facts” pack that Linkler can consume without hitting production services at runtime.

## What It Does

- Crawls only the allow‑listed public pages on `mylivelinks.com`
- Scans local documentation (`/README*.md` + `/docs/**/*.md` by default)
- Strips nav/footer chrome before extracting headings, summaries, and key facts
- Emits machine-friendly JSON plus a human-readable Markdown snapshot

Outputs land in `scripts/linkler/output/`:

- `knowledge_pack.json`
- `knowledge_pack.md`
- `knowledge_pack.example.json` / `.md` (checked-in static examples)

## Prerequisites

- Node.js 18+ (needed for the built-in `fetch`)
- `npm install` (installs Cheerio, fast-glob, unified/remark parsers)

## Allowlist & Filtering

Configuration lives in `scripts/linkler/allowlist.json`:

- `remote`: array of `{ url, title?, stripSelectors?[] }`
  - Only URLs listed here are crawled.
  - `stripSelectors` are appended to the default `script/style/noscript` removal list.
- `local`: mix of `{ path }` and `{ glob, ignore?[] }` entries for docs on disk.
- `blockedPathPatterns`: substrings that short-circuit remote fetches (keeps auth/admin routes out of the pack).

Adjust the JSON file to add/remove pages. Use relative repo paths for local files so the script stays portable.

## Running the Generator

```bash
npm run generate:knowledge-pack
```

The script (`scripts/linkler/generate-knowledge-pack.mjs`) will:

1. Load the allowlist config.
2. Fetch remote pages sequentially, applying selector-based scrubbing.
3. Parse Markdown docs via `gray-matter` + `remark-parse`.
4. Normalize each source into `{ title, source, headings[], summary, key_facts[] }`.
5. Write fresh JSON & Markdown packs stamped with the generation time.

The command is idempotent and overwrites the existing files in `scripts/linkler/output/`.

## Verifying the Results

- Check `source_count` inside `knowledge_pack.json` to confirm every allowlisted entry rendered.
- Spot-check sections in `knowledge_pack.md` to ensure summaries/facts make sense.
- Compare against `knowledge_pack.example.*` if you need a quick sanity reference without hitting the network.

## Extending

- Add/remove selectors in `stripSelectors` to better isolate main content.
- Expand `blockedPathPatterns` if new auth/owner-only URL segments need protection.
- Introduce new local glob blocks (e.g., `docs/linkler/**/*.md`) to enrich the pack.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| “Fetch error …” | Confirm the URL is public and spelled correctly. |
| Missing docs | Verify the relative path/glob resolves from repo root. |
| Empty summary | Ensure the page has real text content; fall back to `meta[name=description]` or add a custom summary manually before ingestion. |

Never point the crawler at private dashboards or staged content unless they are explicitly approved for Linkler consumption.
