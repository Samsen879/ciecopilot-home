param(
    [int]$Workers = 4,
    [string]$Status = "pending",
    [int]$MaxJobs = 0,
    [switch]$WithSpotCheck,
    [switch]$RecoverErrors = $true,
    [switch]$SyncV0 = $true
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root

if (-not $env:DATABASE_URL) {
    $env:DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
}

$cmd = @(
    "python", "scripts/vlm/batch_process_v0.py",
    "--workers", "$Workers",
    "--status", "$Status"
)

if ($MaxJobs -gt 0) {
    $cmd += @("--max-jobs", "$MaxJobs")
}

Write-Host "Running:" ($cmd -join " ")
& $cmd[0] $cmd[1..($cmd.Length - 1)]

if ($LASTEXITCODE -ne 0) {
    throw "Batch publish failed with exit code $LASTEXITCODE"
}

$post = @("python", "scripts/vlm/run_production_pipeline_v1.py")
if ($RecoverErrors) { $post += "--recover-errors" }
if ($SyncV0) { $post += "--sync-v0" }
if ($WithSpotCheck) { $post += "--with-spot-check" }
$post += @("--spot-json", "docs/reports/vlm_qc_spot_check_v1.json")
Write-Host "Running post-pipeline:" ($post -join " ")
& $post[0] $post[1..($post.Length - 1)]
if ($LASTEXITCODE -ne 0) {
    throw "Post pipeline failed with exit code $LASTEXITCODE"
}

Write-Host "Done. Gate reports:"
Write-Host "  docs/reports/vlm_production_gate_v1.md"
Write-Host "  docs/reports/vlm_production_gate_prod_v1.md"
