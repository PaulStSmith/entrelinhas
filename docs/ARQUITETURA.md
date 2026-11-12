# Editor colaborativo distribuído com CRDT

## 1. Objetivo e escopo

Este projeto propõe um editor de texto em JavaScript no qual qualquer pessoa com o endereço do site pode acessar e editar o mesmo documento. A interface será hospedada no GitHub Pages.

Este documento descreve a arquitetura planejada e responde aos itens 2 a 5 da atividade. A implementação e a publicação ainda não foram realizadas.

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
- A sinalização deverá ser disponibilizada fora do GitHub Pages. Nenhum serviço específico foi provisionado ou validado nesta etapa.
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

Esses critérios são testes planejados, ainda não executados.

## 8. Acesso público e limites do protótipo

O protótipo terá um único documento público, sem autenticação. Qualquer participante que acessar a sala poderá alterar ou apagar texto. CRDT não substitui autorização, moderação ou histórico de recuperação.

O conteúdo será tratado como texto, sem executar HTML fornecido pelos participantes. O editor deverá apresentar um indicador de conexão, distinguindo edição local de comunicação ativa com outros nós.

## 9. Referências técnicas

- [GitHub Pages: hospedagem estática](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [Yjs: tipos compartilhados e provedores de sincronização](https://github.com/yjs/yjs)
- [y-webrtc: transporte e sinalização](https://github.com/yjs/y-webrtc)
- [Yjs: persistência local e edição offline](https://docs.yjs.dev/getting-started/allowing-offline-editing)
