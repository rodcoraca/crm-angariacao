param(
    [switch]$Plan
)

$ErrorActionPreference = "Stop"
$repositoryRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$statePath = Join-Path $repositoryRoot "docs\OSFLOW_DEPLOY_STATE.json"
$baselinePath = Join-Path $repositoryRoot "docs\OSFLOW_DEPLOY_BASELINE.md"

if (-not (Test-Path $statePath)) {
    throw "Deploy state not found: $statePath"
}

if (-not (Test-Path $baselinePath)) {
    throw "Deploy baseline not found: $baselinePath"
}

$state = Get-Content -Raw $statePath | ConvertFrom-Json
$currentCommit = (git -C $repositoryRoot rev-parse HEAD).Trim()
$currentBranch = (git -C $repositoryRoot branch --show-current).Trim()
$worktree = @(git -C $repositoryRoot status --short)
$migrations = @(Get-ChildItem (Join-Path $repositoryRoot "supabase\migrations") -File | Sort-Object Name | Select-Object -ExpandProperty Name)
$baselineMigration = if ($state.last_deployed_migration) {
    $state.last_deployed_migration
} else {
    $state.last_remote_migration
}
$baselineIndex = -1

if ($baselineMigration) {
    for ($index = 0; $index -lt $migrations.Count; $index++) {
        if ($migrations[$index] -like "$baselineMigration*") {
            $baselineIndex = $index
            break
        }
    }
}

$delta = if ($baselineIndex -ge 0) {
    @($migrations | Select-Object -Skip ($baselineIndex + 1))
} else {
    @($migrations)
}

Write-Output "BASELINE ATUAL"
Write-Output "  ID: $($state.baseline_id)"
Write-Output "  Estado: $($state.status)"
Write-Output "  Commit do baseline: $($state.git_commit)"
Write-Output "  Commit atual: $currentCommit"
Write-Output "  Branch atual: $currentBranch"
Write-Output "  Ultima migration remota registada: $baselineMigration"
Write-Output "  Ultima migration efetivamente deployada: $($state.last_deployed_migration)"
Write-Output "  Delta local de migrations: $($delta.Count) ficheiro(s)"
$delta | ForEach-Object { Write-Output "    - $_" }
Write-Output "  Worktree: $($worktree.Count) alteracao(oes)"

if ($Plan) {
    Write-Output ""
    Write-Output "DEPLOY PLAN STATUS"
    if (($state.status -eq "validated" -or $state.status -eq "deployed_with_exceptions") -and $worktree.Count -eq 0) {
        Write-Output "  READY"
    } else {
        Write-Output "  BLOCKED"
        Write-Output "  Motivo: o baseline esta $($state.status) e/ou o worktree tem alteracoes locais."
    }
}
