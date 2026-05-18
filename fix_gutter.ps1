$f = 'src/styles/tokens.css'
$c = Get-Content $f -Raw
$c = $c -replace '  --editor-gutter-bg: #FAFBFC;\r?\n  --editor-gutter-border: #EAECEF;\r?\n',''
# Also make editor-cursor use accent variable instead of hardcoded light green
$c = $c -replace '  --editor-cursor: #0D8A5D;','  --editor-cursor: var(--accent-default);'
Set-Content $f -Value $c -NoNewline
Write-Host 'Fixed gutter tokens'
