Verify that a branch/PR's claimed work is actually done, and done well — using a two-model review loop (Opus audits, Sonnet fixes, Opus re-audits) instead of trusting completion claims from the session that did the work. Use this after finishing a PR, or whenever asked to double-check claimed work rather than repeat the instructions from scratch.

Takes an optional argument: a PR number (e.g. `287`) or branch name. Default: the current branch, against its open PR if one exists, else against `origin/main`.

## 0. Gather the claims

Collect what's claimed as done — do not re-derive the claims from the diff alone, since the point is checking the diff against what was *said* was done:
- `gh pr view <number> --json title,body,commits` if a PR exists.
- `git log origin/main..HEAD` commit messages otherwise.
- Any explicit claim list the user just gave in conversation.

Write the claims to a flat, numbered list before moving on — the audit agent needs this verbatim, not paraphrased.

## 1. Audit with Opus

Launch one Agent (`subagent_type: general-purpose`, `model: "opus"`). Give it, self-contained (it has no memory of this conversation):
- The repo path and exact branch/PR to check out.
- The numbered claims list from step 0, verbatim.
- Per claim, instruct it to:
  1. Find the actual code change and confirm it does what's claimed — not just that something changed nearby.
  2. Check scoping claims literally (e.g. "X only" must not leak into shared components used elsewhere — grep every other caller of anything touched).
  3. Check efficiency per this repo's `ponytail` conventions: unnecessary complexity, a reinvented helper that already exists in the codebase, redundant computation, over-broad changes beyond what the claim required, speculative abstraction.
  4. Run `npm run typecheck`, `npm run lint`, and `npm test` itself — never trust a prior session's claim that these passed.
- Require a verdict table back: one row per claim, status DONE / PARTIAL / NOT DONE / INEFFICIENT, with exact `file:line` evidence for each verdict. No hedging — a claim is either verified against the code or it isn't.

## 2. Triage

For every claim not DONE, write a scoped fix: exact file(s), exact problem, exact expected outcome. Keep each fix small enough for one focused subagent. Don't bundle unrelated findings into one fix task — a Sonnet agent should never receive the whole audit report, only its own slice.

## 3. Fix with Sonnet

For each scoped fix, launch an Agent (`subagent_type: general-purpose`, `model: "sonnet"`) with only that one scoped problem. Run fixes in parallel (one message, multiple Agent calls) when they touch disjoint files; sequentially when they'd touch the same file.

Each fix agent must run `npm run typecheck`, `npm run lint`, and the relevant test file(s) before reporting done, and add/update tests for whatever it changed.

## 4. Re-audit with Opus

Launch a *fresh* Opus agent (not a continuation) with the original claims list plus a one-line note on what was just changed. Ask for the same verdict table, from scratch. A fix agent's own "done" self-report is never sufficient on its own — it must independently re-pass this audit.

## 5. Loop or stop

If the re-audit still finds NOT DONE / INEFFICIENT items, repeat steps 2–4 for those only. Cap at 2 fix→re-audit cycles total, then stop and report to the user instead of looping indefinitely.

## 6. Report

Give the user: the final verdict table, what was fixed and by which agent, and anything still open after 2 cycles. Do not claim something is fixed unless the re-audit confirmed it.
