$ErrorActionPreference = "Stop"

$functionUrl = "https://vtymfigjtczgeyavdujl.supabase.co/functions/v1/provider-reconciliation"
$body = '{"provider":"imovirtual"}'

# SeguranÃ§a

$maxExecutions = 250
$delaySeconds = 3

$execution = 0
$expectedJobId = $null
$startTime = Get-Date

Write-Host ""
Write-Host "========================================"
Write-Host " OSFlow - Imovirtual Reconciliation"
Write-Host "========================================"
Write-Host ""
Write-Host "MÃ¡ximo de execuÃ§Ãµes: $maxExecutions"
Write-Host "Intervalo entre lotes: $delaySeconds segundos"
Write-Host ""

while ($true) {

$execution++

if ($execution -gt $maxExecutions) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host " LIMITE DE SEGURANÃ‡A ATINGIDO"
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "ExecuÃ§Ãµes realizadas: $($execution - 1)"
    Write-Host "Job: $expectedJobId"
    Write-Host ""
    exit 1
}

Write-Host "----------------------------------------"
Write-Host "ExecuÃ§Ã£o #$execution" -ForegroundColor Cyan
Write-Host "----------------------------------------"

try {

    $result = Invoke-RestMethod `
        -Method Post `
        -Uri $functionUrl `
        -ContentType "application/json" `
        -Body $body

    # Validar resposta bÃ¡sica
    if ($null -eq $result) {
        throw "A funÃ§Ã£o nÃ£o devolveu uma resposta."
    }

    if ($result.success -ne $true) {
        Write-Host ""
        Write-Host "A funÃ§Ã£o devolveu success=false." -ForegroundColor Red
        $result | Format-List
        exit 1
    }

    # Capturar o primeiro jobId
    if ($null -eq $expectedJobId) {

        $expectedJobId = $result.jobId

        Write-Host "Job iniciado/detetado:"
        Write-Host "  $expectedJobId" -ForegroundColor Green

    }
    elseif ($result.jobId -ne $expectedJobId) {

        throw "O jobId mudou inesperadamente. Esperado: $expectedJobId | Recebido: $($result.jobId)"
    }

    # Mostrar progresso
    Write-Host ""
    Write-Host "Job:              $($result.jobId)"
    Write-Host "PÃ¡ginas do lote:  $($result.pagesThisExecution)"
    Write-Host "PÃ¡ginas total:    $($result.pagesProcessed)"
    Write-Host "ConcluÃ­do:        $($result.completed)"

    # Verificar conclusÃ£o
    if ($result.completed -eq $true) {

        $elapsed = (Get-Date) - $startTime

        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host " RECONCILIAÃ‡ÃƒO CONCLUÃDA"
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Job:               $expectedJobId"
        Write-Host "ExecuÃ§Ãµes:         $execution"
        Write-Host "PÃ¡ginas processadas: $($result.pagesProcessed)"
        Write-Host "Tempo decorrido:   $($elapsed.ToString('hh\:mm\:ss'))"
        Write-Host ""

        break
    }

    # Aguardar antes da prÃ³xima invocaÃ§Ã£o
    Write-Host ""
    Write-Host "PrÃ³ximo lote em $delaySeconds segundos..."
    Start-Sleep -Seconds $delaySeconds
    Write-Host ""
}
catch {

    $elapsed = (Get-Date) - $startTime

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host " ERRO NA RECONCILIAÃ‡ÃƒO"
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "ExecuÃ§Ã£o:          $execution"
    Write-Host "Job:               $expectedJobId"
    Write-Host "Tempo decorrido:   $($elapsed.ToString('hh\:mm\:ss'))"
    Write-Host ""
    Write-Host "Erro:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""

    exit 1
}

}
