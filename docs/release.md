# Release Flow

中文版本: [release.zh.md](release.zh.md)

This project has two release tracks:

- `main` push -> GitHub Actions publishes a nightly prerelease
- annotated tag like `v0.0.2` -> GitHub Actions publishes a stable release

## End-to-end flow

1. Finish the code change and commit it on `main`
2. If you want a nightly build only, push `main`
3. If you want a stable release, create an annotated tag with release notes
4. Push the tag
5. GitHub Actions packages the app, creates the GitHub Release, and uploads updater metadata
6. Packaged apps detect updates on launch or through Help -> Check for Updates

## Stable release command sequence

```bash
git add .
git commit -m "feat: improve updater flow"
git push origin main

git tag -a v0.0.2 -m "PSRCHIVE Viewer 0.0.2

- Add in-app GitHub Release update checks
- Support manual download and restart-to-install flow
- Split nightly and stable update channels"

git push origin v0.0.2
```

## Where the GitHub Release description comes from

For stable releases, the GitHub Release `desc` / body is taken from the annotated tag message.

That means:

- use `git tag -a`, not a lightweight `git tag`
- put the full release notes directly in the tag message
- the first line becomes the top of the release body
- the rest can be bullets, migration notes, or known issues

If the annotated tag message is empty, the workflow falls back to a generic body.

For nightly prereleases, the body is still generated automatically by the workflow.

## Recommended stable release note template

```text
PSRCHIVE Viewer 0.0.2

- New: ...
- Improved: ...
- Fixed: ...

Notes:
- Any migration or manual follow-up
- Any known limitation
```

## Versioning and updater behavior

- Stable tags rewrite the packaged app version to the tag version, for example `v0.0.2 -> 0.0.2`
- `main` builds rewrite the packaged app version to a nightly semver prerelease like `0.0.2-nightly.153`
- Stable installs only receive stable releases
- Nightly installs only receive GitHub prereleases

## How the app updates

1. The packaged app starts and initializes `electron-updater`
2. It checks GitHub Releases in the background
3. If a matching update exists, the title bar shows an update action
4. Clicking it downloads the update
5. After download completes, clicking again restarts the app and installs the update

## Notes

- `npm run dev` does not exercise the real auto-update path; use a packaged app to verify updater behavior
- GitHub Actions needs `contents: write` permissions, or a `RELEASE_TOKEN` secret with release permissions
