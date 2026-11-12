$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path -LiteralPath 'node_modules')) { npm ci; if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar dependências' } }
Write-Host 'Editor local: http://127.0.0.1:5173 (sinalização hospedada no Azure)' -ForegroundColor Green
npm run dev
