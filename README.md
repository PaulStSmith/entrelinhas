# Entrelinhas

[English](#english) · [Português](#portugues) · [Español](#espanol) · [Français](#francais)

<a id="english"></a>

## English

A distributed collaborative WYSIWYG editor built with Tiptap, Yjs, and WebRTC. Each browser keeps a formatted CRDT replica and persists its state in IndexedDB. The Azure server forwards only signaling messages to establish connections between participants.

### Open the editor

- **Website:** https://editor.byteforge.biz/
- **Azure address:** https://icy-mushroom-0b351a10f.5.azurestaticapps.net/
- **Signaling health:** https://editor-crdt-byteforge-gcgzh6bmbcf2eudx.canadacentral-01.azurewebsites.net/health
- **Unified repository (UI and signaling):** https://github.com/PaulStSmith/entrelinhas

The default document is public and shared by all visitors. For an isolated demonstration, use the same parameter on both devices, such as `?sala=apresentacao`. A room name is neither a password nor access control.

### Run on Windows

Install Node.js 22.12 or later and run this from the project directory:

```powershell
.\executar-projeto.ps1
```

The script installs dependencies, builds the UI, and starts the preview at `http://127.0.0.1:5173`. It uses the signaling service already hosted on Azure. Stop it with Ctrl+C.

To run signaling locally as well, run `npm start` in another terminal. In the UI terminal, set `$env:VITE_SIGNALING_URL = 'ws://localhost:4444'` before running the script. This variable is embedded at build time. The local server needs its own terminal because it stays running to receive connections.

### Features

- Local library for creating, naming, duplicating, filtering, and reopening documents.
- Automatic and manual version history, previews, and recovery into a separate document.
- Print preview and PDF export through the browser's print dialog.
- WYSIWYG editing with headings, bold, italic, underline, strikethrough, lists, quotes, and code blocks.
- Open local HTML and TXT files; save, save as, and download HTML or TXT copies.
- Local undo/redo and find/replace, including text spanning different formatting marks.
- Simultaneous editing with participant cursors and names.
- Local IndexedDB persistence, without a central authoritative document.
- Simulated disconnection and merging changes on reconnection.
- Plain-text export and room-link copying.
- Word, character, and WebRTC connection counts.
- Responsive layout and keyboard navigation.

The connection indicator distinguishes WebRTC participants, other local tabs, and editing without connected peers. `/health` indicates only HTTP availability of signaling; it does not guarantee WebRTC connectivity on every network.

### Writing interface

The editor opens directly in the document. **File** contains opening, Save as, downloads, and printing. **New document**, **Save**, and **Download** are visible in the toolbar. **Document** contains renaming, duplication, and manual versions. **History**, **My documents**, and **Copy link** are accessible from the header. Participant names and simulated disconnection are under **Collaboration**.

The formatting bar stays visible while scrolling. On small screens it scrolls horizontally to leave room for writing. Menus close when you choose an action, click outside, or press Escape. Long filenames are shortened in the header; hover to see the complete text.

The theme button switches between light and dark. The preference stays in this browser; before you choose, the editor follows the system theme. Printing uses white paper regardless of the editor theme.

#### Language

The top-right flag selector offers **English**, **Português**, **Español**, and **Français**, with accessible names beside SVG flags. Without a manual choice, the editor uses the first supported language in the browser's ordered list. Regional variants such as `en-US`, `pt-PT`, `es-MX`, and `fr-CA` use their language's translation; English is the fallback.

A manual choice is stored as `entrelinhas-language`. **Use browser language** removes it and restores automatic detection. Switching does not reload the editor and preserves content, selection, custom document names, participant names, links, and rooms. It changes interface text, messages, tooltips, and date/number formats; it does not translate documents. Default titles, including “Our shared notebook” and untitled documents, follow the selected language. Custom names stay unchanged. Different language preferences on other devices do not affect collaboration.

Translations are in `src/messages.js`; selection and interface updates are in `src/i18n.js`. No external translation service is used. Tests cover static text and accessible attributes, parameters in all four translations, regional detection, stored preferences, and content preservation during switching.

### Documents and local history

Open **My documents** to create a named room, filter the list, and reopen documents. **Rename** changes the name only in this browser; the room link stays the same. **Duplicate** creates another room with the current content and formatting. Earlier room replicas also appear when the browser supports IndexedDB database enumeration; otherwise, open a room's link to register it in the library.

Use the link icon beside a name to copy a document's address without opening it. Use the pencil to rename any document directly in **My documents**. Link, pencil, and trash buttons have tooltips in the selected language. Renaming preserves the link and content.

The trashcan removes an entry and its local history after confirmation. It does not change the original file or other participants' copies. The local replica is preserved; opening the link again adds the document back. Opening a removed file again creates a new entry.

The library and names belong to this origin and browser. A new room receives a random identifier, but has no password or access control. A link recipient must reach a connected replica to receive its content. There is no central document list.

**History** saves changes every 30 seconds while editing, and on opening, before switching documents, and before importing a file. **Save version now** creates a manual checkpoint. Content identical to the latest version does not create another entry. Up to 20 versions are retained per document, with a total limit of 20 MB; older versions are removed according to those limits. The indicator shows the latest saved version or a storage failure.

Select a version to preview it, then use **Restore as new document**. Recovery opens another room and preserves the current shared document. If the previous version cannot be saved before opening a file, navigation stops and the current document is preserved. Download an HTML copy before trying again.

Local history is not an external backup: clearing browser data removes the library, versions, and replicas. Edits made in the final seconds before abruptly closing a tab may not have a checkpoint, although normal replica persistence continues to work.

### Print and save PDF

Use **Print / PDF** for a clean preview with the document name and current formatting. **Print / save PDF** opens the browser dialog, where you can choose **Save as PDF** or a printer. The default layout is A4 with 18 mm margins, without tools, participants, or cursors. Final pagination, paper, margins, and headers are controlled by the browser. Printing from the browser menu also prepares the current document.

### Open and save local files

**Open file** accepts HTML or UTF-8 text up to 2 MB. Each file automatically opens as a separate entry in **My documents**, named after the file, without replacing the current notebook. Reopening the same filename and content returns to the existing document, preserving editor changes and its chosen name. A different name or content creates another entry. Identity uses a local SHA-256 of the filename and bytes; modification dates do not affect it. The original file is unchanged. The list and matching information stay in this browser and origin; clearing browser data removes the association. Each document has its own collaboration link.

**HTML** keeps supported headings, lists, and formatting. Scripts, external images, arbitrary styles, and unsupported elements are removed on import. **TXT** does not preserve formatting. DOCX, PDF, and RTF cannot be imported.

**New document**, beside Save and Download, immediately creates and opens a blank entry in **My documents**, with a default name in the selected language, while preserving the current document.

**Save** adds or restores the current document in **My documents** and saves a local version without opening a file picker. **Download** exports a formatted HTML copy. In Edge and browsers with File System Access, **Save as** writes a copy to your computer and always asks for a destination. Opening a file does not grant permission to overwrite the original: choose the same destination in **Save as** if you want to update it. The indicator shows later changes not yet written to the file, including remote edits.

In other browsers, **Save as** downloads a new HTML copy. **Download HTML** always exports a formatted copy without linking a file; **Download .txt copy** exports plain text. Cancelling the destination picker keeps the previous association. Saving is confirmed only after writing and closing the file succeeds.

Shortcuts: `Ctrl+O` opens, `Ctrl+S` saves to My documents, `Ctrl+Shift+S` saves as, `Ctrl+F` finds, `Ctrl+B` applies bold, `Ctrl+I` italic, `Ctrl+U` underline, `Ctrl+Z` undo, and `Ctrl+Shift+Z` redo. On macOS, use Command instead of Ctrl.

The WYSIWYG version uses `entrelinhas-rich-v2-*` rooms and storage, separate from the original plain-text demonstration. There is no automatic migration of that earlier document; its old state remains in the origin's IndexedDB.

### Validation

```powershell
npm test
npm run build
```

The 29 tests cover concurrent insertion/deletion convergence, XML CRDT formatting, duplicate and out-of-order delivery, signaling, invalid JSON, UTF-8, file limits, write failures, search, sanitization, local library, history retention and atomicity, copy recovery, internationalization, and Analytics isolation. On Azure, two distinct origins (public domain and Azure hostname) established WebRTC, synchronized the document, and merged offline changes after reconnecting. Reload recovery was also checked. Library creation, renaming, duplication, recovery without changing the source, and print preview were checked in the browser. All four interface languages were checked, including reload persistence, localized history, and the menu at 320 px. Tests between devices on different physical networks and native open/save/PDF dialogs still require manual checking.

### Deployment

`PaulStSmith/entrelinhas` contains the UI, signaling, tests, deployment scripts, and academic documentation. Consolidation preserved Git history and the original DOCX. The old repository was deleted; all maintenance and deployment use this repository.

The frontend uses **Azure Static Web Apps Free**, resource `entrelinhas-ui` in East US 2, including a custom domain and managed HTTPS certificate. `.github/workflows/azure-ui.yml` installs locked dependencies, runs tests, builds, and deploys `dist` on every push to `main`. Pull requests run the same tests and build without deploying or accessing production credentials.

`editor.byteforge.biz` uses a direct, unproxied Cloudflare DNS CNAME to `icy-mushroom-0b351a10f.5.azurestaticapps.net`. TXT `_dnsauth.editor.byteforge.biz` validates ownership in Azure. `configurar-https.ps1` checks domain status and the HTTPS response. This does not change the main `byteforge.biz` domain.

The public address is `https://editor.byteforge.biz`, with the `sala` parameter and `entrelinhas-rich-v2-*` storage keys. Migration preserved this origin and its IndexedDB keys. The alternate Azure address is a different origin with separate local storage; do not substitute it in shared links.

Signaling runs on Azure App Service Linux **Free F1**, resource `editor-crdt-byteforge` in Canada Central. Both resources are in `rg-editor-crdt`, subscription `Azure subscription 1` (`7e4e57e6-5275-4176-8e17-998e71c8c0db`). Scripts explicitly specify the subscription to avoid accidentally using another active subscription.

`.github/workflows/azure-server.yml` tests and deploys signaling when server code, dependencies, or its packager change. `npm run package:server` packages only `server/index.js`, `ws`, and a minimal manifest into `.azure-deploy/staging`. UI, academic documents, and credentials are excluded. After deployment, the workflow checks `/health`. Both workflows also allow manual runs in Actions.

Deployment authentication in GitHub Actions:

- `AZURE_STATIC_WEB_APPS_API_TOKEN`: deployment token for `entrelinhas-ui`.
- Variables `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and `AZURE_SUBSCRIPTION_ID`: identifiers for managed identity `entrelinhas-github`. The backend uses passwordless OIDC. Federation accepts only `repo:PaulStSmith@118175402/entrelinhas@1454689262:ref:refs/heads/main`, with Website Contributor scoped to `editor-crdt-byteforge`. Basic publishing authentication remains disabled.

To deploy signaling manually, after `npm ci` and `az login`, run:

```powershell
.\publicar-servidor.ps1
```

The script uses the workflow's packager. It creates no paid plans or additional resources. The frontend does not use an App Service custom domain, which would require a paid plan.

To recreate only the free frontend resource, without automatic GitHub integration:

```powershell
az staticwebapp create --subscription 7e4e57e6-5275-4176-8e17-998e71c8c0db --resource-group rg-editor-crdt --name entrelinhas-ui --location eastus2 --sku Free
```

A recreated resource gets a new hostname and token: update the secret, validate the domain by TXT, and check the UI before changing the CNAME. See [docs/AZURE.md](docs/AZURE.md) for Azure setup, operation, and recovery.

### Limitations

- F1 limits daily CPU and WebSocket connections. Signaling keeps one connection per editor instance. This is not hosting for a large audience.
- An already open app remains editable offline; initial loading and offline reloading are not guaranteed because there is no service worker.
- There is no central persistence. A new device can recover content only by reaching a replica that has it.
- Clearing browser data can erase local changes not yet shared. Download important copies.
- WebRTC may fail on restrictive networks. No TURN service was provisioned; testing across different physical networks is still needed.
- The public room has no authentication, moderation, or global document-size limit. Any participant can change the text.

### Academic documentation

The rationale and implemented architecture are in [docs/ARQUITETURA.md](docs/ARQUITETURA.md). Operational configuration is in [docs/AZURE.md](docs/AZURE.md). These supporting documents are in Portuguese.

The [Word document](Documentacao_Editor_Colaborativo_CRDT.docx) combines the implemented architecture and final Azure operation, including domain, HTTPS, deployment, and recovery. Regenerate it from Markdown using `gerar_documentacao.py`, python-docx, and Pillow. The original proposal remains in Git history.

### License

Copyright (c) 2026 Paulo Santos. Released under the MIT license; see [LICENSE](LICENSE).

### Google Analytics

GA4 property **Entrelinhas — editor.byteforge.biz** (`564030584`) uses **Entrelinhas Web** stream (`16330016052`), measurement ID `G-K9Q5RVRJ7L`, and São Paulo reporting time. It belongs to the existing Analytics account `paulstsmith_blog`.

`src/analytics.js` loads the Google tag only on `https://editor.byteforge.biz`. Localhost, previews, and the alternate Azure hostname do not send metrics. The reported title is always `Entrelinhas`, the URL is the root without room, query, or fragment, and the referrer is omitted. The tag is isolated in `public/analytics.html`, without automatically reading the editor's title or fields. The app does not send document names/text, searches, or participant names. Enhanced measurement, Google signals, and ad personalization are disabled. The tag uses Analytics cookies on the editor's domain for visit/session metrics; reports do not include every visitor when browsers block Analytics.

[Property reports](https://analytics.google.com/analytics/web/#/a250151835p564030584/reports/intelligenthome). Configuration follows [GA4 pageview parameters](https://developers.google.com/analytics/devguides/collection/ga4/views). Standard reports may take time to display data.

[English](#english) · [Português](#portugues) · [Español](#espanol) · [Français](#francais)

---

<a id="portugues"></a>

## Português

Editor WYSIWYG colaborativo distribuído com Tiptap, Yjs e WebRTC. Cada navegador mantém uma réplica CRDT formatada e persiste seu estado no IndexedDB. O servidor Azure encaminha somente mensagens de sinalização para estabelecer as conexões entre participantes.

### Acessar o editor

- **Site:** https://editor.byteforge.biz/
- **Endereço Azure:** https://icy-mushroom-0b351a10f.5.azurestaticapps.net/
- **Saúde da sinalização:** https://editor-crdt-byteforge-gcgzh6bmbcf2eudx.canadacentral-01.azurewebsites.net/health
- **Repositório único (interface e sinalização):** https://github.com/PaulStSmith/entrelinhas

O documento padrão é público e compartilhado por todos os visitantes. Para uma demonstração isolada, use o mesmo parâmetro nos dois dispositivos, por exemplo `?sala=apresentacao`. O nome da sala não é senha nem controle de acesso.

### Executar no Windows

Instale Node.js 22.12 ou superior e execute, na pasta do projeto:

```powershell
.\executar-projeto.ps1
```

O script instala as dependências, compila a interface e inicia a prévia em `http://127.0.0.1:5173`. Ela usa a sinalização já hospedada no Azure. Encerre com Ctrl+C.

Para rodar também a sinalização local, execute `npm start` em outro terminal. Na janela da interface, configure `$env:VITE_SIGNALING_URL = 'ws://localhost:4444'` antes de executar o script. A variável é incorporada durante a compilação. O servidor local precisa de outro terminal porque permanece ativo recebendo conexões.

### Funcionalidades

- Biblioteca local para criar, nomear, duplicar, filtrar e reabrir documentos.
- Histórico com versões automáticas e manuais, prévia e recuperação em um documento separado.
- Prévia de impressão e exportação PDF pela janela de impressão do navegador.
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

### Interface de escrita

O editor abre diretamente no documento. O menu **Arquivo** reúne abertura, salvar como, downloads e impressão; **Novo documento**, **Salvar** e **Baixar** ficam visíveis na barra. O menu **Documento** reúne renomeação, duplicação e criação de versões manuais. **Histórico**, **Meus documentos** e **Copiar link** ficam acessíveis no cabeçalho. Nome de participante e simulação de desconexão ficam em **Colaboração**.

A barra de formatação acompanha a rolagem. Em telas pequenas, ela desliza horizontalmente para manter espaço para o texto. Menus fecham ao escolher uma ação, clicar fora ou pressionar Escape. Nomes de arquivo longos são abreviados no cabeçalho; o texto completo aparece ao passar o ponteiro.

O botão de tema no topo alterna entre claro e escuro. A preferência fica neste navegador; antes de escolher, o editor acompanha o tema do sistema. A impressão continua usando uma folha branca, independentemente do tema de edição.

#### Idioma

O seletor de bandeiras no canto superior direito oferece **English**, **Português**, **Español** e **Français**, com nomes acessíveis junto às bandeiras SVG. Sem escolha manual, o editor procura o primeiro idioma compatível na lista ordenada do navegador. Variantes como `en-US`, `pt-PT`, `es-MX` e `fr-CA` usam a tradução do respectivo idioma; se nenhum for compatível, o padrão é inglês.

A escolha manual fica na preferência local `entrelinhas-language`. **Usar idioma do navegador** remove essa escolha e retorna à detecção automática. A troca acontece sem recarregar, preservando conteúdo, seleção, nomes personalizados de documentos, nomes de participantes, links e salas. O idioma altera a interface, as mensagens, os tooltips e os formatos de datas e números; não traduz os documentos. Nomes padrão, como “Nosso caderno compartilhado” e documentos sem título, acompanham o idioma selecionado; nomes personalizados são preservados. Uma preferência de idioma diferente em outro dispositivo não altera a colaboração.

As traduções ficam em `src/messages.js`; a seleção e a aplicação da interface ficam em `src/i18n.js`. Não há serviço externo de tradução. Os testes verificam cobertura de legendas e atributos acessíveis, parâmetros das quatro traduções, detecção regional, preferência persistida e preservação do conteúdo durante a troca.

### Documentos e histórico local

Abra **Meus documentos** para criar uma sala com um nome, filtrar a lista e reabrir documentos. **Renomear** altera o nome somente neste navegador; o link da sala continua igual. **Duplicar** cria outra sala com o conteúdo e a formatação atuais. Réplicas de salas anteriores também aparecem quando o navegador oferece enumeração de bancos IndexedDB; nos demais, basta abrir o link de uma sala para cadastrá-la na biblioteca.

Use o ícone de link à direita do nome para copiar o endereço de um documento sem abri-lo. Os botões de link, lápis e lixeira têm tooltips no idioma selecionado.

Use o lápis à direita do nome para renomear qualquer documento diretamente em **Meus documentos**, sem abri-lo. O nome muda somente neste navegador; o link e o conteúdo são preservados.

Use a lixeira à direita do nome para remover uma entrada de **Meus documentos** e seu histórico local, após confirmação. Isso não altera o arquivo original nem as cópias dos participantes. A réplica local é preservada; abrir o link novamente adiciona o documento à lista. Abrir novamente um arquivo removido cria uma nova entrada.

A biblioteca e os nomes ficam nesta origem e neste navegador. Uma nova sala recebe um identificador aleatório, mas não possui senha ou controle de acesso. O destinatário de um link precisa alcançar uma réplica conectada para receber o conteúdo. Não há uma lista central de documentos.

O **Histórico** guarda mudanças a cada 30 segundos durante a edição, além de versões ao abrir, antes de trocar de documento e antes de importar um arquivo. **Guardar versão** permite salvar um ponto manual. Conteúdo idêntico à última versão não gera outra entrada. São mantidas até 20 versões por documento, com limite total de 20 MB; versões antigas são removidas conforme esses limites. O indicador mostra quando a última versão foi guardada ou informa uma falha de armazenamento.

Selecione uma versão para conferir seu conteúdo e use **Restaurar como novo documento**. A recuperação abre outra sala e preserva o documento compartilhado atual. Antes de abrir um arquivo, se não for possível guardar a versão anterior, a navegação é interrompida e o documento atual é preservado. Baixe uma cópia HTML antes de tentar novamente.

Histórico local não é backup externo: limpar os dados do navegador remove biblioteca, versões e réplicas. Edições feitas nos segundos finais antes de encerrar abruptamente a aba podem não ter um checkpoint, embora a persistência normal da réplica continue funcionando.

### Imprimir e salvar PDF

Use **Imprimir / PDF** para conferir uma prévia limpa com o nome do documento e a formatação atual. **Imprimir / salvar PDF** abre a janela do navegador, onde você pode escolher **Salvar como PDF** ou uma impressora. O layout usa papel A4 e margens de 18 mm como padrão, sem ferramentas, participantes ou cursores. A paginação final e os ajustes de papel, margens e cabeçalhos são controlados pelo navegador. A impressão pelo menu do navegador também prepara o documento atual.

### Abrir e salvar arquivos locais

Use **Abrir arquivo** para selecionar HTML ou texto UTF-8, com limite de 2 MB. O arquivo abre automaticamente como um documento separado em **Meus documentos**, com o nome do arquivo, sem substituir o caderno atual. Reabrir o mesmo nome e conteúdo retorna ao documento existente, preservando as edições e o nome escolhido no editor. Um arquivo com nome ou conteúdo diferente cria outra entrada. A identificação usa SHA-256 local do nome e dos bytes; datas de modificação não alteram a identidade. O arquivo original não é modificado. A lista e essa identificação ficam neste navegador e nesta origem; limpar os dados remove a associação. Cada documento tem seu próprio link de colaboração.

**HTML** preserva os títulos, as listas e as marcas suportadas pelo editor. Scripts, imagens externas, estilos arbitrários e outros elementos não suportados são removidos na importação. **TXT** não preserva formatação. DOCX, PDF e RTF não são formatos de importação deste aplicativo.

**Novo documento**, ao lado de Salvar e Baixar, cria e abre imediatamente um documento em branco em **Meus documentos**, com um nome padrão no idioma selecionado, preservando o documento atual.

**Salvar** adiciona ou restaura o documento atual em **Meus documentos** e guarda uma versão local, sem abrir um seletor de arquivos. **Baixar** exporta uma cópia HTML com formatação. No Edge e em navegadores com File System Access, **Salvar como** permite gravar uma cópia no computador. **Salvar como** sempre pede outro destino. Abrir um arquivo pelo seletor não concede gravação no original: selecione o mesmo destino em **Salvar como** se quiser atualizá-lo. O indicador mostra alterações posteriores ainda não gravadas no arquivo, incluindo edições remotas.

Nos demais navegadores, **Salvar como** baixa uma nova cópia HTML. **Baixar HTML** sempre exporta uma cópia com formatação, sem vincular um arquivo; **Baixar cópia .txt** exporta somente o texto. Cancelar a escolha do destino não altera o vínculo anterior. Uma gravação só é confirmada depois de a escrita e o fechamento do arquivo terminarem.

Atalhos: `Ctrl+O` abre, `Ctrl+S` salva em Meus documentos, `Ctrl+Shift+S` salva como, `Ctrl+F` busca, `Ctrl+B` aplica negrito, `Ctrl+I` aplica itálico, `Ctrl+U` sublinha, `Ctrl+Z` desfaz e `Ctrl+Shift+Z` refaz. No macOS, use Command no lugar de Ctrl.

A versão WYSIWYG utiliza salas e armazenamento `entrelinhas-rich-v2-*`, separados da demonstração inicial de texto simples. Não há migração automática do documento anterior; seu estado antigo permanece no IndexedDB de origem.

### Validação

```powershell
npm test
npm run build
```

Os 29 testes verificam convergência com inserções e exclusões concorrentes, formatação em XML CRDT, entrega duplicada e fora de ordem, sinalização, JSON inválido, UTF-8, limites de arquivo, falha de escrita, busca, sanitização, biblioteca local, retenção e atomicidade do histórico, recuperação de cópias, internacionalização e isolamento do Analytics. Na publicação Azure, duas origens distintas (domínio público e hostname Azure) estabeleceram WebRTC, sincronizaram o documento e combinaram edições offline após reconectar. A recuperação da réplica após recarregar também foi conferida. Na biblioteca, criação, renomeação, duplicação, recuperação sem alterar a origem e prévia de impressão foram conferidas no navegador. O seletor de idiomas foi conferido nos quatro idiomas, incluindo persistência após recarregar, histórico localizado e menu em tela de 320 px. Testes entre dispositivos em redes físicas diferentes e os diálogos nativos de abertura, gravação e salvamento PDF ainda precisam de conferência manual.

### Publicação

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

### Limitações

- F1 limita a CPU diária e o número de conexões WebSocket. A sinalização mantém uma conexão por instância do editor. Não é uma hospedagem para grande público.
- O aplicativo já aberto continua editável offline; a abertura inicial e a recarga offline não são garantidas, pois não há service worker.
- Não há persistência central. Um novo dispositivo só recupera o conteúdo se alcançar uma réplica que o possua.
- Limpar os dados do navegador pode apagar alterações locais ainda não compartilhadas. Baixe cópias importantes.
- WebRTC pode falhar em redes restritivas. Não foi provisionado TURN; validação entre redes físicas diferentes ainda é necessária.
- A sala pública não tem autenticação, moderação ou limite global de tamanho do documento. Qualquer participante pode modificar o texto.

### Documentação acadêmica

A fundamentação e a arquitetura implementada estão em [docs/ARQUITETURA.md](docs/ARQUITETURA.md). A configuração operacional está em [docs/AZURE.md](docs/AZURE.md).

O [documento Word](Documentacao_Editor_Colaborativo_CRDT.docx) reúne a arquitetura implementada e a operação final no Azure, incluindo domínio, HTTPS, publicação e recuperação. Para regenerá-lo a partir dos fontes Markdown, use `gerar_documentacao.py` com python-docx e Pillow. A proposta original permanece no histórico Git.

### Licença

Copyright (c) 2026 Paulo Santos. Código disponibilizado sob a licença MIT; consulte [LICENSE](LICENSE).


### Google Analytics

A propriedade GA4 **Entrelinhas — editor.byteforge.biz** (`564030584`) usa o stream **Entrelinhas Web** (`16330016052`), com ID de medição `G-K9Q5RVRJ7L` e fuso de relatórios São Paulo. A propriedade fica na conta Analytics existente `paulstsmith_blog`.

O módulo `src/analytics.js` carrega o Google tag somente em `https://editor.byteforge.biz`. Localhost, previews e o hostname alternativo Azure não enviam métricas. O título enviado é sempre `Entrelinhas`, a URL é a raiz sem sala, query ou fragmento, e o referrer é omitido. O tag é isolado em `public/analytics.html`, sem acesso automático ao título ou aos campos do editor. Nomes, texto dos documentos, buscas e nomes de participantes não são enviados pela aplicação. Medição otimizada, Google signals e personalização de anúncios estão desativados. O Google tag usa cookies Analytics no domínio do editor para métricas de visitas e sessões; os relatórios não representam todos os visitantes quando o navegador bloqueia Analytics.

[Relatórios da propriedade](https://analytics.google.com/analytics/web/#/a250151835p564030584/reports/intelligenthome). A configuração segue os parâmetros de [visualizações de página do GA4](https://developers.google.com/analytics/devguides/collection/ga4/views). Dados nos relatórios padrão podem demorar a aparecer.

[English](#english) · [Português](#portugues) · [Español](#espanol) · [Français](#francais)

---

<a id="espanol"></a>

## Español

Editor WYSIWYG colaborativo distribuido con Tiptap, Yjs y WebRTC. Cada navegador mantiene una réplica CRDT con formato y guarda su estado en IndexedDB. El servidor Azure solo reenvía mensajes de señalización para establecer las conexiones entre participantes.

### Acceder al editor

- **Sitio web:** https://editor.byteforge.biz/
- **Dirección de Azure:** https://icy-mushroom-0b351a10f.5.azurestaticapps.net/
- **Estado de la señalización:** https://editor-crdt-byteforge-gcgzh6bmbcf2eudx.canadacentral-01.azurewebsites.net/health
- **Repositorio único (interfaz y señalización):** https://github.com/PaulStSmith/entrelinhas

El documento predeterminado es público y compartido por todos los visitantes. Para una demostración aislada, usa el mismo parámetro en ambos dispositivos, por ejemplo `?sala=apresentacao`. El nombre de la sala no es una contraseña ni un control de acceso.

### Ejecutar en Windows

Instala Node.js 22.12 o posterior y ejecuta lo siguiente desde la carpeta del proyecto:

```powershell
.\executar-projeto.ps1
```

El script instala las dependencias, compila la interfaz e inicia la vista previa en `http://127.0.0.1:5173`. Utiliza la señalización alojada en Azure. Detén el proceso con Ctrl+C.

Para ejecutar también la señalización localmente, ejecuta `npm start` en otra terminal. En la terminal de la interfaz, configura `$env:VITE_SIGNALING_URL = 'ws://localhost:4444'` antes de ejecutar el script. La variable se incorpora durante la compilación. El servidor necesita su propia terminal porque permanece activo recibiendo conexiones.

### Funcionalidades

- Biblioteca local para crear, nombrar, duplicar, filtrar y volver a abrir documentos.
- Historial de versiones automáticas y manuales, vista previa y recuperación en un documento independiente.
- Vista previa de impresión y exportación a PDF mediante el diálogo del navegador.
- Edición WYSIWYG con encabezados, negrita, cursiva, subrayado, tachado, listas, citas y bloques de código.
- Apertura de archivos HTML y TXT locales; guardar, guardar como y descargar copias HTML o TXT.
- Deshacer y rehacer locales, búsqueda y reemplazo, incluso en texto con distintos formatos.
- Edición simultánea con cursores y nombres de los participantes.
- Réplica local persistente en IndexedDB, sin documento central autoritativo.
- Simulación de desconexión y combinación de cambios al reconectar.
- Exportación de texto y copia del enlace de la sala.
- Recuento de palabras, caracteres y conexiones WebRTC.
- Diseño adaptable a móviles y navegación con teclado.

El indicador distingue participantes WebRTC, otras pestañas locales y edición sin pares conectados. `/health` solo indica disponibilidad HTTP de la señalización; no garantiza conectividad WebRTC en cualquier red.

### Interfaz de escritura

El editor abre directamente el documento. **Archivo** reúne apertura, Guardar como, descargas e impresión. **Nuevo documento**, **Guardar** y **Descargar** están visibles en la barra. **Documento** permite renombrar, duplicar y guardar versiones manuales. **Historial**, **Mis documentos** y **Copiar enlace** están disponibles en la cabecera. El nombre del participante y la simulación de desconexión están en **Colaboración**.

La barra de formato permanece visible al desplazarse. En pantallas pequeñas se desplaza horizontalmente para dejar espacio al texto. Los menús se cierran al elegir una acción, pulsar fuera o presionar Escape. Los nombres largos de archivo se abrevian en la cabecera; al pasar el puntero se muestra el nombre completo.

El botón de tema alterna entre claro y oscuro. La preferencia se guarda en este navegador; antes de elegir, el editor sigue el tema del sistema. La impresión utiliza papel blanco independientemente del tema.

#### Idioma

El selector de banderas de la esquina superior derecha ofrece **English**, **Português**, **Español** y **Français**, con nombres accesibles junto a las banderas SVG. Sin selección manual, el editor elige el primer idioma compatible de la lista ordenada del navegador. Variantes como `en-US`, `pt-PT`, `es-MX` y `fr-CA` usan la traducción de su idioma; si no hay coincidencia, se utiliza inglés.

La selección manual se guarda en `entrelinhas-language`. **Usar idioma del navegador** la elimina y restablece la detección automática. El cambio no recarga el editor y conserva contenido, selección, nombres personalizados de documentos, nombres de participantes, enlaces y salas. Cambia la interfaz, los mensajes, los tooltips y los formatos de fechas y números; no traduce documentos. Los títulos predeterminados, como “Nuestro cuaderno compartido” y los documentos sin título, siguen el idioma elegido. Los nombres personalizados se conservan. Un idioma distinto en otro dispositivo no afecta a la colaboración.

Las traducciones están en `src/messages.js`; la selección y actualización de la interfaz están en `src/i18n.js`. No se utiliza un servicio externo de traducción. Las pruebas cubren textos y atributos accesibles, parámetros de las cuatro traducciones, detección regional, preferencias guardadas y conservación del contenido al cambiar de idioma.

### Documentos e historial local

Abre **Mis documentos** para crear una sala con nombre, filtrar la lista y volver a abrir documentos. **Renombrar** cambia el nombre solo en este navegador; el enlace sigue igual. **Duplicar** crea otra sala con el contenido y formato actuales. Las réplicas de salas anteriores aparecen si el navegador permite enumerar bases IndexedDB; en otros casos, abre el enlace de una sala para registrarla en la biblioteca.

El icono de enlace situado a la derecha del nombre copia la dirección sin abrir el documento. El lápiz permite renombrar cualquier documento directamente desde **Mis documentos**. Los botones de enlace, lápiz y papelera tienen tooltips en el idioma seleccionado. Renombrar conserva el enlace y el contenido.

La papelera elimina la entrada y su historial local tras una confirmación. No modifica el archivo original ni las copias de los participantes. La réplica local se conserva; abrir de nuevo el enlace añade el documento a la lista. Volver a abrir un archivo eliminado crea una entrada nueva.

La biblioteca y los nombres pertenecen a este origen y navegador. Una sala nueva recibe un identificador aleatorio, pero no tiene contraseña ni control de acceso. El destinatario del enlace debe alcanzar una réplica conectada para recibir el contenido. No hay una lista central de documentos.

**Historial** guarda cambios cada 30 segundos durante la edición, además de al abrir, antes de cambiar de documento y antes de importar un archivo. **Guardar versión ahora** crea un punto manual. Si el contenido coincide con la última versión, no se genera otra entrada. Se conservan hasta 20 versiones por documento y un máximo total de 20 MB; las versiones antiguas se eliminan según esos límites. El indicador muestra la última versión guardada o un fallo de almacenamiento.

Selecciona una versión para revisarla y usa **Restaurar como documento nuevo**. La recuperación abre otra sala y conserva el documento compartido actual. Si no se puede guardar la versión anterior antes de abrir un archivo, se interrumpe la navegación y se conserva el documento actual. Descarga una copia HTML antes de intentarlo de nuevo.

El historial local no es una copia de seguridad externa: borrar los datos del navegador elimina la biblioteca, las versiones y las réplicas. Los cambios de los últimos segundos antes de cerrar abruptamente una pestaña pueden no tener un punto de recuperación, aunque la persistencia normal de la réplica siga funcionando.

### Imprimir y guardar PDF

**Imprimir / PDF** muestra una vista previa limpia con el nombre y formato actuales. **Imprimir / guardar PDF** abre el diálogo del navegador para elegir **Guardar como PDF** o una impresora. El diseño predeterminado usa A4 y márgenes de 18 mm, sin herramientas, participantes ni cursores. El navegador controla la paginación final, el papel, los márgenes y los encabezados. Imprimir desde el menú del navegador también prepara el documento actual.

### Abrir y guardar archivos locales

**Abrir archivo** acepta HTML o texto UTF-8 de hasta 2 MB. Cada archivo abre automáticamente una entrada independiente en **Mis documentos**, con el nombre del archivo, sin sustituir el cuaderno actual. Volver a abrir el mismo nombre y contenido devuelve al documento existente, conservando los cambios y el nombre elegido en el editor. Un nombre o contenido distinto crea otra entrada. La identificación usa SHA-256 local del nombre y los bytes; las fechas de modificación no cambian la identidad. El archivo original no se modifica. La lista y la asociación permanecen en este navegador y origen; borrar sus datos elimina la asociación. Cada documento tiene su propio enlace de colaboración.

**HTML** conserva encabezados, listas y formatos compatibles. Durante la importación se eliminan scripts, imágenes externas, estilos arbitrarios y elementos no compatibles. **TXT** no conserva formato. DOCX, PDF y RTF no se pueden importar.

**Nuevo documento**, junto a Guardar y Descargar, crea y abre inmediatamente una entrada en blanco en **Mis documentos**, con un nombre predeterminado en el idioma seleccionado, conservando el documento actual.

**Guardar** añade o restaura el documento actual en **Mis documentos** y guarda una versión local sin abrir un selector de archivos. **Descargar** exporta una copia HTML con formato. En Edge y navegadores con File System Access, **Guardar como** permite escribir una copia en el equipo y siempre solicita un destino. Abrir un archivo no concede permiso para sobrescribir el original: elige el mismo destino en **Guardar como** si deseas actualizarlo. El indicador muestra los cambios posteriores aún no escritos en el archivo, incluidas ediciones remotas.

En otros navegadores, **Guardar como** descarga una nueva copia HTML. **Descargar HTML** siempre exporta una copia con formato sin vincular un archivo; **Descargar copia .txt** exporta texto sin formato. Cancelar el selector conserva la asociación anterior. La escritura se confirma solo después de escribir y cerrar el archivo correctamente.

Atajos: `Ctrl+O` abre, `Ctrl+S` guarda en Mis documentos, `Ctrl+Shift+S` guarda como, `Ctrl+F` busca, `Ctrl+B` aplica negrita, `Ctrl+I` cursiva, `Ctrl+U` subrayado, `Ctrl+Z` deshace y `Ctrl+Shift+Z` rehace. En macOS, usa Command en lugar de Ctrl.

La versión WYSIWYG utiliza salas y almacenamiento `entrelinhas-rich-v2-*`, separados de la demostración original de texto plano. No hay migración automática de aquel documento; su estado antiguo permanece en el IndexedDB del origen.

### Validación

```powershell
npm test
npm run build
```

Las 29 pruebas verifican convergencia de inserciones y eliminaciones concurrentes, formato XML CRDT, entregas duplicadas y fuera de orden, señalización, JSON inválido, UTF-8, límites de archivo, fallos de escritura, búsqueda, sanitización, biblioteca local, retención y atomicidad del historial, recuperación de copias, internacionalización y aislamiento de Analytics. En Azure, dos orígenes distintos (dominio público y hostname de Azure) establecieron WebRTC, sincronizaron el documento y combinaron cambios sin conexión al reconectar. También se comprobó la recuperación tras recargar. En el navegador se revisaron creación, renombrado, duplicación, recuperación sin modificar el origen y vista previa de impresión. Se comprobaron los cuatro idiomas, persistencia tras recargar, historial localizado y menú a 320 px. Las pruebas entre dispositivos en redes físicas distintas y los diálogos nativos de apertura, guardado y PDF aún requieren verificación manual.

### Publicación

`PaulStSmith/entrelinhas` contiene interfaz, señalización, pruebas, scripts de publicación y documentación académica. La consolidación conservó el historial Git y el DOCX original. Se eliminó el repositorio antiguo; todo el mantenimiento y la publicación se realizan aquí.

La interfaz utiliza **Azure Static Web Apps Free**, recurso `entrelinhas-ui` en East US 2, con dominio personalizado y certificado HTTPS administrado. `.github/workflows/azure-ui.yml` instala las dependencias bloqueadas, ejecuta pruebas, compila y publica `dist` en cada push a `main`. Las pull requests ejecutan las mismas pruebas y compilación sin publicar ni acceder a credenciales de producción.

`editor.byteforge.biz` utiliza un CNAME DNS directo, sin proxy, en Cloudflare hacia `icy-mushroom-0b351a10f.5.azurestaticapps.net`. El TXT `_dnsauth.editor.byteforge.biz` valida la propiedad en Azure. `configurar-https.ps1` comprueba el estado del dominio y la respuesta HTTPS. No modifica el dominio principal `byteforge.biz`.

La dirección pública es `https://editor.byteforge.biz`, con el parámetro `sala` y las claves `entrelinhas-rich-v2-*`. La migración conservó ese origen y sus claves IndexedDB. La dirección alternativa de Azure es otro origen con almacenamiento local separado; no debe sustituir la dirección pública en enlaces compartidos.

La señalización se ejecuta en Azure App Service Linux **Free F1**, recurso `editor-crdt-byteforge` en Canada Central. Ambos recursos están en `rg-editor-crdt`, suscripción `Azure subscription 1` (`7e4e57e6-5275-4176-8e17-998e71c8c0db`). Los scripts especifican la suscripción para evitar usar otra activa por error.

`.github/workflows/azure-server.yml` prueba y publica la señalización cuando cambian el servidor, las dependencias o su empaquetador. `npm run package:server` genera solo `server/index.js`, `ws` y un manifiesto mínimo en `.azure-deploy/staging`. La interfaz, documentos académicos y credenciales no entran en el paquete. Tras publicar, el workflow comprueba `/health`. Ambos workflows admiten ejecución manual en Actions.

Autenticación de publicación en GitHub Actions:

- `AZURE_STATIC_WEB_APPS_API_TOKEN`: token de despliegue de `entrelinhas-ui`.
- Variables `AZURE_CLIENT_ID`, `AZURE_TENANT_ID` y `AZURE_SUBSCRIPTION_ID`: identificadores de la identidad administrada `entrelinhas-github`. El backend usa OIDC sin contraseña. La federación acepta solo `repo:PaulStSmith@118175402/entrelinhas@1454689262:ref:refs/heads/main`, con Website Contributor limitado a `editor-crdt-byteforge`. La autenticación básica de publicación permanece desactivada.

Para publicar la señalización manualmente, después de `npm ci` y `az login`, ejecuta:

```powershell
.\publicar-servidor.ps1
```

El script usa el mismo empaquetador del workflow. No crea planes de pago ni recursos adicionales. La interfaz no usa un dominio personalizado de App Service, que requeriría un plan de pago.

Para recrear únicamente el recurso gratuito de la interfaz, sin integración automática con GitHub:

```powershell
az staticwebapp create --subscription 7e4e57e6-5275-4176-8e17-998e71c8c0db --resource-group rg-editor-crdt --name entrelinhas-ui --location eastus2 --sku Free
```

Un recurso recreado recibe otro hostname y token: actualiza el secret, valida el dominio por TXT y comprueba la interfaz antes de cambiar el CNAME. Consulta [docs/AZURE.md](docs/AZURE.md) para configuración, operación y recuperación en Azure.

### Limitaciones

- F1 limita la CPU diaria y las conexiones WebSocket. La señalización mantiene una conexión por instancia del editor. No es un alojamiento para grandes audiencias.
- La aplicación ya abierta permite editar sin conexión; la carga inicial y la recarga sin conexión no están garantizadas porque no hay service worker.
- No hay persistencia central. Un dispositivo nuevo solo recupera contenido si alcanza una réplica que lo posee.
- Borrar datos del navegador puede eliminar cambios locales aún no compartidos. Descarga copias importantes.
- WebRTC puede fallar en redes restrictivas. No se provisionó TURN; aún es necesario probar entre redes físicas distintas.
- La sala pública no tiene autenticación, moderación ni límite global de tamaño. Cualquier participante puede modificar el texto.

### Documentación académica

Los fundamentos y la arquitectura implementada están en [docs/ARQUITETURA.md](docs/ARQUITETURA.md). La configuración operativa está en [docs/AZURE.md](docs/AZURE.md). Estos documentos complementarios están en portugués.

El [documento Word](Documentacao_Editor_Colaborativo_CRDT.docx) reúne arquitectura y operación final en Azure, incluidos dominio, HTTPS, publicación y recuperación. Para regenerarlo desde Markdown, usa `gerar_documentacao.py`, python-docx y Pillow. La propuesta original permanece en el historial Git.

### Licencia

Copyright (c) 2026 Paulo Santos. Código disponible bajo licencia MIT; consulta [LICENSE](LICENSE).

### Google Analytics

La propiedad GA4 **Entrelinhas — editor.byteforge.biz** (`564030584`) utiliza el stream **Entrelinhas Web** (`16330016052`), ID de medición `G-K9Q5RVRJ7L` y horario de informes de São Paulo. Pertenece a la cuenta Analytics existente `paulstsmith_blog`.

`src/analytics.js` carga la etiqueta de Google solo en `https://editor.byteforge.biz`. Localhost, vistas previas y el hostname alternativo de Azure no envían métricas. El título enviado siempre es `Entrelinhas`, la URL es la raíz sin sala, query ni fragmento, y se omite el referrer. La etiqueta se aísla en `public/analytics.html`, sin leer automáticamente el título ni los campos del editor. La aplicación no envía nombres o texto de documentos, búsquedas ni nombres de participantes. Medición mejorada, Google signals y personalización de anuncios están desactivados. La etiqueta utiliza cookies Analytics del dominio del editor para métricas de visitas y sesiones; los informes no incluyen a todos los visitantes cuando el navegador bloquea Analytics.

[Informes de la propiedad](https://analytics.google.com/analytics/web/#/a250151835p564030584/reports/intelligenthome). La configuración sigue los [parámetros de vistas de página de GA4](https://developers.google.com/analytics/devguides/collection/ga4/views). Los informes estándar pueden tardar en mostrar los datos.

[English](#english) · [Português](#portugues) · [Español](#espanol) · [Français](#francais)

---

<a id="francais"></a>

## Français

Éditeur WYSIWYG collaboratif distribué utilisant Tiptap, Yjs et WebRTC. Chaque navigateur conserve une réplique CRDT avec mise en forme et enregistre son état dans IndexedDB. Le serveur Azure relaie uniquement les messages de signalisation pour établir les connexions entre participants.

### Accéder à l’éditeur

- **Site web :** https://editor.byteforge.biz/
- **Adresse Azure :** https://icy-mushroom-0b351a10f.5.azurestaticapps.net/
- **État de la signalisation :** https://editor-crdt-byteforge-gcgzh6bmbcf2eudx.canadacentral-01.azurewebsites.net/health
- **Dépôt unique (interface et signalisation) :** https://github.com/PaulStSmith/entrelinhas

Le document par défaut est public et partagé par tous les visiteurs. Pour une démonstration isolée, utilisez le même paramètre sur les deux appareils, par exemple `?sala=apresentacao`. Le nom d’une salle n’est ni un mot de passe ni un contrôle d’accès.

### Exécuter sous Windows

Installez Node.js 22.12 ou une version ultérieure, puis exécutez ceci dans le dossier du projet :

```powershell
.\executar-projeto.ps1
```

Le script installe les dépendances, compile l’interface et lance l’aperçu à `http://127.0.0.1:5173`. Il utilise la signalisation déjà hébergée sur Azure. Arrêtez-le avec Ctrl+C.

Pour exécuter aussi la signalisation localement, lancez `npm start` dans un autre terminal. Dans celui de l’interface, définissez `$env:VITE_SIGNALING_URL = 'ws://localhost:4444'` avant de lancer le script. La variable est intégrée lors de la compilation. Le serveur local nécessite son propre terminal, car il reste actif pour recevoir les connexions.

### Fonctionnalités

- Bibliothèque locale pour créer, nommer, dupliquer, filtrer et rouvrir des documents.
- Historique automatique et manuel, aperçu et restauration dans un document distinct.
- Aperçu avant impression et export PDF via la boîte de dialogue du navigateur.
- Édition WYSIWYG avec titres, gras, italique, soulignement, texte barré, listes, citations et blocs de code.
- Ouverture de fichiers HTML et TXT locaux ; enregistrement, enregistrement sous et téléchargement de copies HTML ou TXT.
- Annulation/rétablissement locaux et recherche/remplacement, y compris dans des passages de mises en forme différentes.
- Édition simultanée avec curseurs et noms des participants.
- Persistance locale dans IndexedDB, sans document central faisant autorité.
- Simulation de déconnexion et fusion des modifications à la reconnexion.
- Export en texte brut et copie du lien de la salle.
- Compteurs de mots, caractères et connexions WebRTC.
- Mise en page adaptée aux mobiles et navigation au clavier.

L’indicateur distingue les participants WebRTC, les autres onglets locaux et l’édition sans pair connecté. `/health` indique uniquement la disponibilité HTTP de la signalisation ; il ne garantit pas la connectivité WebRTC sur tous les réseaux.

### Interface d’écriture

L’éditeur s’ouvre directement sur le document. **Fichier** regroupe ouverture, Enregistrer sous, téléchargements et impression. **Nouveau document**, **Enregistrer** et **Télécharger** sont visibles dans la barre. **Document** regroupe renommage, duplication et versions manuelles. **Historique**, **Mes documents** et **Copier le lien** sont accessibles dans l’en-tête. Le nom du participant et la simulation de déconnexion se trouvent dans **Collaboration**.

La barre de mise en forme reste visible pendant le défilement. Sur petit écran, elle défile horizontalement pour laisser de la place au texte. Les menus se ferment après une action, un clic à l’extérieur ou la touche Échap. Les noms de fichiers longs sont abrégés dans l’en-tête ; le survol affiche le texte complet.

Le bouton de thème alterne entre clair et sombre. La préférence reste dans ce navigateur ; sans choix manuel, l’éditeur suit le thème du système. L’impression utilise du papier blanc quel que soit le thème.

#### Langue

Le sélecteur de drapeaux en haut à droite propose **English**, **Português**, **Español** et **Français**, avec des noms accessibles près des drapeaux SVG. Sans choix manuel, l’éditeur utilise la première langue prise en charge dans la liste ordonnée du navigateur. Les variantes `en-US`, `pt-PT`, `es-MX` et `fr-CA` utilisent la traduction de leur langue ; l’anglais sert de langue de repli.

Le choix manuel est enregistré dans `entrelinhas-language`. **Utiliser la langue du navigateur** le supprime et rétablit la détection automatique. Le changement ne recharge pas l’éditeur et préserve contenu, sélection, noms personnalisés des documents, noms des participants, liens et salles. Il modifie l’interface, les messages, les infobulles et les formats de dates et nombres ; il ne traduit pas les documents. Les titres par défaut, dont « Notre carnet partagé » et les documents sans titre, suivent la langue choisie. Les noms personnalisés sont conservés. Une autre langue sur un autre appareil n’affecte pas la collaboration.

Les traductions se trouvent dans `src/messages.js` ; la sélection et l’actualisation de l’interface dans `src/i18n.js`. Aucun service externe de traduction n’est utilisé. Les tests couvrent textes et attributs accessibles, paramètres des quatre traductions, détection régionale, préférences enregistrées et préservation du contenu lors du changement.

### Documents et historique local

Ouvrez **Mes documents** pour créer une salle nommée, filtrer la liste et rouvrir des documents. **Renommer** ne change le nom que dans ce navigateur ; le lien reste identique. **Dupliquer** crée une autre salle avec le contenu et la mise en forme actuels. Les répliques des anciennes salles apparaissent aussi si le navigateur permet d’énumérer les bases IndexedDB ; sinon, ouvrez le lien d’une salle pour l’ajouter à la bibliothèque.

L’icône de lien à droite du nom copie l’adresse sans ouvrir le document. Le crayon permet de renommer n’importe quel document directement depuis **Mes documents**. Les boutons lien, crayon et corbeille ont des infobulles dans la langue choisie. Le renommage préserve le lien et le contenu.

La corbeille retire l’entrée et son historique local après confirmation. Elle ne modifie ni le fichier original ni les copies des participants. La réplique locale est conservée ; rouvrir le lien ajoute le document à la liste. Rouvrir un fichier retiré crée une nouvelle entrée.

La bibliothèque et les noms appartiennent à cette origine et à ce navigateur. Une nouvelle salle reçoit un identifiant aléatoire, mais n’a ni mot de passe ni contrôle d’accès. Le destinataire d’un lien doit atteindre une réplique connectée pour recevoir le contenu. Il n’existe aucune liste centrale de documents.

**Historique** enregistre les modifications toutes les 30 secondes pendant l’édition, ainsi qu’à l’ouverture, avant de changer de document et avant d’importer un fichier. **Enregistrer une version maintenant** crée un point manuel. Un contenu identique à la dernière version ne crée pas d’entrée supplémentaire. Jusqu’à 20 versions sont conservées par document, dans une limite totale de 20 Mo ; les anciennes versions sont supprimées selon ces limites. L’indicateur affiche la dernière version enregistrée ou un échec de stockage.

Sélectionnez une version pour la prévisualiser, puis utilisez **Restaurer dans un nouveau document**. La restauration ouvre une autre salle et préserve le document partagé actuel. Si la version précédente ne peut pas être enregistrée avant l’ouverture d’un fichier, la navigation s’interrompt et le document actuel est préservé. Téléchargez une copie HTML avant de réessayer.

L’historique local n’est pas une sauvegarde externe : effacer les données du navigateur supprime bibliothèque, versions et répliques. Les modifications des dernières secondes avant la fermeture brutale d’un onglet peuvent ne pas avoir de point de restauration, même si la persistance normale de la réplique continue de fonctionner.

### Imprimer et enregistrer en PDF

**Imprimer / PDF** affiche un aperçu épuré avec le nom et la mise en forme actuels. **Imprimer / enregistrer le PDF** ouvre la boîte de dialogue du navigateur pour choisir **Enregistrer au format PDF** ou une imprimante. Le format par défaut est A4 avec des marges de 18 mm, sans outils, participants ni curseurs. Le navigateur contrôle la pagination finale, le papier, les marges et les en-têtes. L’impression depuis son menu prépare également le document actuel.

### Ouvrir et enregistrer des fichiers locaux

**Ouvrir un fichier** accepte le HTML ou le texte UTF-8 jusqu’à 2 Mo. Chaque fichier s’ouvre automatiquement comme une entrée distincte de **Mes documents**, portant son nom, sans remplacer le carnet actuel. Rouvrir le même nom et contenu retourne au document existant et préserve les modifications ainsi que le nom choisi dans l’éditeur. Un nom ou contenu différent crée une autre entrée. L’identité utilise un SHA-256 local du nom et des octets ; les dates de modification ne la changent pas. Le fichier original reste intact. La liste et l’association restent dans ce navigateur et cette origine ; effacer les données supprime l’association. Chaque document dispose de son lien de collaboration.

**HTML** conserve les titres, listes et mises en forme pris en charge. Scripts, images externes, styles arbitraires et éléments non pris en charge sont supprimés à l’importation. **TXT** ne conserve pas la mise en forme. DOCX, PDF et RTF ne peuvent pas être importés.

**Nouveau document**, près d’Enregistrer et Télécharger, crée et ouvre immédiatement une entrée vierge dans **Mes documents**, avec un nom par défaut dans la langue choisie, tout en préservant le document actuel.

**Enregistrer** ajoute ou rétablit le document actuel dans **Mes documents** et enregistre une version locale sans ouvrir de sélecteur de fichiers. **Télécharger** exporte une copie HTML avec mise en forme. Dans Edge et les navigateurs avec File System Access, **Enregistrer sous** écrit une copie sur l’ordinateur et demande toujours une destination. Ouvrir un fichier n’autorise pas l’écriture sur l’original : choisissez la même destination dans **Enregistrer sous** pour le mettre à jour. L’indicateur affiche les modifications ultérieures non encore écrites dans le fichier, y compris celles des autres participants.

Dans les autres navigateurs, **Enregistrer sous** télécharge une nouvelle copie HTML. **Télécharger le HTML** exporte toujours une copie avec mise en forme sans associer de fichier ; **Télécharger une copie .txt** exporte du texte brut. Annuler le sélecteur conserve l’association précédente. L’enregistrement n’est confirmé qu’après la réussite de l’écriture et de la fermeture du fichier.

Raccourcis : `Ctrl+O` ouvre, `Ctrl+S` enregistre dans Mes documents, `Ctrl+Shift+S` enregistre sous, `Ctrl+F` recherche, `Ctrl+B` applique le gras, `Ctrl+I` l’italique, `Ctrl+U` le soulignement, `Ctrl+Z` annule et `Ctrl+Shift+Z` rétablit. Sur macOS, utilisez Command à la place de Ctrl.

La version WYSIWYG utilise les salles et le stockage `entrelinhas-rich-v2-*`, séparés de la démonstration initiale en texte brut. Aucune migration automatique de l’ancien document n’est prévue ; son ancien état reste dans l’IndexedDB de l’origine.

### Validation

```powershell
npm test
npm run build
```

Les 29 tests couvrent convergence des insertions et suppressions concurrentes, mise en forme XML CRDT, livraisons dupliquées et désordonnées, signalisation, JSON invalide, UTF-8, limites de fichiers, échecs d’écriture, recherche, assainissement HTML, bibliothèque locale, rétention et atomicité de l’historique, restauration de copies, internationalisation et isolation d’Analytics. Sur Azure, deux origines distinctes (domaine public et hostname Azure) ont établi WebRTC, synchronisé le document et fusionné des modifications hors ligne à la reconnexion. La récupération après rechargement a aussi été vérifiée. Création, renommage, duplication, restauration sans modification de la source et aperçu avant impression ont été contrôlés dans le navigateur. Les quatre langues ont été vérifiées, ainsi que la persistance après rechargement, l’historique traduit et le menu à 320 px. Les tests entre appareils sur des réseaux physiques différents et les dialogues natifs d’ouverture, d’enregistrement et de PDF nécessitent encore une vérification manuelle.

### Déploiement

`PaulStSmith/entrelinhas` contient interface, signalisation, tests, scripts de déploiement et documentation académique. La consolidation a conservé l’historique Git et le DOCX original. L’ancien dépôt a été supprimé ; toute maintenance et tout déploiement passent par celui-ci.

L’interface utilise **Azure Static Web Apps Free**, ressource `entrelinhas-ui` dans East US 2, avec domaine personnalisé et certificat HTTPS géré. `.github/workflows/azure-ui.yml` installe les dépendances verrouillées, exécute les tests, compile et déploie `dist` à chaque push sur `main`. Les pull requests exécutent les mêmes tests et compilation sans déploiement ni accès aux identifiants de production.

`editor.byteforge.biz` utilise un CNAME DNS direct sans proxy dans Cloudflare vers `icy-mushroom-0b351a10f.5.azurestaticapps.net`. Le TXT `_dnsauth.editor.byteforge.biz` valide la propriété dans Azure. `configurar-https.ps1` vérifie l’état du domaine et la réponse HTTPS. Cela ne modifie pas le domaine principal `byteforge.biz`.

L’adresse publique est `https://editor.byteforge.biz`, avec le paramètre `sala` et les clés de stockage `entrelinhas-rich-v2-*`. La migration a conservé cette origine et ses clés IndexedDB. L’adresse alternative Azure constitue une autre origine avec un stockage local distinct ; ne la substituez pas dans les liens partagés.

La signalisation fonctionne sur Azure App Service Linux **Free F1**, ressource `editor-crdt-byteforge` dans Canada Central. Les deux ressources sont dans `rg-editor-crdt`, abonnement `Azure subscription 1` (`7e4e57e6-5275-4176-8e17-998e71c8c0db`). Les scripts précisent l’abonnement pour éviter d’en utiliser un autre par erreur.

`.github/workflows/azure-server.yml` teste et déploie la signalisation lorsque le serveur, les dépendances ou son script de packaging changent. `npm run package:server` produit uniquement `server/index.js`, `ws` et un manifeste minimal dans `.azure-deploy/staging`. Interface, documents académiques et identifiants sont exclus du paquet. Après déploiement, le workflow vérifie `/health`. Les deux workflows permettent aussi un lancement manuel dans Actions.

Authentification de déploiement dans GitHub Actions :

- `AZURE_STATIC_WEB_APPS_API_TOKEN` : jeton de déploiement de `entrelinhas-ui`.
- Variables `AZURE_CLIENT_ID`, `AZURE_TENANT_ID` et `AZURE_SUBSCRIPTION_ID` : identifiants de l’identité gérée `entrelinhas-github`. Le backend utilise OIDC sans mot de passe. La fédération accepte uniquement `repo:PaulStSmith@118175402/entrelinhas@1454689262:ref:refs/heads/main`, avec Website Contributor limité à `editor-crdt-byteforge`. L’authentification de publication de base reste désactivée.

Pour déployer manuellement la signalisation, après `npm ci` et `az login`, exécutez :

```powershell
.\publicar-servidor.ps1
```

Le script utilise le même packaging que le workflow. Il ne crée ni plan payant ni ressource supplémentaire. L’interface n’utilise pas de domaine personnalisé App Service, qui nécessiterait un plan payant.

Pour recréer uniquement la ressource gratuite de l’interface sans intégration GitHub automatique :

```powershell
az staticwebapp create --subscription 7e4e57e6-5275-4176-8e17-998e71c8c0db --resource-group rg-editor-crdt --name entrelinhas-ui --location eastus2 --sku Free
```

Une ressource recréée reçoit un nouveau hostname et un nouveau jeton : mettez à jour le secret, validez le domaine par TXT et vérifiez l’interface avant de changer le CNAME. Consultez [docs/AZURE.md](docs/AZURE.md) pour la configuration, l’exploitation et la récupération sur Azure.

### Limites

- F1 limite le temps CPU quotidien et les connexions WebSocket. La signalisation conserve une connexion par instance de l’éditeur. Cet hébergement n’est pas adapté à une grande audience.
- Une application déjà ouverte reste modifiable hors ligne ; le chargement initial et le rechargement hors ligne ne sont pas garantis, faute de service worker.
- Aucune persistance centrale n’est disponible. Un nouvel appareil ne récupère le contenu qu’en atteignant une réplique qui le possède.
- Effacer les données du navigateur peut supprimer des modifications locales non encore partagées. Téléchargez les copies importantes.
- WebRTC peut échouer sur des réseaux restrictifs. Aucun TURN n’a été provisionné ; des tests entre réseaux physiques distincts restent nécessaires.
- La salle publique n’a ni authentification, ni modération, ni limite globale de taille. Tout participant peut modifier le texte.

### Documentation académique

Les fondements et l’architecture implémentée sont dans [docs/ARQUITETURA.md](docs/ARQUITETURA.md). La configuration opérationnelle est dans [docs/AZURE.md](docs/AZURE.md). Ces documents complémentaires sont en portugais.

Le [document Word](Documentacao_Editor_Colaborativo_CRDT.docx) rassemble l’architecture et l’exploitation finale sur Azure, notamment domaine, HTTPS, déploiement et récupération. Pour le régénérer depuis Markdown, utilisez `gerar_documentacao.py`, python-docx et Pillow. La proposition originale reste dans l’historique Git.

### Licence

Copyright (c) 2026 Paulo Santos. Code publié sous licence MIT ; voir [LICENSE](LICENSE).

### Google Analytics

La propriété GA4 **Entrelinhas — editor.byteforge.biz** (`564030584`) utilise le flux **Entrelinhas Web** (`16330016052`), l’identifiant de mesure `G-K9Q5RVRJ7L` et le fuseau de rapports de São Paulo. Elle appartient au compte Analytics existant `paulstsmith_blog`.

`src/analytics.js` charge la balise Google uniquement sur `https://editor.byteforge.biz`. Localhost, aperçus et hostname alternatif Azure n’envoient pas de métriques. Le titre envoyé est toujours `Entrelinhas`, l’URL est la racine sans salle, query ni fragment, et le referrer est omis. La balise est isolée dans `public/analytics.html`, sans lire automatiquement le titre ou les champs de l’éditeur. L’application n’envoie ni noms ou textes des documents, ni recherches, ni noms des participants. Mesures améliorées, Google signals et personnalisation publicitaire sont désactivés. La balise utilise des cookies Analytics sur le domaine de l’éditeur pour les métriques de visites et sessions ; les rapports n’incluent pas tous les visiteurs lorsque le navigateur bloque Analytics.

[Rapports de la propriété](https://analytics.google.com/analytics/web/#/a250151835p564030584/reports/intelligenthome). La configuration suit les [paramètres de vues de page GA4](https://developers.google.com/analytics/devguides/collection/ga4/views). Les rapports standards peuvent mettre du temps à afficher les données.

[English](#english) · [Português](#portugues) · [Español](#espanol) · [Français](#francais)
