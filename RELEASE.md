# Release Process

## Prerequisites

- All changes are committed to `p1/ui-polish`
- `cargo build` passes (no Rust compilation errors)
- `npx playwright test --project=chromium` passes (193+ e2e tests)

## Steps

### 1. Bump version in all three files

Update `Cargo.toml`, `package.json`, and `src-tauri/tauri.conf.json`
to the next patch version. All three must match exactly.

```pwsh
# Check current version
Select-String -Path "Cargo.toml","package.json","src-tauri/tauri.conf.json" -Pattern '"version"|^version'

# Bump (replace X.Y.Z with the next version)
$files = "Cargo.toml","package.json","src-tauri/tauri.conf.json"
foreach ($f in $files) {
    (Get-Content $f) -replace '0\.8\.XX', '0.8.YY' | Set-Content $f
}
```

> **⚠️ Critical:** All three files must be bumped in the **same commit**.

### 2. Commit and tag

```pwsh
git add Cargo.toml package.json src-tauri/tauri.conf.json
git commit -m "chore(release): v0.8.YY"
git tag v0.8.YY
```

### 3. Push

```pwsh
git push origin p1/ui-polish
git push origin v0.8.YY
```

> **⚠️ Important:** Push the tag **only once**. Never delete and re-push a tag —
> doing so triggers a second workflow run that races with the first and can
> produce a corrupted `latest.json` pointing to the wrong version.

### 4. Verify

1. Go to https://github.com/tzero86/markz/actions and confirm the Release
   workflow completes successfully on **both** Linux and Windows.
2. Check the release at https://github.com/tzero86/markz/releases/tag/v0.8.YY
   — verify `latest.json` has `"version": "0.8.YY"` and the installer URLs
   reference `0.8.YY` (not an older version).

```pwsh
# Verify latest.json version after the build completes
curl -s https://github.com/tzero86/markz/releases/download/v0.8.YY/latest.json
```

## If something goes wrong

1. **If the build fails:** Fix the issue in a new commit. Do NOT re-use the
   old tag. Bump to the next version (e.g., 0.8.ZZ) and create a fresh tag.

2. **If `latest.json` has the wrong version:** Create a new release with the
   next version number. Do not attempt to overwrite the existing release's
   assets — GitHub Actions asset uploads are not guaranteed to overwrite.

3. **If you accidentally force-push a tag:** Delete the release on GitHub,
   bump to the next version, and create a clean tag. The parallel workflow
   runs produce indeterminate `latest.json` results.
