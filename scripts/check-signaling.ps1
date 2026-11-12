# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Paulo Santos
param(
    [string]$HealthUrl = 'https://editor-crdt-byteforge-gcgzh6bmbcf2eudx.canadacentral-01.azurewebsites.net/health'
)
$ErrorActionPreference = 'Stop'
for ($attempt = 0; $attempt -lt 15; $attempt++) {
    try {
        $health = Invoke-RestMethod -Uri $HealthUrl -TimeoutSec 10
        if ($health.service -eq 'entrelinhas-signaling' -and $health.status -eq 'ok') {
            Write-Host 'Sinalização respondendo em /health.' -ForegroundColor Green
            return
        }
    } catch { Write-Host 'Aguardando inicialização do servidor...' }
    Start-Sleep -Seconds 2
}
throw 'A sinalização não respondeu corretamente. Confira os logs do Azure.'
