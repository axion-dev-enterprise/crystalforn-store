# Release checklist

Use this list for a code release. It does not authorize activating commercial operations.

## Before creating a release

- [ ] Confirm the release still has `PUBLISHED_COMMERCE_MODE = 'demo'` unless a separately approved commercial change explicitly replaces it.
- [ ] Review the full diff, staged paths, generated files, dependency lockfile, and migrations.
- [ ] Confirm no `.env`, credentials, customer records, private deployment notes, database dump, or production log is staged.
- [ ] Check `.env.example` contains placeholders and example domains only.
- [ ] Confirm demo cards remain clearly marked as fictitious and cannot be purchased.
- [ ] Run `npm ci`, `npm run build`, and `git diff --check`.
- [ ] Review changed configuration and update the relevant docs in the same release.
- [ ] Confirm GitHub Actions build has completed for the release commit.

## Version and publish

1. Update `CHANGELOG.md` with user-visible changes and limitations.
2. Commit related code and documentation in focused commits.
3. Create an annotated SemVer tag after the corresponding commit is on `main`.
4. Push the branch and tag, then inspect the public tree and workflow result.

## Production-only prerequisites

Production deployment and commercial activation require a separate approved plan, reviewed migration and backup strategy, configured secrets, verified identity and payment integrations, documented rights and provider approvals, operational monitoring, and a rollback path. Do not infer authorization from a successful build or GitHub release.
