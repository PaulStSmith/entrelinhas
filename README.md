# Entrelinhas

Editor WYSIWYG colaborativo distribuído com Tiptap, Yjs e WebRTC. Cada navegador mantém uma réplica CRDT formatada e persiste seu estado no IndexedDB. O servidor Azure encaminha somente mensagens de sinalização para estabelecer as conexões entre participantes.

## Acessar o editor

- **Site:** https://editor.byteforge.biz/
- **Endereço original do GitHub Pages:** https://paulstsmith.github.io/editor-distribuido-crdt/
- **Saúde da sinalização:** https://editor-crdt-byteforge-gcgzh6bmbcf2eudx.canadacentral-01.azurewebsites.net/health
- **Repositório:** https://github.com/PaulStSmith/editor-distribuido-crdt

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

A versão WYSIWYG utiliza salas e armazenamento `entrelinhas-rich-v2-*`, separados da demonstração inicial de texto simples. Não há migração automática do documento anterior; seu estado antigo permanece no IndexedDB de origem e a proposta DOCX continua como registro da arquitetura inicial.

## Validação

```powershell
npm test
npm run build
```

Os oito testes verificam convergência com inserções e exclusões concorrentes, formatação em XML CRDT, entrega duplicada e fora de ordem, sinalização, JSON inválido, UTF-8, limites de arquivo, falha de escrita, busca entre marcas e sanitização de HTML. A conferência no navegador utiliza duas origens diferentes (`localhost` e `127.0.0.1`) para evitar que BroadcastChannel esconda uma falha de WebRTC. Inclui formatação compartilhada, busca, substituição e convergência após edições offline na versão WYSIWYG. Um download HTML foi conferido no disco, preservando títulos e negrito. A abertura e a gravação pelo diálogo nativo do sistema ainda precisam de conferência manual: a extensão bloqueou o seletor automatizado e a autorização para o controle nativo expirou.

## Publicação

O workflow `.github/workflows/pages.yml` testa, compila e publica a interface quando a branch `main` recebe alterações. A aplicação usa caminhos relativos, compatíveis com GitHub Pages em subdiretório.

O domínio `editor.byteforge.biz` usa um CNAME DNS direto na Cloudflare para `paulstsmith.github.io`. O workflow manual `https.yml` aguarda a emissão do certificado por até uma hora, habilita a exigência de HTTPS e confere a página publicada. Não altera o domínio principal de `byteforge.biz`.

O servidor roda no Azure App Service Linux **Free F1**, em Canada Central, dentro de `rg-editor-crdt`. Para publicar alterações na sinalização, depois de `npm ci` e `az login`, execute:

```powershell
.\publicar-servidor.ps1
```

O script publica somente `server/index.js`, o pacote `ws` instalado e um manifesto mínimo. Não publica credenciais nem o documento dos participantes. Não cria planos pagos ou recursos adicionais.

## Limitações

- F1 limita a CPU diária e o número de conexões WebSocket. A sinalização mantém uma conexão por instância do editor. Não é uma hospedagem para grande público.
- O aplicativo já aberto continua editável offline; a abertura inicial e a recarga offline não são garantidas, pois não há service worker.
- Não há persistência central. Um novo dispositivo só recupera o conteúdo se alcançar uma réplica que o possua.
- Limpar os dados do navegador pode apagar alterações locais ainda não compartilhadas. Baixe cópias importantes.
- WebRTC pode falhar em redes restritivas. Não foi provisionado TURN; validação entre redes físicas diferentes ainda é necessária.
- A sala pública não tem autenticação, moderação ou limite global de tamanho do documento. Qualquer participante pode modificar o texto.

## Documentação acadêmica

A fundamentação completa está abaixo e em [docs/ARQUITETURA.md](docs/ARQUITETURA.md). O arquivo [DOCX](Documentacao_Editor_Colaborativo_CRDT.docx) registra a proposta original de arquitetura.

# Editor colaborativo distribuído com CRDT

## 1. Objetivo e escopo

Este projeto propõe um editor de texto em JavaScript no qual qualquer pessoa com o endereço do site pode acessar e editar o mesmo documento. A interface será hospedada no GitHub Pages.

Esta seção descreve a arquitetura e responde aos itens 2 a 5 da atividade. Os comandos, a implementação e a publicação estão descritos nas seções iniciais deste README.

