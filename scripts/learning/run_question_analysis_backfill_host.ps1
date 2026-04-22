param(
  [string]$Manifest = "data/manifests/9709_question_search_recovery_v1.json",
  [string]$EvidenceBundles = "docs/reports/2026-04-16-9709-question-evidence-bundles-v1.json",
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

function Resolve-NodeModulesPath {
  param([string]$HostRepoRoot)

  $candidate = Join-Path $HostRepoRoot "node_modules"
  if (-not (Test-Path $candidate)) {
    return $null
  }

  return (Resolve-Path $candidate).ProviderPath
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
  $previousNodePath = $env:NODE_PATH
  try {
    $env:DATABASE_URL = $DatabaseUrl
    $env:SUPABASE_PG_COMPAT = "true"
    if ($resolvedNodePath) {
      $env:NODE_PATH = $resolvedNodePath
    }

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

    if ($null -eq $previousNodePath) {
      Remove-Item Env:NODE_PATH -ErrorAction SilentlyContinue
    } else {
      $env:NODE_PATH = $previousNodePath
    }
  }
}

$repoRoot = Resolve-RepoRoot
$hostHelperPath = Resolve-HostHelperPath
$hostRepoRoot = Resolve-HostRepoRoot -RepoRoot $repoRoot -HelperPath $hostHelperPath
$resolvedManifest = Resolve-InputPath -RepoRoot $repoRoot -TargetPath $Manifest
$resolvedEvidenceBundles = Resolve-InputPath -RepoRoot $repoRoot -TargetPath $EvidenceBundles
Set-Location $hostRepoRoot
$resolvedNodePath = Resolve-NodeModulesPath -HostRepoRoot $hostRepoRoot

Write-Step "Hydrate question analysis via Windows host PG compat"
Invoke-NodeScript -Arguments @(
  (Resolve-Path (Join-Path $repoRoot "scripts/learning/run_question_analysis_backfill.js")).ProviderPath,
  "--force",
  "--source-kind",
  "paper_question",
  "--host-repo-root",
  $hostRepoRoot,
  "--manifest",
  $resolvedManifest,
  "--evidence-bundles",
  $resolvedEvidenceBundles
)
