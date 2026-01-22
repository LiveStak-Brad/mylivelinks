# Agent Documentation Policy

## Allowed Markdown Locations

Only these markdown locations are permitted in this repository:

- `/README/**`
- `/docs/**`
- `README.md` (root)
- `components/**/README.md` (only if it's truly component-level reference)
- `public/**/README.md` (only for assets)

## Hard-Ban Patterns

The following patterns are **BANNED** anywhere else in the repo:

- `*_COMPLETE.md`
- `*_FIX*.md`
- `*_DELIVERABLE.md`
- `*_AUDIT*.md`
- `*_GUIDE*.md`
- `*_SUMMARY*.md`
- `*_REPORT*.md`
- `DEBUG_*.md`
- `PHASE*.md`
- `AGENT_*.md`
- `FINAL_*.md`

## Work Log Policy

**No "work log" docs.** Work history belongs in:
- Git commits
- PR descriptions
- NOT new `.md` files

## If You Need to Document Something

If an agent wants to document something:

1. It **must** be added to an existing doc inside `/README` or `/docs`
2. **OR** create a single new doc inside `/README` with a **stable name** (no dates, no "fix/complete/final" wording)

## Rationale

This project is near completion. We cannot repeat what happened with LiveStak (near-complete app blocked by agent sprawl and loss of focus).

Documentation must be intentional, consolidated, and maintainable—not a byproduct of debugging sessions.
