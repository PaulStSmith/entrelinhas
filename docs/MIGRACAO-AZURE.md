# Consolidação e hospedagem no Azure

## Destino

- Código e publicação: `PaulStSmith/entrelinhas`, branch `main`.
- Interface: Azure Static Web Apps **Free**, `entrelinhas-ui`, East US 2.
- Sinalização: App Service **F1**, `editor-crdt-byteforge`, Canada Central.
- Grupo: `rg-editor-crdt`, assinatura `7e4e57e6-5275-4176-8e17-998e71c8c0db`.
- Endereço público: `https://editor.byteforge.biz/`.
- Destino CNAME: `icy-mushroom-0b351a10f.5.azurestaticapps.net`.

O merge de consolidação incorpora o histórico completo de `editor-distribuido-crdt` até `1514a0a`, mantendo a versão licenciada da aplicação em Entrelinhas e recuperando o DOCX original. O documento Word é um registro histórico; a arquitetura atual está em `ARQUITETURA.md`. O repositório anterior deixa de ser uma fonte de alterações da aplicação.

## Publicação e corte

1. Executar `npm ci`, `npm test`, `npm run build` e `npm run package:server`.
2. Configurar o secret `AZURE_STATIC_WEB_APPS_API_TOKEN` no repositório único. Para a sinalização, criar a identidade gerenciada `entrelinhas-github`, uma credencial federada com emissor `https://token.actions.githubusercontent.com`, subject `repo:PaulStSmith@118175402/entrelinhas@1454689262:ref:refs/heads/main` e audience `api://AzureADTokenExchange`, e conceder Website Contributor somente no recurso App Service. Configurar os identificadores como variables `AZURE_CLIENT_ID`, `AZURE_TENANT_ID` e `AZURE_SUBSCRIPTION_ID`. Nunca colocar tokens em arquivos versionados. Não habilitar autenticação básica do App Service.
3. Publicar a branch `main` e aguardar os workflows de interface e sinalização. Conferir a interface no hostname Azure e o `/health` da sinalização.
4. Adicionar `editor.byteforge.biz` ao Static Web App com validação `dns-txt-token`. Criar o TXT `_dnsauth.editor.byteforge.biz` com o token retornado por `az staticwebapp hostname show`. Esse passo não altera o tráfego atual.
5. Aguardar a validação e a emissão do certificado. Conferir HTTPS no destino Azure usando o hostname público antes do corte, quando possível.
6. Alterar somente o CNAME `editor.byteforge.biz` na Cloudflare, com proxy desativado, para o hostname Azure. Não alterar o domínio principal, os registros de email ou outros subdomínios.
7. Conferir HTTPS, arquivos JS/CSS, edição, sincronização e persistência. Executar `./configurar-https.ps1`.
8. Desativar o workflow de publicação no repositório anterior e indicar o repositório único em seu README. Preservar seu histórico e a última publicação como referência de retorno.

O armazenamento do documento continua nos navegadores. Manter o mesmo esquema HTTPS, hostname, nomes de salas e chaves `entrelinhas-rich-v2-*` preserva a origem IndexedDB. Usar o hostname alternativo do Azure ou o antigo endereço `github.io` abre outra origem e não transfere automaticamente as réplicas existentes.

## Retorno

O CNAME anterior era `paulstsmith.github.io`, DNS-only, TTL 300. Enquanto a última publicação do Pages e seu domínio estiverem preservados, é possível retornar o CNAME a esse destino. Conferir que o Pages ainda possui `editor.byteforge.biz` e certificado válido antes do retorno. Se o Pages tiver sido removido, restaure sua configuração/publicação antes de mudar o DNS.

Para reverter somente a versão da interface Azure, reverta o commit correspondente em `main` e deixe o workflow publicar novamente. Selecione uma revisão que já contenha o workflow Azure. O mesmo vale para a sinalização; se o revert não alterar os caminhos monitorados, execute o workflow manualmente. Nenhuma dessas ações restaura documentos dos participantes, pois não há cópia central.

## Limites de custo

O frontend usa explicitamente o SKU `Free` e não depende de domínio personalizado no App Service. A sinalização permanece no plano F1 existente. Não habilitar Standard, Dedicated, Front Door ou outros serviços pagos como parte desta migração. Quotas gratuitas e ausência de persistência central continuam sendo limitações do projeto.
