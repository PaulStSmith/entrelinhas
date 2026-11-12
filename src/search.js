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
