# Release Process

## Prerequisites

- All changes are committed to `master`
- `cargo check --workspace` passes (no Rust compilation errors)
- `npx playwright test` passes (217+ e2e tests)

## Steps

### 1. Add a CHANGELOG entry

Add a new `## [X.Y.Z] - YYYY-MM-DD` section at the top of `CHANGELOG.md`.
This section is what users will see on the GitHub Release page, because the
Release workflow extracts it automatically.

### 2. Bump version in all versioned files

Update `Cargo.toml`, `package.json`, and `src-tauri/tauri.conf.json` to the
next patch version. All three must match exactly. Then refresh the lockfiles:

```pwsh
# Check current version
Select-String -Path "Cargo.toml","package.json","src-tauri/tauri.conf.json" -Pattern '"version"|^version'

# Bump (replace X.Y.Z with the next version)
$files = "Cargo.toml","package.json","src-tauri/tauri.conf.json"
foreach ($f in $files) {
    (Get-Content $f) -replace '0\.8\.XX', '0.8.YY' | Set-Content $f
}

# Refresh lockfiles so they match the new workspace/package version
cargo check --workspace
npm install
```

> **⚠️ Critical:** The version bump and lockfile refresh must be in the **same commit**.

### 3. Commit and tag

```pwsh
git add -A
git commit -m "chore(release): v0.8.YY"
git tag -a v0.8.YY -m "v0.8.YY"
```

### 4. Push

```pwsh
git push origin master
git push origin v0.8.YY
```

> **⚠️ Important:** Push the tag **only once**. Never delete and re-push a tag —
> doing so triggers a second workflow run that races with the first and can
> produce a corrupted `latest.json` pointing to the wrong version.

### 5. Verify

1. Go to https://github.com/tzero86/markz/actions and confirm the Release
   workflow completes successfully on **both** Linux and Windows.
2. Check the release at https://github.com/tzero86/markz/releases/tag/v0.8.YY
   — the release body should contain the matching `CHANGELOG.md` section,
   and `latest.json` should have `"version": "0.8.YY"` with installer URLs
   referencing `0.8.YY` (not an older version).

```pwsh
# Verify latest.json version after the build completes
curl -s https://github.com/tzero86/markz/releases/download/v0.8.YY/latest.json
```

## How release notes work

The Release workflow (`release.yml`) runs `scripts/get-release-notes.cjs`,
which reads `CHANGELOG.md`, finds the section for the pushed tag (e.g.
`v0.8.YY` matches `## [0.8.YY]`), and passes it to `tauri-action` as the
release body. If no matching section exists, the workflow falls back to a
generic message.

To also include GitHub's auto-generated commit/PR notes, set
`generateReleaseNotes: true` in `.github/workflows/release.yml`.

## If something goes wrong

1. **If the build fails:** Fix the issue in a new commit. Do NOT re-use the
   old tag. Bump to the next version (e.g. 0.8.ZZ) and create a fresh tag.

2. **If `latest.json` has the wrong version:** Create a new release with the
   next version number. Do not attempt to overwrite the existing release's
   assets — GitHub Actions asset uploads are not guaranteed to overwrite.

3. **If you accidentally force-push a tag:** Delete the release on GitHub,
   bump to the next version, and create a clean tag. The parallel workflow
   runs produce indeterminate `latest.json` results.
