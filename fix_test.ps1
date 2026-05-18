$f = 'e2e/app.spec.ts'
$lines = Get-Content $f
$out = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
    $out += $lines[$i]
    # After the line defining isSun, insert the computedBg line if missing
    if ($lines[$i] -match 'const isSun = svg' -and -not ($lines[$i+1] -match 'computedBg')) {
        $out += '      const computedBg = getComputedStyle(html).getPropertyValue("--bg-base").trim();'
    }
}
$out | Set-Content $f -NoNewline
Write-Host 'Done'
