# Contributing

Thanks for helping. This project is small on purpose: a skill (instructions), templates and zero-dependency scripts.

## Ground rules
1. **Stay honest.** No invented statistics, no unverifiable "ranking factor" claims. Claims about search engines must cite a primary source (their own documentation) and be checked word for word against the live page.
2. **Zero dependencies.** Scripts run on plain Node 18+. Do not add packages.
3. **No network calls in scripts.** They run locally on the user's files.
4. **No brand or personal data** in the skill, templates, examples or docs. The example site is fictional.
5. **Keep `SKILL.md` short.** Put detail in `references/` and open it only when needed.

## Workflow
- Fork, branch, and open a pull request against `main`. The pull request template has a short checklist.
- `npm test` must pass. Add a test for every new check or parser.
- `npm run qa:example` must still pass on the example post.
- If you change the skill folder, rebuild the zip: `npm run build:zip`, and commit `dist/`.

## Good first contributions
- Parsers for other keyword-tool exports (document the header row and add a small synthetic fixture).
- New QA checks that catch real quality problems, with a test for the failing case and the passing case.
- Translations of the humanizer lint list and of the playbooks.
- Publishing recipes for specific CMSs.

## Releasing (maintainers)
1. Bump `version` in `package.json` **and** `.claude-plugin/plugin.json` (a test checks they match) and add a `CHANGELOG.md` entry.
2. `npm test`, `npm run build:zip`, commit `dist/`.
3. Tag `vX.Y.Z` and publish a GitHub release. The `publish` workflow then runs the tests and ships the CLI to npm with provenance (it needs the `NPM_TOKEN` repository secret and skips versions already on npm).

## Using AI tools
AI-assisted contributions are welcome. You are responsible for every line you submit: run the tests, read the diff, and be ready to explain it in review. Say in the pull request if a tool wrote a large part of it.

## Code of conduct
Be kind and specific. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
