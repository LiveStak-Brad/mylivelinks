#!/usr/bin/env pwsh

$ErrorActionPreference = "Stop"

function Get-CurrentBranch {
  try {
    $branch = (& git branch --show-current 2>$null)
    if ($null -eq $branch) { return "" }
    return $branch.Trim()
  } catch {
    return ""
  }
}

$branch = Get-CurrentBranch

if ($branch -ne "main") {
  Write-Host "ERROR: current branch is '$branch'. Only 'main' is allowed." -ForegroundColor Red
  exit 1
}

Write-Host "OK: on 'main'." -ForegroundColor Green
exit 0

#!/usr/bin/env pwsh

$ErrorActionPreference = "Stop"

function Get-CurrentBranch {
  try {
    $branch = (& git branch --show-current 2>$null)
    if ($null -eq $branch) { return "" }
    return $branch.Trim()
  } catch {
    return ""
  }
}

$branch = Get-CurrentBranch

if ($branch -ne "main") {
  Write-Host "ERROR: current branch is '$branch'. Only 'main' is allowed." -ForegroundColor Red
  exit 1
}

Write-Host "OK: on 'main'." -ForegroundColor Green
exit 0

