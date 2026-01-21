$ErrorActionPreference = "Stop"
# Prevent stderr from native commands from stopping the script.
$PSNativeCommandUseErrorActionPreference = $false

function Write-Step {
  param([string]$Message)
  Write-Host "`n=== $Message ==="
}

function Get-DbContainerName {
  $name = docker ps --format "{{.Names}}" | Where-Object { $_ -match "^supabase_db" } | Select-Object -First 1
  if (-not $name) {
    throw "Supabase DB container not found. Run 'supabase start' first."
  }
  return $name
}

$schemaScript = Join-Path $PSScriptRoot "verify_schema.sql"
$guardScript = Join-Path $PSScriptRoot "verify_search_guardrail.sql"

Write-Step "Supabase start"
try {
  $existing = docker ps --format "{{.Names}}" | Where-Object { $_ -match "^supabase_db" } | Select-Object -First 1
  if ($existing) {
    Write-Host "supabase_db already running: $existing"
  } else {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $out = & cmd /c "supabase start --debug" 2>&1
    $ErrorActionPreference = $prev
    $out | ForEach-Object { Write-Host $_ }
    if ($LASTEXITCODE -ne 0) { throw "supabase start failed" }
  }
} catch {
  Write-Host $_
  throw
}

Write-Step "Supabase db reset"
$prev = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$out = & cmd /c "supabase db reset --debug" 2>&1
$ErrorActionPreference = $prev
$out | ForEach-Object { Write-Host $_ }
if ($LASTEXITCODE -ne 0) { throw "supabase db reset failed" }

Write-Step "Locate DB container"
$dbContainer = Get-DbContainerName
Write-Host "DB container: $dbContainer"

Write-Step "Run verify_schema.sql"
Get-Content $schemaScript -Raw | docker exec -i $dbContainer psql -U postgres -d postgres -v ON_ERROR_STOP=1
if ($LASTEXITCODE -ne 0) { throw "verify_schema.sql failed" }

Write-Step "Run verify_search_guardrail.sql"
Get-Content $guardScript -Raw | docker exec -i $dbContainer psql -U postgres -d postgres -v ON_ERROR_STOP=1
if ($LASTEXITCODE -ne 0) { throw "verify_search_guardrail.sql failed" }

Write-Step "Verification complete"
