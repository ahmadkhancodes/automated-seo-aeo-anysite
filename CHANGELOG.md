# Changelog

All notable changes to this project are listed here. Versions follow [Semantic Versioning](https://semver.org).

## 1.1.0

### Added
- **Claude Code plugin and marketplace** (`.claude-plugin/`): install with `/plugin install automated-seo-aeo-anysite --marketplace ahmadkhancodes/automated-seo-aeo-anysite` and update with `/plugin update`.
- **CLI** (`npx automated-seo-aeo-anysite`): `install` copies the skill to `~/.claude/skills` (or `--project`), and `init`, `keywords`, `plan`, `qa`, `schema`, `llms-txt` run the scripts from any folder. `qa` keeps its exit code, so it works as a CI gate.
- Issue templates, a pull request template, a code of conduct and a security policy.
- Tests for the manifests, the CLI and the SKILL.md frontmatter.

### Changed
- The "no personal strings" test now allows the maintainer's GitHub handle in distribution files only (manifests, package metadata, README and community files). The skill, templates and examples stay brand-free.

## 1.0.0
- Initial release: the skill, nine playbooks, templates, zero-dependency scripts, an example workspace and smoke tests.
