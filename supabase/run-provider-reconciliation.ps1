$ErrorActionPreference = "Stop"

$functionUrl = "https://vtymfigjtczgeyavdujl.supabase.co/functions/v1/provider-reconciliation"
$body = '{"provider":"imovirtual"}'

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
Write-Host "Maximo de execucoes: $maxExecutions"
Write-Host "Intervalo entre lotes: $delaySeconds segundos"
Write-Host ""

while ($true) {

    $execution++

    if ($execution -gt $maxExecutions) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Yellow
        Write-Host " LIMITE DE SEGURANCA ATINGIDO"
        Write-Host "========================================" -ForegroundColor Yellow
        Write-Host "Execucoes realizadas: $($execution - 1)"
        Write-Host "Job: $expectedJobId"
        Write-Host ""
        exit 1
    }

    Write-Host "----------------------------------------"
    Write-Host "Execucao #$execution" -ForegroundColor Cyan
    Write-Host "----------------------------------------"

    try {

        $result = Invoke-RestMethod -Method Post -Uri $functionUrl -ContentType "application/json" -Body $body

        if ($null -eq $result) {
            throw "A funcao nao devolveu uma resposta."
        }

        if ($result.success -ne $true) {
            Write-Host ""
            Write-Host "A funcao devolveu success=false." -ForegroundColor Red
            $result | Format-List
            exit 1
        }

        if ($null -eq $expectedJobId) {

            $expectedJobId = $result.jobId

            Write-Host "Job detetado:"
            Write-Host "  $expectedJobId" -ForegroundColor Green

        }
        elseif ($result.jobId -ne $expectedJobId) {

            throw "O jobId mudou inesperadamente. Esperado: $expectedJobId | Recebido: $($result.jobId)"
        }

        Write-Host ""
        Write-Host "Job:               $($result.jobId)"
        Write-Host "Paginas do lote:   $($result.pagesThisExecution)"
        Write-Host "Paginas total:     $($result.pagesProcessed)"
        Write-Host "Concluido:         $($result.completed)"

        if ($result.completed -eq $true) {

            $elapsed = (Get-Date) - $startTime

            Write-Host ""
            Write-Host "========================================" -ForegroundColor Green
            Write-Host " RECONCILIACAO CONCLUIDA"
            Write-Host "========================================" -ForegroundColor Green
            Write-Host ""
            Write-Host "Job:                 $expectedJobId"
            Write-Host "Execucoes:           $execution"
            Write-Host "Paginas processadas: $($result.pagesProcessed)"
            Write-Host "Tempo decorrido:     $($elapsed.ToString('hh\:mm\:ss'))"
            Write-Host ""

            break
        }

        Write-Host ""
        Write-Host "Proximo lote em $delaySeconds segundos..."
        Start-Sleep -Seconds $delaySeconds
        Write-Host ""
    }
    catch {

        $elapsed = (Get-Date) - $startTime

        Write-Host ""
        Write-Host "========================================" -ForegroundColor Red
        Write-Host " ERRO NA RECONCILIACAO"
        Write-Host "========================================" -ForegroundColor Red
        Write-Host ""
        Write-Host "Execucao:        $execution"
        Write-Host "Job:             $expectedJobId"
        Write-Host "Tempo decorrido: $($elapsed.ToString('hh\:mm\:ss'))"
        Write-Host ""
        Write-Host "Erro:" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        Write-Host ""

        exit 1
    }
}