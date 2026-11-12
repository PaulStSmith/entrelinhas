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

param(
    [string]$Subscription = '7e4e57e6-5275-4176-8e17-998e71c8c0db',
    [string]$ResourceGroup = 'rg-editor-crdt',
    [string]$AppName = 'editor-crdt-byteforge'
)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
# Empacota somente a sinalização e sua dependência JavaScript, sem credenciais.
$stagingPath = Join-Path $PSScriptRoot '.azure-deploy\staging'
node scripts/package-server.mjs
if ($LASTEXITCODE -ne 0) { throw 'Falha ao empacotar sinalização' }
$archivePath = Join-Path $PSScriptRoot '.azure-deploy\server.zip'
Compress-Archive -Path "$stagingPath\*" -DestinationPath $archivePath -Force
az webapp config set --subscription $Subscription --resource-group $ResourceGroup --name $AppName --startup-file 'node server/index.js' --output none
if ($LASTEXITCODE -ne 0) { throw 'Falha ao configurar inicialização' }
az webapp deploy --subscription $Subscription --resource-group $ResourceGroup --name $AppName --src-path $archivePath --type zip --track-status false --output none
if ($LASTEXITCODE -ne 0) { throw 'Falha na publicação' }
# No F1, o rastreamento do CLI pode expirar mesmo após o startup bem-sucedido.
# Confere a resposta real da aplicação depois do upload concluído pelo Kudu.
$siteHostname = az webapp show --subscription $Subscription --resource-group $ResourceGroup --name $AppName --query defaultHostName -o tsv
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível consultar o endereço da sinalização' }
& "$PSScriptRoot/scripts/check-signaling.ps1" -HealthUrl "https://$siteHostname/health"
