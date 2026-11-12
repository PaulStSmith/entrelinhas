# Entrelinhas

Editor WYSIWYG colaborativo distribuído com Tiptap, Yjs e WebRTC. Cada navegador mantém uma réplica CRDT formatada e persiste seu estado no IndexedDB. O servidor Azure encaminha somente mensagens de sinalização para estabelecer as conexões entre participantes.

## Acessar o editor

- **Site:** https://editor.byteforge.biz/
- **Endereço Azure:** https://icy-mushroom-0b351a10f.5.azurestaticapps.net/
- **Saúde da sinalização:** https://editor-crdt-byteforge-gcgzh6bmbcf2eudx.canadacentral-01.azurewebsites.net/health
- **Repositório único (interface e sinalização):** https://github.com/PaulStSmith/entrelinhas

O documento padrão é público e compartilhado por todos os visitantes. Para uma demonstração isolada, use o mesmo parâmetro nos dois dispositivos, por exemplo `?sala=apresentacao`. O nome da sala não é senha nem controle de acesso.

## Executar no Windows

Instale Node.js 22.12 ou superior e execute, na pasta do projeto:

```powershell
.\executar-projeto.ps1
```

O script instala as dependências, compila a interface e inicia a prévia em `http://127.0.0.1:5173`. Ela usa a sinalização já hospedada no Azure. Encerre com Ctrl+C.

Para rodar também a sinalização local, execute `npm start` em outro terminal. Na janela da interface, configure `$env:VITE_SIGNALING_URL = 'ws://localhost:4444'` antes de executar o script. A variável é incorporada durante a compilação. O servidor local precisa de outro terminal porque permanece ativo recebendo conexões.

## Funcionalidades

- Editor WYSIWYG com títulos, negrito, itálico, sublinhado, tachado, listas, citações e blocos de código.
- Abrir arquivos HTML e TXT locais, salvar, salvar como e baixar cópias HTML ou TXT.
- Desfazer e refazer locais, busca e substituição, inclusive em texto com marcas diferentes.
- Edição simultânea com cursores e nomes de participantes.
- Réplica local persistida no IndexedDB, sem documento central autoritativo.
- Simulação de desconexão e combinação das alterações ao reconectar.
- Exportação do conteúdo em texto e cópia do link da sala.
- Contagem de palavras, caracteres e conexões WebRTC.
- Layout adaptável a celulares e navegação por teclado.

O indicador de conexão distingue participantes WebRTC, outras abas locais e edição sem pares conectados. A resposta de `/health` indica apenas disponibilidade HTTP da sinalização, não garante conectividade WebRTC em qualquer rede.

## Abrir e salvar arquivos locais

Use **Abrir arquivo** para selecionar HTML ou texto UTF-8, com limite de 2 MB. O editor pede confirmação antes de substituir o caderno compartilhado. O arquivo original não é alterado ao abrir. Conteúdo importado será compartilhado com os participantes da sala; para trabalhar sozinho, simule a desconexão antes de abrir.

**HTML** preserva os títulos, as listas e as marcas suportadas pelo editor. Scripts, imagens externas, estilos arbitrários e outros elementos não suportados são removidos na importação. **TXT** não preserva formatação. DOCX, PDF e RTF não são formatos de importação deste aplicativo.

No Edge e em navegadores com File System Access, **Salvar** solicita o destino na primeira gravação e reutiliza o arquivo escolhido nas seguintes. **Salvar como** sempre pede outro destino. Abrir um arquivo pelo seletor não concede gravação no original: selecione o mesmo destino ao salvar se quiser atualizá-lo. O indicador mostra alterações posteriores ainda não gravadas no arquivo, incluindo edições remotas.

Nos demais navegadores, salvar baixa uma nova cópia HTML. **Baixar HTML** sempre exporta uma cópia com formatação, sem vincular um arquivo; **Baixar cópia .txt** exporta somente o texto. Cancelar a escolha do destino não altera o vínculo anterior. Uma gravação só é confirmada depois de a escrita e o fechamento do arquivo terminarem.

Atalhos: `Ctrl+O` abre, `Ctrl+S` salva, `Ctrl+Shift+S` salva como, `Ctrl+F` busca, `Ctrl+B` aplica negrito, `Ctrl+I` aplica itálico, `Ctrl+U` sublinha, `Ctrl+Z` desfaz e `Ctrl+Shift+Z` refaz. No macOS, use Command no lugar de Ctrl.

A versão WYSIWYG utiliza salas e armazenamento `entrelinhas-rich-v2-*`, separados da demonstração inicial de texto simples. Não há migração automática do documento anterior; seu estado antigo permanece no IndexedDB de origem.

## Validação

```powershell
npm test
npm run build
```

Os oito testes verificam convergência com inserções e exclusões concorrentes, formatação em XML CRDT, entrega duplicada e fora de ordem, sinalização, JSON inválido, UTF-8, limites de arquivo, falha de escrita, busca entre marcas e sanitização de HTML. Na publicação Azure, duas origens distintas (domínio público e hostname Azure) estabeleceram WebRTC, sincronizaram o documento e combinaram edições offline após reconectar. A recuperação da réplica após recarregar também foi conferida. Testes entre dispositivos em redes físicas diferentes e os diálogos nativos de abertura e gravação ainda precisam de conferência manual.

