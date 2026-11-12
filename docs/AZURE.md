# Operação do Entrelinhas no Azure

## Recursos em produção

| Componente | Recurso | Plano | Região |
| --- | --- | --- | --- |
| Interface | `entrelinhas-ui` — Azure Static Web Apps | Free | East US 2 |
| Sinalização WebSocket | `editor-crdt-byteforge` — App Service Linux | F1 | Canada Central |
| Identidade de publicação | `entrelinhas-github` — identidade gerenciada | Sem senha de publicação | Canada Central |

Os recursos ficam em `rg-editor-crdt`, na assinatura `Azure subscription 1` (`7e4e57e6-5275-4176-8e17-998e71c8c0db`). Os scripts passam a assinatura explicitamente.

- [Site público](https://editor.byteforge.biz/)
- [Hostname Azure da interface](https://icy-mushroom-0b351a10f.5.azurestaticapps.net/)
- [Saúde da sinalização](https://editor-crdt-byteforge-gcgzh6bmbcf2eudx.canadacentral-01.azurewebsites.net/health)
- [Repositório único](https://github.com/PaulStSmith/entrelinhas)

O repositório antigo foi excluído após a consolidação. Seu histórico até `1514a0a` foi incorporado pelo merge `04b480e`, junto com o DOCX original. Não existe publicação Pages nem retorno disponível por aquele repositório. Interface, servidor e documentação são mantidos aqui.

## Domínio e HTTPS

O registro Cloudflare `editor.byteforge.biz` é um CNAME para `icy-mushroom-0b351a10f.5.azurestaticapps.net`, sem proxy, TTL 300. O TXT `_dnsauth.editor.byteforge.biz` valida a propriedade no Static Web App. O Azure gerencia o certificado HTTPS do domínio personalizado no plano Free.

Para conferir o domínio, com o Azure CLI autenticado:

```powershell
./configurar-https.ps1
./scripts/check-signaling.ps1
```

O primeiro comando exige estado `Ready` no Azure e verifica a interface por HTTPS. O segundo verifica a identidade do serviço e `status: ok` em `/health`. Essa resposta confirma saúde HTTP, sem garantir conectividade WebRTC em todas as redes.

Mantenha `https://editor.byteforge.biz`, o parâmetro `sala` e as chaves `entrelinhas-rich-v2-*`. O armazenamento IndexedDB pertence à origem do navegador. O hostname alternativo do Azure usa armazenamento separado; abrir esse endereço não transfere automaticamente os documentos do domínio público.

## Publicação automática

O workflow [azure-ui.yml](../.github/workflows/azure-ui.yml) instala as dependências do lockfile, executa os testes, compila e publica `dist` em cada push para `main`. Pull requests executam testes e compilação sem publicar. O secret `AZURE_STATIC_WEB_APPS_API_TOKEN` contém o token de implantação de `entrelinhas-ui`.

O workflow [azure-server.yml](../.github/workflows/azure-server.yml) publica em pushes para `main` que alteram o servidor, seu empacotador, os manifests de dependências ou o próprio workflow. Ele testa, gera `.azure-deploy/staging`, publica no App Service e confere `/health`. O pacote contém somente `server/index.js`, `ws` e um manifesto mínimo. Alterações apenas em `scripts/check-signaling.ps1` exigem execução manual desse workflow para conferir o novo verificador em produção.

Ambos os workflows também aceitam execução manual em GitHub Actions. Para uma nova versão, aguarde a conclusão do workflow correspondente antes de considerar a publicação finalizada.

### Identidade da sinalização

O backend usa `azure/login` com OpenID Connect, sem perfil de publicação nem senha armazenada. A autenticação básica do App Service permanece desativada.

- Identidade gerenciada: `entrelinhas-github`.
- Credencial federada: `github-main`.
- Emissor: `https://token.actions.githubusercontent.com`.
- Subject: `repo:PaulStSmith@118175402/entrelinhas@1454689262:ref:refs/heads/main`.
- Audience: `api://AzureADTokenExchange`.
- Papel: Website Contributor, limitado ao recurso App Service `editor-crdt-byteforge`.
- Variables do repositório: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID` e `AZURE_SUBSCRIPTION_ID`.

O subject inclui os IDs emitidos pelo GitHub. Se o repositório for renomeado ou recriado, confira o subject efetivo do token e ajuste a federação. Nunca versione tokens ou perfis de publicação.

## Publicação manual e recuperação

Para publicar a sinalização localmente, com Node.js e Azure CLI autenticados:

```powershell
npm ci
npm test
./publicar-servidor.ps1
```

O script usa o mesmo empacotador do workflow, configura `node server/index.js`, envia o ZIP e confere a saúde. Para repetir apenas a interface, execute o workflow `Publicar interface no Azure` em `main`.

Para reverter uma versão, use `git revert` no commit correspondente e publique o revert em `main`. Mantenha os workflows Azure. Se a reversão não alterar os caminhos monitorados pelo workflow do servidor, execute-o manualmente. Confira o domínio HTTPS e a sinalização depois da publicação. O procedimento de recuperação utiliza o Azure; não depende do serviço de hospedagem anterior.

Se for necessário recriar o recurso da interface:

```powershell
az staticwebapp create --subscription 7e4e57e6-5275-4176-8e17-998e71c8c0db --resource-group rg-editor-crdt --name entrelinhas-ui --location eastus2 --sku Free
```

O recurso recriado recebe outro hostname e token. Atualize o secret no GitHub, publique a interface e valide o domínio com `dns-txt-token`. Use o token retornado por `az staticwebapp hostname show` no TXT `_dnsauth.editor.byteforge.biz`. Aguarde o certificado e verifique HTTPS antes de trocar o CNAME. Atualize o hostname nesta documentação. Não altere o domínio principal, os registros de email ou outros subdomínios.

Reverter código ou recriar hospedagem não restaura documentos dos participantes: não há cópia central. Os dados continuam nas réplicas dos navegadores; baixe cópias dos documentos importantes.

## Custos e limitações

A interface usa Static Web Apps Free, com domínio personalizado e HTTPS. A sinalização usa o App Service F1 existente, sem domínio personalizado nesse serviço. Não é necessário habilitar Standard, Dedicated, Front Door ou outro serviço pago para esta configuração. Quotas dos planos gratuitos continuam aplicáveis.

Não há autenticação das salas, persistência central, TURN ou service worker. Novos dispositivos dependem de uma réplica acessível, redes restritivas podem impedir WebRTC, e a abertura inicial ou recarga offline não é garantida.

## Verificações da publicação

Na conclusão da migração em 2026-11-12:

- Os oito testes, a compilação de produção e os dois workflows Azure passaram. O pacote mínimo da sinalização respondeu ao teste HTTP local.
- O domínio atingiu `Ready`, e certificado, interface HTTPS e DNS público foram verificados.
- Duas origens distintas, domínio público e hostname Azure, estabeleceram WebRTC, sincronizaram o documento e convergiram após edições concorrentes offline. Os nomes dos cursores foram excluídos da comparação do conteúdo.
- A réplica local foi recuperada após recarregar a interface Azure.
- Os SKUs confirmados foram Free para a interface e F1 para a sinalização. A origem pública, os nomes de salas e as chaves IndexedDB foram preservados.

Os testes entre dispositivos em redes físicas diferentes e os diálogos nativos de abertura e gravação ainda precisam de conferência manual.
