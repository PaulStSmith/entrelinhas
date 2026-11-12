// SPDX-License-Identifier: MIT — Copyright (c) 2026 Paulo Santos
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { messageRows } from '../src/messages.js'
import { chooseLanguage, initializeI18n, languages, messages, translateFor, getLanguage, formatDate, formatNumber } from '../src/i18n.js'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const page = () => new JSDOM(html, { url: 'https://editor.byteforge.biz/' })

test('idioma respeita preferências ordenadas, variantes regionais e escolha manual', () => {
  assert.equal(chooseLanguage(['pt-PT', 'en-US']), 'pt')
  assert.equal(chooseLanguage(['es-MX']), 'es')
  assert.equal(chooseLanguage(['de-DE', 'fr-CA', 'en-GB']), 'fr')
  assert.equal(chooseLanguage(['EN_au']), 'en')
  assert.equal(chooseLanguage(['ja-JP']), 'en')
  assert.equal(chooseLanguage([]), 'en')
  assert.equal(chooseLanguage(['pt-BR'], 'fr'), 'fr')
  assert.equal(chooseLanguage(['es-AR'], 'invalid'), 'es')
})

test('catálogo tem quatro traduções completas e parâmetros equivalentes para cada mensagem', () => {
  assert.equal(new Set(messageRows.map(row => row[0])).size, messageRows.length)
  for (const [key, translations] of Object.entries(messages)) {
    const parameters = [...translations.en.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort()
    for (const { code } of languages) {
      assert.ok(translations[code]?.trim(), `${code}: ${key}`)
      assert.deepEqual([...translations[code].matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort(), parameters, `${code}: ${key}`)
    }
  }
  assert.equal(translateFor('fr', 'copyTitle', { title: '<Projet>' }), '<Projet> — copie')
})

test('toda legenda estática, tooltip e descrição acessível está no catálogo', () => {
  const dom = page(); const document = dom.window.document
  const sources = new Set(messageRows.map(row => row[1]))
  const universal = new Set(['entrelinhas', 'B', 'I', 'U', 'S'])
  const walker = document.createTreeWalker(document.body, 4)
  while (walker.nextNode()) {
    const node = walker.currentNode
    if (node.parentElement.closest('script,style,svg,kbd,[data-language-name]')) continue
    const value = node.textContent.trim()
    if (/[a-zÀ-ÿ]/i.test(value)) assert.ok(sources.has(value) || universal.has(value), `Missing text: ${value}`)
  }
  for (const element of document.querySelectorAll('[aria-label],[title],[placeholder],meta[name=description]')) {
    for (const attribute of ['aria-label', 'title', 'placeholder', 'content']) {
      if (element.hasAttribute(attribute)) assert.ok(sources.has(element.getAttribute(attribute)), `Missing ${attribute}: ${element.getAttribute(attribute)}`)
    }
  }
  dom.window.close()
})

test('troca ao vivo preserva conteúdo, nomes, inputs e estrutura dos botões', () => {
  const dom = page(); const document = dom.window.document
  const controller = initializeI18n({ document, navigator: { languages: ['en-US'] } })
  assert.equal(document.documentElement.lang, 'en')
  const editor = document.getElementById('editor')
  editor.innerHTML = '<p><strong>Abrir arquivo</strong> — My original document</p>'
  document.getElementById('document-title').textContent = 'Meu documento'
  document.getElementById('import-filename').textContent = 'Cancelar.txt'
  document.getElementById('new-document-title').value = 'Minha próxima ideia'
  const originalContent = editor.innerHTML
  controller.select('fr')
  assert.equal(document.documentElement.lang, 'fr')
  assert.equal(document.querySelector('#open-file').firstChild.textContent.trim(), 'Ouvrir un fichier')
  assert.equal(document.getElementById('document-title').textContent, 'Meu documento')
  assert.equal(document.getElementById('import-filename').textContent, 'Cancelar.txt')
  assert.equal(document.getElementById('new-document-title').value, 'Minha próxima ideia')
  assert.equal(editor.innerHTML, originalContent)
  assert.ok(document.querySelector('#share svg use'))
  assert.match(document.getElementById('language-summary').getAttribute('aria-label'), /Français/)
  assert.equal(document.getElementById('current-language-flag').querySelector('use').getAttribute('href'), '#flag-fr')
  assert.equal(dom.window.localStorage.getItem('entrelinhas-language'), 'fr')
  controller.select('pt')
  assert.equal(document.documentElement.lang, 'pt-BR')
  assert.equal(editor.innerHTML, originalContent)
  dom.window.close()
})

test('preferência salva vence navegador, e modo automático restaura detecção e formatos locais', () => {
  const dom = page()
  dom.window.localStorage.setItem('entrelinhas-language', 'fr')
  const controller = initializeI18n({ document: dom.window.document, navigator: { languages: ['es-CL'] } })
  assert.equal(getLanguage(), 'fr')
  assert.match(formatNumber(12345), /12\s345/u)
  assert.match(formatDate(new Date(2026, 0, 2, 14, 30)), /02\/01\/2026/)
  controller.select('auto')
  assert.equal(getLanguage(), 'es')
  assert.equal(dom.window.localStorage.getItem('entrelinhas-language'), null)
  dom.window.close()
})

test('restrições de armazenamento não impedem seleção de idioma na sessão', () => {
  const dom = page()
  const blocked = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') }, removeItem() { throw new Error('blocked') } }
  const controller = initializeI18n({ document: dom.window.document, navigator: { languages: ['fr-FR'] }, storage: blocked })
  assert.equal(getLanguage(), 'fr')
  controller.select('es')
  assert.equal(dom.window.document.documentElement.lang, 'es')
  assert.equal(dom.window.document.getElementById('current-language').textContent, 'Español')
  dom.window.close()
})