## 2. Cenário prático de sistema distribuído

O cenário escolhido é um editor de texto colaborativo. Vários participantes podem inserir e excluir texto simultaneamente, inclusive a partir de computadores e redes diferentes.

Cada instância do editor no navegador representa um nó e mantém uma réplica local do documento. O nó aplica edições localmente e troca atualizações com outros participantes. Não existe um usuário que precise autorizar cada edição.

Independência significa que um nó pode continuar editando sua réplica durante uma desconexão. Não significa que ele possa receber alterações remotas sem comunicação. A convergência depende de as atualizações voltarem a circular.

## 3. Estratégia escolhida: CRDT

A estratégia será CRDT, usando uma estrutura própria para texto. As operações carregam informações que permitem combinar edições concorrentes de forma determinística. A aplicação não deve implementar colaboração apenas substituindo o texto inteiro pela última versão recebida, pois isso pode sobrescrever edições concorrentes.

### Consistência

As réplicas podem apresentar conteúdos diferentes durante uma interrupção da comunicação. Quando recebem o mesmo conjunto de atualizações, convergem para o mesmo estado. Portanto, o sistema oferece consistência eventual, sem exigir que todos enxerguem cada alteração no mesmo instante.

Essa garantia resolve a combinação estrutural das operações. Ela não garante que o resultado seja semanticamente adequado: dois usuários podem escrever frases contraditórias, exigindo revisão humana.

### Disponibilidade

O usuário pode continuar editando um documento já carregado mesmo sem conexão. As alterações locais serão sincronizadas quando houver novamente um caminho de comunicação com outros nós.

Se o site nunca tiver sido carregado naquele dispositivo, será necessário acesso à hospedagem para obter seus arquivos. Abrir ou recarregar o aplicativo inteiramente offline exigirá uma estratégia adicional de cache, como um service worker.

### Desempenho

Uma edição aparece imediatamente na interface, sem aguardar quorum ou aquisição de um bloqueio remoto. As atualizações são transmitidas em segundo plano. A contrapartida é o custo de metadados, processamento e tráfego de sincronização, que deve ser medido na implementação.

## 4. Arquitetura e hospedagem no GitHub Pages

O GitHub Pages entrega arquivos estáticos de HTML, CSS e JavaScript. Ele hospedará a interface, mas não executará um servidor persistente de sincronização ou sinalização.

A arquitetura proposta é:

```text
                 GitHub Pages
            entrega HTML, CSS e JavaScript
                    /       \
                   v         v
          Navegador A <----> Navegador B
          réplica local      réplica local
                troca de atualizações por WebRTC

          Ambos acessam um serviço externo
          de sinalização para iniciar conexões.
```

### Componentes planejados

| Componente | Responsabilidade |
| --- | --- |
| HTML, CSS e JavaScript | Exibir o editor e os estados de conexão. |
| Yjs | Representar o documento com CRDT e combinar atualizações. |
| y-webrtc | Transportar atualizações entre participantes por WebRTC. |
| Serviço externo de sinalização | Ajudar os participantes a se encontrarem e estabelecerem conexões. |
| y-indexeddb | Persistir a réplica no armazenamento local do navegador. |

Todos usarão o mesmo identificador de sala, associado ao documento compartilhado. O editor precisará de uma integração que traduza inserções e exclusões para o documento CRDT e reflita atualizações remotas na interface.

O CRDT define como combinar as alterações; o WebRTC define como transportá-las. O serviço de sinalização ajuda a iniciar as conexões e não determina qual edição vence.

### Limites da solução

- O GitHub Pages sozinho não fornece a infraestrutura de comunicação necessária para entrada automática de participantes.
- A sinalização é disponibilizada no Azure App Service F1, fora do GitHub Pages. O servidor foi publicado e a conexão WebRTC foi verificada no navegador.
- Redes restritivas podem exigir infraestrutura de travessia de rede, incluindo TURN. A conectividade deverá ser testada entre redes diferentes.
- Se a sinalização ficar indisponível, novas conexões podem falhar. Conexões já estabelecidas podem continuar funcionando enquanto seu caminho de rede permanecer disponível.
- A proposta inicial não possui uma cópia central durável. Um participante novo precisa alcançar uma réplica que contenha o documento para recuperar seu conteúdo atualizado.
- O armazenamento local não é backup: sua limpeza pode apagar a única cópia de alterações ainda não compartilhadas. Uma evolução possível é adicionar persistência remota.
- Abas no mesmo computador servem para demonstração inicial, mas compartilham infraestrutura e podem compartilhar armazenamento. A validação deve incluir dispositivos distintos.

