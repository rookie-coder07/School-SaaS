$ErrorActionPreference = "Stop"

$extensions = @("*.js", "*.jsx", "*.ts", "*.tsx", "*.json", "*.css", "*.html", "*.md")
$roots = @("client", "server", "routes", "models", "scripts", "tests")

$excludeGlobs = @(
  "!**/node_modules/**",
  "!**/backups/**",
  "!**/uploads/**",
  "!**/ui-test-report/**",
  "!**/test-results/**",
  "!**/dist/**",
  "!**/build/**"
)

$rgArgs = @("--files")
foreach ($ext in $extensions) { $rgArgs += @("-g", $ext) }
foreach ($ex in $excludeGlobs) { $rgArgs += @("-g", $ex) }
$rgArgs += $roots

$targetFiles = New-Object System.Collections.Generic.List[string]
$rgAvailable = $false
try { $null = & rg --version 2>$null; $rgAvailable = $true } catch { $rgAvailable = $false }

if ($rgAvailable) {
  $rgOutput = & rg @rgArgs
  foreach ($line in $rgOutput) {
    if (-not [string]::IsNullOrWhiteSpace($line)) {
      $targetFiles.Add((Resolve-Path $line).Path)
    }
  }
} else {
  foreach ($root in $roots) {
    if (Test-Path $root) {
      Get-ChildItem -Path $root -Recurse -File -ErrorAction SilentlyContinue | Where-Object {
        $extensions -contains ("*" + $_.Extension.ToLower())
      } | ForEach-Object { $targetFiles.Add($_.FullName) }
    }
  }
}

Get-ChildItem -Path . -File | Where-Object { $extensions -contains ("*" + $_.Extension.ToLower()) } | ForEach-Object { $targetFiles.Add($_.FullName) }

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$utf8Strict = New-Object System.Text.UTF8Encoding($false, $true)
$cp1252 = [System.Text.Encoding]::GetEncoding(1252)

$report = @()
$removedTotal = 0
$changedCount = 0

foreach ($path in $targetFiles) {
  if (-not (Test-Path $path)) { continue }
  $bytes = [System.IO.File]::ReadAllBytes($path)

  $rawText = $null
  $decodedAs = "cp1252"
  try {
    $rawText = $utf8Strict.GetString($bytes)
    $decodedAs = "utf8"
  } catch {
    $rawText = $cp1252.GetString($bytes)
    $decodedAs = "cp1252"
  }

  $ext = [System.IO.Path]::GetExtension($path).ToLower()
  $beforeLen = $rawText.Length

  if ($rawText.Length -gt 0 -and $rawText[0] -eq [char]0xFEFF) {
    $rawText = $rawText.Substring(1)
  }

  if ($rawText -match '^[^\x00-\x7F]+(import |export |const |let |var |//|/\*)') {
    $rawText = [regex]::Replace($rawText, '^[^\x00-\x7F]+', '')
  }

  if ($decodedAs -eq "utf8") {
    $mojibake = $rawText -match '[\xC3\xC2\xE2]'
    if ($mojibake) {
      $fixed = [System.Text.Encoding]::UTF8.GetString($cp1252.GetBytes($rawText))
      $beforeBad = ([regex]::Matches($rawText, "[\xC3\xC2\xE2]")).Count
      $afterBad = ([regex]::Matches($fixed, "[\xC3\xC2\xE2]")).Count
      if ($afterBad -lt $beforeBad) {
        $rawText = $fixed
      }
    }
  }

  $literalN = ([regex]::Matches($rawText, "\\n")).Count
  $realN = ([regex]::Matches($rawText, "`n")).Count
  $looksCode = $rawText -match '^(import |export |const |let |var |//|/\*|<|#|\"use strict\")'
  $looksInjected = $rawText -match '\\n(import |export |const |let |var |//|/\*|<|#)'

  if ($literalN -ge 5 -and ($realN -le 5 -or $literalN -gt ($realN * 2)) -and $looksCode) {
    $rawText = $rawText -replace "\\n", "`n"
    $rawText = $rawText -replace "\\t", "`t"
  } elseif ($looksInjected) {
    $rawText = $rawText -replace "\\n", "`n"
    $rawText = $rawText -replace "\\t", "`t"
  }

  if ($ext -eq ".json" -and $rawText -match '^[\[{]\\n') {
    $rawText = $rawText -replace "\\n", "`n"
    $rawText = $rawText -replace "\\t", "`t"
  }

  if ($rawText -match "\\n") {
    $lines = $rawText -split "`n", -1
    for ($i = 0; $i -lt $lines.Length; $i++) {
      if ($lines[$i] -match "\\n" -and $lines[$i] -notmatch '[\x22\x27]') {
        $lines[$i] = $lines[$i] -replace "\\n", ""
      }
    }
    $rawText = [string]::Join("`n", $lines)
  }

  $rawText = $rawText -replace "\r\n", "\n"
  $rawText = $rawText -replace "\r", "\n"

  $rawText = $rawText -replace "\uFFFD", ""
  $rawText = $rawText -replace "\u0000", ""
  $rawText = $rawText -replace "[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", ""

  $afterLen = $rawText.Length
  $removed = $beforeLen - $afterLen

  $newBytes = $utf8NoBom.GetBytes($rawText)

  $isDifferent = $false
  if ($bytes.Length -ne $newBytes.Length) {
    $isDifferent = $true
  } else {
    for ($i = 0; $i -lt $bytes.Length; $i++) {
      if ($bytes[$i] -ne $newBytes[$i]) { $isDifferent = $true; break }
    }
  }

  if ($isDifferent) {
    [System.IO.File]::WriteAllBytes($path, $newBytes)
    $changedCount++
  }

  if ($isDifferent -or $removed -gt 0) {
    $report += [PSCustomObject]@{ file = $path; removedChars = $removed; rewritten = $isDifferent }
    $removedTotal += [Math]::Max(0, $removed)
  }
}

$reportPath = Join-Path -Path (Get-Location) -ChildPath "scripts\\normalize-utf8-report.json"
$report | ConvertTo-Json -Depth 3 | Set-Content -Path $reportPath

"Rewritten files: $changedCount"
"Total removed chars: $removedTotal"
"Report: $reportPath"