## Publicação

O repositório `PaulStSmith/entrelinhas` mantém a interface, a sinalização, os testes, os scripts de publicação e a documentação acadêmica. A consolidação preservou o histórico Git e o DOCX original. O repositório antigo foi excluído; toda manutenção e publicação acontece neste repositório.

A interface usa **Azure Static Web Apps Free**, recurso `entrelinhas-ui` em East US 2. Esse plano inclui domínio personalizado e certificado HTTPS gerenciado. O workflow `.github/workflows/azure-ui.yml` instala as dependências travadas, executa os testes, compila e publica `dist` em cada push para `main`. Pull requests executam os mesmos testes e compilação, sem publicar nem acessar credenciais de produção.

O domínio `editor.byteforge.biz` usa um CNAME DNS direto, sem proxy, na Cloudflare para `icy-mushroom-0b351a10f.5.azurestaticapps.net`. O TXT `_dnsauth.editor.byteforge.biz` valida a propriedade no Azure. `configurar-https.ps1` confere o estado do domínio e a resposta HTTPS. A configuração não altera o domínio principal de `byteforge.biz`.

O endereço público é `https://editor.byteforge.biz`, com o parâmetro `sala` e as chaves de armazenamento `entrelinhas-rich-v2-*`. A migração preservou essa origem e suas chaves IndexedDB. A URL alternativa do Azure é outra origem e possui armazenamento local separado; não deve substituir o endereço público nos links compartilhados.

O servidor continua no Azure App Service Linux **Free F1**, recurso `editor-crdt-byteforge` em Canada Central. Ambos os recursos ficam em `rg-editor-crdt`, assinatura `Azure subscription 1` (`7e4e57e6-5275-4176-8e17-998e71c8c0db`). Os scripts informam a assinatura explicitamente para não usar outra assinatura ativa por engano.

O workflow `.github/workflows/azure-server.yml` testa e publica a sinalização quando mudam o servidor, as dependências ou seu empacotador. `npm run package:server` gera somente `server/index.js`, `ws` e um manifesto mínimo em `.azure-deploy/staging`. A interface, os documentos acadêmicos e as credenciais não entram nesse pacote. Após publicar, o workflow confere `/health`. Os dois workflows também aceitam execução manual em Actions.

Autenticação de publicação, configurada em GitHub Actions:

- `AZURE_STATIC_WEB_APPS_API_TOKEN`: token de implantação do recurso `entrelinhas-ui`.
- Variables `AZURE_CLIENT_ID`, `AZURE_TENANT_ID` e `AZURE_SUBSCRIPTION_ID`: identificadores da identidade gerenciada `entrelinhas-github`. O backend usa OIDC, sem senha armazenada. A federação aceita somente `repo:PaulStSmith@118175402/entrelinhas@1454689262:ref:refs/heads/main`, com papel Website Contributor limitado ao recurso `editor-crdt-byteforge`. A autenticação básica de publicação permanece desativada.

Para publicar manualmente a sinalização, depois de `npm ci` e `az login`, execute:

```powershell
.\publicar-servidor.ps1
```

O script usa o mesmo empacotador do workflow. Não cria planos pagos ou recursos adicionais. O frontend não usa o domínio personalizado do App Service; isso exigiria um plano pago.

Para recriar apenas o recurso gratuito da interface, sem integração GitHub automática:

```powershell
az staticwebapp create --subscription 7e4e57e6-5275-4176-8e17-998e71c8c0db --resource-group rg-editor-crdt --name entrelinhas-ui --location eastus2 --sku Free
```

Um recurso recriado recebe outro hostname e token: atualize o secret, valide o domínio por TXT e confira a interface antes de trocar o CNAME. Consulte [docs/AZURE.md](docs/AZURE.md) para configuração, operação e recuperação no Azure.

## Limitações

- F1 limita a CPU diária e o número de conexões WebSocket. A sinalização mantém uma conexão por instância do editor. Não é uma hospedagem para grande público.
- O aplicativo já aberto continua editável offline; a abertura inicial e a recarga offline não são garantidas, pois não há service worker.
- Não há persistência central. Um novo dispositivo só recupera o conteúdo se alcançar uma réplica que o possua.
- Limpar os dados do navegador pode apagar alterações locais ainda não compartilhadas. Baixe cópias importantes.
- WebRTC pode falhar em redes restritivas. Não foi provisionado TURN; validação entre redes físicas diferentes ainda é necessária.
- A sala pública não tem autenticação, moderação ou limite global de tamanho do documento. Qualquer participante pode modificar o texto.

## Documentação acadêmica

A fundamentação e a arquitetura implementada estão em [docs/ARQUITETURA.md](docs/ARQUITETURA.md). A configuração operacional está em [docs/AZURE.md](docs/AZURE.md).

O [documento Word](Documentacao_Editor_Colaborativo_CRDT.docx) reúne a arquitetura implementada e a operação final no Azure, incluindo domínio, HTTPS, publicação e recuperação. Para regenerá-lo a partir dos fontes Markdown, use `gerar_documentacao.py` com python-docx e Pillow. A proposta original permanece no histórico Git.

## Licença

Copyright (c) 2026 Paulo Santos. Código disponibilizado sob a licença MIT; consulte [LICENSE](LICENSE).