Uma alternativa seria manter a interface no GitHub Pages e usar um servidor WebSocket externo para sincronização. Isso também permite réplicas independentes para edição local, mas concentra o transporte no servidor. A proposta deste documento adota WebRTC para explorar a comunicação entre os participantes.

## 5. Análise de riscos de outras abordagens

### Quorum Writes

Se cada edição dependesse da confirmação de uma quantidade mínima de réplicas, a latência aumentaria e um participante isolado não conseguiria confirmar suas escritas. Isso prejudicaria a edição offline.

Além disso, quorum é uma regra de confirmação e não resolve sozinho como combinar duas inserções concorrentes na mesma posição. Seria necessário definir também a representação do texto e o tratamento de conflitos. As garantias dependem do protocolo completo; quorum isoladamente não implica consistência forte.

### Locks distribuídos

Um bloqueio do documento permitiria que apenas o detentor editasse por vez, reduzindo a colaboração simultânea. Bloqueios por trecho aumentariam a complexidade.

Falhas e desconexões exigiriam tratamento de expiração e recuperação de locks. Uma implementação inadequada poderia aceitar operações de um antigo detentor após a expiração. Essas dificuldades tornam o bloqueio uma escolha menos adequada para este cenário.

## 6. Exemplo de operação e sincronização

Considere dois participantes com o texto inicial “Olá”.

1. Ana insere “!” ao final. Seu navegador aplica a operação à réplica local e atualiza a interface imediatamente.
2. Ao mesmo tempo, Bruno insere “?” na mesma posição, antes de receber a alteração de Ana.
3. Cada inserção é representada pelo CRDT com identidade e informações de posicionamento. A integração local mantém as alterações persistidas no navegador.
4. As atualizações são transmitidas aos participantes conectados. Cada receptor as integra ao seu documento CRDT e atualiza a interface.
5. A regra determinística do CRDT ordena as inserções concorrentes. Todos convergem, por exemplo, para “Olá!?”. A ordem exata depende da implementação e das identidades das operações, não de uma escolha manual do servidor.
6. Se um participante estiver desconectado, continuará editando sua réplica. Ao se reconectar a uma réplica acessível, o mecanismo de sincronização troca as atualizações que faltam.

O resultado esperado é a preservação das inserções concorrentes e a convergência após a entrega das atualizações. Isso não implica que todo texto inserido sobreviva a qualquer exclusão posterior: exclusões também são operações válidas do editor.

## 7. Demonstração e critérios de validação

1. Abrir o site em dois dispositivos, usando o mesmo documento.
2. Inserir texto simultaneamente e verificar que ambos convergem.
3. Desconectar um participante, editar nos dois dispositivos e reconectar. Verificar a combinação das alterações.
4. Fechar e reabrir um navegador e verificar a recuperação da réplica local.
5. Abrir um navegador sem dados locais enquanto outra réplica está acessível e verificar a sincronização inicial.
6. Testar a comunicação entre redes diferentes e registrar eventuais limitações de conectividade.

O roteiro inclui a validação entre dispositivos e redes físicas diferentes, que ainda precisa ser executada. As verificações concluídas estão descritas no início deste README.

## 8. Acesso público e limites do protótipo

O protótipo terá um único documento público, sem autenticação. Qualquer participante que acessar a sala poderá alterar ou apagar texto. CRDT não substitui autorização, moderação ou histórico de recuperação.

O conteúdo é representado por uma árvore CRDT formatada, com HTML de importação sanitizado e limitado ao esquema do editor. Scripts de arquivos importados não são executados. O editor apresenta um indicador de conexão, distinguindo edição local de comunicação ativa com outros nós.

## 9. Referências técnicas

- [GitHub Pages: hospedagem estática](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [Yjs: tipos compartilhados e provedores de sincronização](https://github.com/yjs/yjs)
- [y-webrtc: transporte e sinalização](https://github.com/yjs/y-webrtc)
- [Yjs: persistência local e edição offline](https://docs.yjs.dev/getting-started/allowing-offline-editing)
