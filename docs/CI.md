# Continuous integration and release

GitHub Actions use the Node.js version from `package.json` `engines` via `actions/setup-node` `node-version-file`.

## Workflows

| Workflow | File | When |
| --- | --- | --- |
| **CI** | `.github/workflows/ci.yml` | Push / PR to `main` or `v2` |
| **CodeQL** | `.github/workflows/codeql.yml` | Push / PR to `main` or `v2`, plus weekly |
| **Nightly pipelines** | `.github/workflows/nightly-pipelines.yml` | Weekly (Monday 06:00 UTC), manual |
| **Release** | `.github/workflows/release.yml` | Tag push `v*`, manual |

### CI jobs

- **lint** — `npm run check:lint` (ESLint)
- **format** — `npm run check:format` (Prettier)
- **locale** — Swedish prescriptive `--check` + Swedish tier validator
- **test** — Vitest
- **audit (non-blocking)** — `npm audit --omit=dev --audit-level=high` (failure does not fail the workflow)

Install step uses **`npm install`** because `package-lock.json` is gitignored. For reproducible installs in CI, consider committing a lockfile and switching workflows to `npm ci`.

### Nightly pipelines

Runs `npm run sv:pipeline` weekly (no `--with-lm`, no Wikipedia extended). Artifacts retain pipeline logs and `PIPELINE-SNAPSHOT.md` for 14 days. On failure, the workflow opens a GitHub issue with a link to the run.

### Release / npm

1. Add an **`NPM_TOKEN`** repository secret (npm automation or granular **Publish** token).
2. Bump `version` in `package.json`, merge to your release branch.
3. Create and push a tag: `v1.2.3` (must match `v*`).

The **Release** workflow runs `npm run check` then `npm publish --access public`. **workflow_dispatch** runs checks only (no publish).

## Dependabot

`.github/dependabot.yml` opens weekly PRs for npm and GitHub Actions.

## Local hooks

Run once per clone:

```bash
bash scripts/setup-git-guards.sh
```

That sets `core.hooksPath` to `.githooks/` and enables:

- **pre-push** — blocks pushes to the upstream parent repo URL
- **pre-commit** — runs `npm run check:lint` (requires `npm install` first)

## Branch protection (recommended)

In GitHub: **Settings → Branches → Add rule** for `main` and `v2`:

- Require a pull request before merging (optional but typical)
- Require status checks to pass: **lint**, **format**, **locale**, **test** (names match the CI job `name:` fields)
- Optionally require **CodeQL** / **Analyze**

This prevents merges when tests or locale gates fail.
