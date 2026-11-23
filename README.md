# claude-skills

An index of my Claude Code skills and slash commands. Each skill is a folder in `skills/` with a `SKILL.md`. Each command is a file in `commands/`.

| Skill | What it does | Standalone repo |
|---|---|---|
| [`asd-ste100`](skills/asd-ste100) | Explains things in ASD-STE100 Simplified Technical English (80% mode by default). | [prithivrajmu/asd-ste100](https://github.com/prithivrajmu/asd-ste100) |
| [`peer-pr-review`](skills/peer-pr-review) | Reviews a teammate's GitHub PR for policy, claim accuracy, Copilot status and DRY, in a subagent. | [prithivrajmu/peer-pr-review](https://github.com/prithivrajmu/peer-pr-review) |
| [`pr-screenshots`](skills/pr-screenshots) | Captures one Playwright screenshot for each reachable UI state of a PR. | This repo |

| Command | What it does | |
|---|---|---|
| [`/verify-claims`](commands/verify-claims.md) | Checks that a PR's claimed work is really done: Opus audits, Sonnet fixes, a fresh Opus re-audits (max 2 cycles). | Copied as-is, see the note below |

## Install

Copy a skill folder into `~/.claude/skills/` (all projects) or `.claude/skills/` (one project):

```bash
git clone https://github.com/prithivrajmu/claude-skills
cp -R claude-skills/skills/asd-ste100 ~/.claude/skills/
```

Copy a command file into `~/.claude/commands/` or `.claude/commands/`.

`pr-screenshots` needs `npm install` in its folder (Playwright).

## Notes

`pr-screenshots` was written for a repo with a PR policy that asks for one screenshot for each UI state. Adjust the paths in its `SKILL.md` to your own repo.

`/verify-claims` is copied as it is from a Next.js repo. It runs `npm run typecheck`, `npm run lint` and `npm test`, and it checks efficiency against that repo's `ponytail` conventions. Change those commands and the convention check to match your own project before you use it. It also expects the Opus and Sonnet subagent models.
