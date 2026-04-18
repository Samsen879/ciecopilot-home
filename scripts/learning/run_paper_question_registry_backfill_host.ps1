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

function Resolve-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
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
Set-Location $repoRoot

Write-Step "Backfill paper-question registry via Windows host PG compat"
Invoke-NodeScript -Arguments @(
  "scripts/learning/run_paper_question_registry_backfill.js",
  "--manifest",
  $Manifest,
  "--curriculum-seed",
  $CurriculumSeed
)
