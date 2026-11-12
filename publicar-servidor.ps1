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
az webapp deploy --resource-group rg-editor-crdt --name editor-crdt-byteforge --src-path $archivePath --type zip --output none
if ($LASTEXITCODE -ne 0) { throw 'Falha na publicação' }
