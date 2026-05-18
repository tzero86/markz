$ErrorActionPreference = "Stop"
Set-Location "C:\Users\Zero\Documents\coding\MarkZ"

if (Test-Path '$null') { Remove-Item '$null' -Force }
if (Test-Path 'migrate_icons.ps1') { Remove-Item 'migrate_icons.ps1' -Force }

git add package-lock.json package.json src/
git commit -m 'Phase 1: Icon migration to Lucide + shared CSS primitives + animation system. Replaced 33 inline SVGs across 10 components.'
git log --oneline -1
