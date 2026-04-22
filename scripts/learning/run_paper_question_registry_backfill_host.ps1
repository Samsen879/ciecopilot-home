param(
  [string]$Manifest = "data/manifests/9709_question_search_recovery_v1.json",
  [string]$CurriculumSeed = "data/curriculum/9709_question_search_recovery_nodes_v1.json",
  [string]$DatabaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

function Write-Step {
  param([string]$Message)
  Write-Host "`n== $Message =="
}

function Normalize-ProviderPath {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return $Value
  }

  return $Value -replace '^Microsoft\.PowerShell\.Core\\FileSystem::', ''
}

function Resolve-RepoRoot {
  return (Get-Item (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))).FullName
}

function Resolve-HostHelperPath {
  return (Resolve-Path (Join-Path $PSScriptRoot "lib\\windows-host-node-path.js")).ProviderPath
}

function Resolve-HostRepoRoot {
  param(
    [string]$RepoRoot,
    [string]$HelperPath
  )

  $resolved = & node $HelperPath "--kind" "repo-root" "--repo-root" $RepoRoot
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to resolve Windows host repo root"
  }

  if ([string]::IsNullOrWhiteSpace($resolved)) {
    return $RepoRoot
  }

  return ($resolved | Out-String).Trim()
}

function Resolve-InputPath {
  param(
    [string]$RepoRoot,
    [string]$TargetPath
  )

  $normalizedTargetPath = Normalize-ProviderPath -Value $TargetPath
  if ([System.IO.Path]::IsPathRooted($normalizedTargetPath)) {
    return $normalizedTargetPath
  }

  return (Resolve-Path (Join-Path $RepoRoot $normalizedTargetPath)).ProviderPath
}

function Invoke-NodeScript {
  param(
    [string[]]$Arguments
  )

  $previousDatabaseUrl = $env:DATABASE_URL
  $previousPgCompat = $env:SUPABASE_PG_COMPAT
  try {
    $env:DATABASE_URL = $DatabaseUrl
    $env:SUPABASE_PG_COMPAT = "true"

    & node @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "Node script failed with exit code $LASTEXITCODE"
    }
  } finally {
    if ($null -eq $previousDatabaseUrl) {
      Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
    } else {
      $env:DATABASE_URL = $previousDatabaseUrl
    }

    if ($null -eq $previousPgCompat) {
      Remove-Item Env:SUPABASE_PG_COMPAT -ErrorAction SilentlyContinue
    } else {
      $env:SUPABASE_PG_COMPAT = $previousPgCompat
    }
  }
}

$repoRoot = Resolve-RepoRoot
$hostHelperPath = Resolve-HostHelperPath
$hostRepoRoot = Resolve-HostRepoRoot -RepoRoot $repoRoot -HelperPath $hostHelperPath
$resolvedManifest = Resolve-InputPath -RepoRoot $repoRoot -TargetPath $Manifest
$resolvedCurriculumSeed = Resolve-InputPath -RepoRoot $repoRoot -TargetPath $CurriculumSeed
Set-Location $hostRepoRoot

Write-Step "Backfill paper-question registry via Windows host PG compat"
Invoke-NodeScript -Arguments @(
  (Join-Path $hostRepoRoot "scripts/learning/run_paper_question_registry_backfill.js"),
  "--manifest",
  $resolvedManifest,
  "--curriculum-seed",
  $resolvedCurriculumSeed
)
