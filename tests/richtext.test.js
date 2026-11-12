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

import test from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import * as Y from 'yjs'
import { createHTMLSanitizer, wrapHTML } from '../src/richtext.js'

test('HTML mantém títulos, marcas e listas sem código ou imagens externas', () => {
  const window = new JSDOM('').window
  const clean = createHTMLSanitizer(window)
  const result = clean('<h1>Título</h1><p><strong>Negrito</strong> <em>itálico</em></p><ul><li>Item</li></ul><script>alert(1)</script><img src="https://example.com/x" onerror="alert(1)"><a href="javascript:alert(1)">link</a>')
  assert.ok(result.includes('<h1>Título</h1>'))
  assert.ok(result.includes('<strong>Negrito</strong>'))
  assert.ok(result.includes('<ul><li>Item</li></ul>'))
  assert.doesNotMatch(result, /script|img|onerror|javascript:/i)
  const saved = new JSDOM(wrapHTML(result))
  assert.equal(saved.window.document.querySelector('meta[charset]').getAttribute('charset'), 'UTF-8')
  assert.equal(saved.window.document.querySelector('strong').textContent, 'Negrito')
  window.close(); saved.window.close()
})

test('árvore formatada CRDT combina marca offline e inserção concorrente', () => {
  const a = new Y.Doc(); const b = new Y.Doc()
  const paragraph = new Y.XmlElement('paragraph'); const text = new Y.XmlText()
  a.getXmlFragment('conteudo').insert(0, [paragraph]); paragraph.insert(0, [text]); text.insert(0, 'Olá mundo')
  Y.applyUpdate(b, Y.encodeStateAsUpdate(a))
  text.format(0, 3, { bold: {} })
  b.getXmlFragment('conteudo').get(0).get(0).insert(9, ' juntos')
  const ua = Y.encodeStateAsUpdate(a), ub = Y.encodeStateAsUpdate(b)
  Y.applyUpdate(a, ub); Y.applyUpdate(b, ua)
  assert.equal(a.getXmlFragment('conteudo').toString(), b.getXmlFragment('conteudo').toString())
  assert.match(a.getXmlFragment('conteudo').toString(), /bold/)
  assert.match(a.getXmlFragment('conteudo').toString(), /juntos/)
  a.destroy(); b.destroy()
})
