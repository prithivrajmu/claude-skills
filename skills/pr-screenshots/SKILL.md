---
name: pr-screenshots
description: >
  Capture per-state screenshots for a PR, per docs/GIT_WORKFLOW_POLICY.md's
  "one screenshot per reachable state" rule (one image per toggle, tab,
  drill-down or grain selector — not just the default view). Drives a real
  browser with Playwright. Defaults to headless Chromium against the local
  dev server, since `npm run dev` bypasses auth on localhost in this repo
  (LOCAL_AUTH_BYPASS, isLocalDevBypass) and that covers ordinary UI changes. If the diff touches user
  management, admin, roles, PDRP, preview access, or anything gated by the
  platform's real SSO rather than localhost's bypass, it instead walks you
  through deploying the branch, opening a visible Chrome window for the user
  to complete the real SSO login in, and then attaches to that logged-in
  session to capture the same screenshots. Use whenever the user asks to
  screenshot a change, take PR screenshots, grab screen grabs for a PR or
  review, or wants images to attach via `gh pr create`/`gh pr edit`.
---

# PR screenshots

`docs/GIT_WORKFLOW_POLICY.md` requires one screenshot per reachable state for
any UI change — not just the default view. This skill drives a real browser
(Playwright) to produce those, and handles the one case that can't be faked:
a change gated by the platform's real SSO rather than localhost's auth bypass.

## 1. Decide: local or deployed

Auth, roles, PDRP, preview access and user management only work for real on
the platform's SSO session — under `npm run dev` (`LOCAL_AUTH_BYPASS=true`),
`isLocalDevBypass` short-circuits all of that on `localhost`, so a localhost screenshot of one of those surfaces would
look fine while showing nothing true about the actual gating.

Check which case you're in:

```bash
bash .claude/skills/pr-screenshots/scripts/check-sensitive.sh [base-ref]   # default base-ref: origin/main
```

- Exit 0, prints `clean` → go to **2. Local capture**.
- Exit 1, prints the matching files → **stop**. Tell the user plainly which
  files triggered it and why localhost can't be trusted for this screenshot,
  then go to **3. Deployed capture**. Don't silently fall back to localhost.

The script only pattern-matches paths (admin UI, `lib/auth/`, `proxy.ts`,
`src/db/`, `migrations/`); use your own judgment too if a change is obviously
about role/PDRP/preview-access behavior even when the diff doesn't touch those
exact paths.

## 2. One-time setup

```bash
cd .claude/skills/pr-screenshots && npm install && cd -
```

This installs Playwright's JS package into this skill's own
`node_modules` — already covered by the repo's blanket `node_modules` ignore
rule, so it never touches the project's `package.json`/lockfile or the Docker
build context. The Chromium binary Playwright needs is usually already cached
on a dev machine; if `capture.mjs` complains it's missing, run
`npx playwright install chromium` once.

## 3. Write a steps file

Look at the diff and enumerate every reachable state it touches or sits
inside — each toggle position, each tab, each brand/class drill-down, each
grain selector — plus one shot of anything deliberately left unchanged.
Write them as a JSON array, run top to bottom against one shared page (so
navigation and any login session carry over naturally):

```json
[
  { "goto": "/brand/cibinqo" },
  { "waitFor": "text=Market Dynamics" },
  { "screenshot": "01-rx-performance-default.png" },
  { "click": "text=Switching Dynamics" },
  { "waitFor": "text=Switching Dynamics sections" },
  { "screenshot": "02-switching-dynamics.png" },
  { "click": "text=Line of Therapy" },
  { "screenshot": "03-line-of-therapy.png" }
]
```

Step kinds:

| Key | Meaning |
|---|---|
| `goto` | Navigate. A path is resolved against `--base-url`; a full URL is used as-is. |
| `click` | Click the first match of a Playwright locator string (e.g. `text=Rx Performance`, `button:has-text("Save")`). |
| `waitFor` | Wait for a locator to become visible — prefer this over `waitForTimeout` for anything data-driven. |
| `waitForTimeout` | Raw pause in ms. Last resort only. |
| `screenshot` | Capture to `<out-dir>/<name>`. Viewport-only by default; add `"fullPage": true` for the whole scrollable page, or `"locator": "..."` to capture just one element/pane instead of the whole viewport. |

Name files so the state is obvious from the filename alone
(`01-default-state.png`, `02-toggle-on.png`) — that's what
`docs/GIT_WORKFLOW_POLICY.md`'s attach step expects.

## 4. Local capture (ordinary UI changes)

1. Start the dev server from the correct worktree
   (`CLAUDE.local.md` — run everything from the branch's own worktree, not
   the shared main checkout). Use a non-default port if 3000 is already
   taken by another session: `npm run dev -- -p 3001`.
2. Wait until it answers (`curl -sf http://localhost:3001 >/dev/null`, retry
   for ~20s).
3. Capture:

   ```bash
   node .claude/skills/pr-screenshots/scripts/capture.mjs \
     --steps /path/to/steps.json \
     --out-dir /path/to/output/dir \
     --base-url http://localhost:3001
   ```
4. Review the PNGs, then attach them — never commit them:

   ```bash
   gh pr create --attach ./01-rx-performance-default.png --attach ./02-switching-dynamics.png ...
   ```

## 5. Deployed capture (user management / auth / admin / PDRP / preview-access changes)

Tell the user up front what's about to happen and why (localhost can't
exercise the real SSO/role/PDRP/preview gating), then:

1. Confirm the branch is pushed. Pushing a branch triggers a nonprod ECS
   deploy at `{repo}--{branch}.<preview-domain>` — this repo's
   `CLAUDE.md` is explicit that the ~10 minute deploy window must not be
   interrupted or re-pushed into, so don't push again once it's started.
2. Wait for the deploy to finish (`gh run list` / ask the user to confirm
   the preview is up) before opening anything.
3. Open a **separate, visible** Chrome instance with remote debugging on,
   pointed straight at the preview URL — a fresh profile so it doesn't
   collide with the user's normal Chrome windows or session:

   ```bash
   open -na "Google Chrome" --args \
     --remote-debugging-port=9222 \
     --user-data-dir="$(mktemp -d)" \
     "https://<repo>--<branch>.<preview-domain>"
   ```
4. Ask the user to complete the SSO login in that window themselves, then
   tell you once they're looking at the real dashboard. **Wait for their
   reply — never script, guess at, or otherwise attempt the login yourself.**
   This step exists specifically because that flow can't be faked.
5. Once confirmed, attach to that same authenticated browser/tab instead of
   opening a new, unauthenticated one:

   ```bash
   node .claude/skills/pr-screenshots/scripts/capture.mjs \
     --steps /path/to/steps.json \
     --out-dir /path/to/output/dir \
     --cdp http://localhost:9222 \
     --base-url https://<repo>--<branch>.<preview-domain>
   ```

   In `--cdp` mode the script never closes the browser afterward, so the
   user's session isn't torn down mid-review — they can keep clicking around
   or close the window themselves once the screenshots look right.

## Notes

- The SSO login step is the one piece of this skill that stays manual, on
  purpose — don't look for a way around it.
- Keep `steps.json` scoped to the states the diff actually changed; this
  isn't a general-purpose crawler.
- Screenshots are review evidence, not source — save them to a scratch
  directory and attach them with `gh`, per
  `docs/GIT_WORKFLOW_POLICY.md` "Attaching Screenshots and Images". Never
  commit them to the repo.
