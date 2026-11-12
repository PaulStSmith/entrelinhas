$ErrorActionPreference = 'Continue'
# Usa o login existente do gh. Não cria ou armazena novas credenciais.
$repo = 'PaulStSmith/editor-distribuido-crdt'
for ($attempt = 1; $attempt -le 60; $attempt++) {
    $domain = gh api "repos/$repo/pages" --jq '.cname'
    if ($LASTEXITCODE -ne 0) { throw 'Não foi possível consultar o GitHub Pages.' }
    if ($domain -ne 'editor.byteforge.biz') { throw 'O domínio foi alterado; a configuração foi interrompida.' }
    $result = gh api "repos/$repo/pages" -X PUT -F https_enforced=true 2>&1
    if ($LASTEXITCODE -eq 0) {
        $response = Invoke-WebRequest 'https://editor.byteforge.biz/' -TimeoutSec 30 -ErrorAction Stop
        if ($response.StatusCode -ne 200 -or $response.Content -notmatch 'Nosso caderno compartilhado') { throw 'HTTPS habilitado, mas a página não passou na verificação.' }
        Write-Output 'HTTPS habilitado e editor verificado em https://editor.byteforge.biz/'
        return
    }
    if (($result -join ' ') -match 'HTTP (401|403|404)' -and ($result -join ' ') -notmatch 'certificate does not exist yet') { throw ($result -join ' ') }
    Write-Output "Certificado ainda indisponível. Tentativa $attempt de 60."
    Start-Sleep -Seconds 60
}
throw 'O GitHub ainda não liberou o certificado. Consulte Settings > Pages e execute novamente este script.'
