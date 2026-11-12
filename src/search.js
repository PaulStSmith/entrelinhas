/*
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
*/

// Posições são calculadas a partir do documento atual, inclusive entre trechos
// com marcas diferentes. Cada substituição recalcula os resultados concorrentes.
export function findMatches(doc, query) {
  if (!query) return []
  const expression = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'giu')
  const matches = []
  doc.descendants((block, blockPos) => {
    if (!block.isTextblock) return
    let content = ''
    const positions = []
    block.descendants((node, offset) => {
      if (node.isText) {
        for (let i = 0; i < node.text.length; i++) { positions.push(blockPos + 1 + offset + i); content += node.text[i] }
      } else if (node.isLeaf) { positions.push(blockPos + 1 + offset); content += '\n' }
    })
    for (const match of content.matchAll(expression)) {
      matches.push({ from: positions[match.index], to: positions[match.index + match[0].length - 1] + 1 })
    }
    return false
  })
  return matches
}
