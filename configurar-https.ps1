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
    [string]$AppName = 'entrelinhas-ui',
    [string]$Hostname = 'editor.byteforge.biz'
)
$ErrorActionPreference = 'Stop'
$domainJson = az staticwebapp hostname show --subscription $Subscription --resource-group $ResourceGroup --name $AppName --hostname $Hostname -o json
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível consultar o domínio no Azure.' }
$domain = $domainJson | ConvertFrom-Json
if ($domain.status -ne 'Ready') {
    throw "Domínio ainda não está pronto: $($domain.status). Confira a validação TXT e o certificado no Azure."
}
$response = Invoke-WebRequest "https://$Hostname/" -TimeoutSec 30
if ($response.StatusCode -ne 200 -or $response.Content -notmatch 'Nosso caderno compartilhado') {
    throw 'O domínio foi validado, mas a interface não passou na verificação HTTPS.'
}
Write-Output "Domínio e HTTPS verificados em https://$Hostname/"
