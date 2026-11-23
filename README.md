# claude-skills

An index of my Claude Code skills. Each skill is a folder in `skills/` with a `SKILL.md`.

| Skill | What it does | Standalone repo |
|---|---|---|
| [`asd-ste100`](skills/asd-ste100) | Explains things in ASD-STE100 Simplified Technical English (80% mode by default). | [prithivrajmu/asd-ste100](https://github.com/prithivrajmu/asd-ste100) |
| [`peer-pr-review`](skills/peer-pr-review) | Reviews a teammate's GitHub PR for policy, claim accuracy, Copilot status and DRY, in a subagent. | [prithivrajmu/peer-pr-review](https://github.com/prithivrajmu/peer-pr-review) |
| [`pr-screenshots`](skills/pr-screenshots) | Captures one Playwright screenshot for each reachable UI state of a PR. | This repo |

## Install

Copy a skill folder into `~/.claude/skills/` (all projects) or `.claude/skills/` (one project):

```bash
git clone https://github.com/prithivrajmu/claude-skills
cp -R claude-skills/skills/asd-ste100 ~/.claude/skills/
```

`pr-screenshots` needs `npm install` in its folder (Playwright).

## Notes

`pr-screenshots` was written for a repo with a PR policy that asks for one screenshot for each UI state. Adjust the paths in its `SKILL.md` to your own repo.
