<#
=============================================================================
Projeto: Arquitetura Reativa - Entrelinhas
Trabalho acadêmico desenvolvido individualmente.
Autor: Paulo Santos

Copyright (c) 2026 Paulo Santos

-----------------------------------------------------------------------------

SPDX-License-Identifier: MIT

Licenciado sob a licença MIT. Consulte o arquivo LICENSE na raiz do projeto
para o texto completo da licença e o aviso de copyright.

São permitidos o uso, a cópia, a modificação e a redistribuição, inclusive
para fins comerciais, mediante a preservação dos avisos exigidos pela MIT.
Software fornecido "COMO ESTÁ", sem garantias, nos termos da licença.

Nota sobre copyleft: a MIT é uma licença permissiva; trabalhos derivados
não precisam adotar a mesma licença.

=============================================================================
#>

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
# Empacota somente a sinalização e sua dependência JavaScript, sem credenciais.
$stagingPath = Join-Path $PSScriptRoot '.azure-deploy\staging'
New-Item -ItemType Directory -Force -Path "$stagingPath\server", "$stagingPath\node_modules" | Out-Null
Copy-Item -LiteralPath 'server\index.js' -Destination "$stagingPath\server\index.js" -Force
Copy-Item -LiteralPath 'node_modules\ws' -Destination "$stagingPath\node_modules" -Recurse -Force
$wsVersion = (Get-Content -LiteralPath 'node_modules\ws\package.json' -Raw | ConvertFrom-Json).version
@{ name = 'entrelinhas-signaling'; version = '1.0.0'; private = $true; type = 'module'; scripts = @{ start = 'node server/index.js' }; dependencies = @{ ws = $wsVersion } } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath "$stagingPath\package.json" -Encoding utf8
$archivePath = Join-Path $PSScriptRoot '.azure-deploy\server.zip'
Compress-Archive -Path "$stagingPath\*" -DestinationPath $archivePath -Force
az webapp config set --resource-group rg-editor-crdt --name editor-crdt-byteforge --startup-file 'node server/index.js' --output none
if ($LASTEXITCODE -ne 0) { throw 'Falha ao configurar inicialização' }
az webapp deploy --resource-group rg-editor-crdt --name editor-crdt-byteforge --src-path $archivePath --type zip --track-status false --output none
if ($LASTEXITCODE -ne 0) { throw 'Falha na publicação' }
# No F1, o rastreamento do CLI pode expirar mesmo após o startup bem-sucedido.
# Confere a resposta real da aplicação depois do upload concluído pelo Kudu.
$healthUrl = 'https://editor-crdt-byteforge-gcgzh6bmbcf2eudx.canadacentral-01.azurewebsites.net/health'
for ($attempt = 0; $attempt -lt 15; $attempt++) {
    try {
        $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 10
        if ($health.service -eq 'entrelinhas-signaling' -and $health.status -eq 'ok') {
            Write-Host 'Servidor publicado e respondendo em /health.' -ForegroundColor Green
            return
        }
    } catch { Write-Host 'Aguardando inicialização do servidor...' }
    Start-Sleep -Seconds 2
}
throw 'O pacote foi enviado, mas /health não respondeu corretamente. Confira os logs do Azure.'
