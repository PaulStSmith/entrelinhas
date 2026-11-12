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

import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'
import { IndexeddbPersistence } from 'y-indexeddb'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCaret from '@tiptap/extension-collaboration-caret'
import { createHTMLSanitizer, wrapHTML } from './richtext.js'
import { decodeTextFile, downloadText, writeTextFile, textFileTypes, MAX_FILE_BYTES } from './files.js'
import { importSourceKey, createImportSeed } from './imports.js'
import { findMatches } from './search.js'
import { createLibrary } from './library.js'
import { createWorkspace } from './workspace.js'
import { initializeUI } from './ui.js'
import { initializeI18n, t, localizeMessage, onLanguageChange, formatNumber } from './i18n.js'
import './style.css'
import './workspace.css'

const $ = id => document.getElementById(id)
initializeI18n()
initializeUI()
const signaling = import.meta.env.VITE_SIGNALING_URL || 'wss://editor-crdt-byteforge-gcgzh6bmbcf2eudx.canadacentral-01.azurewebsites.net'
const requestedRoom = new URL(location.href).searchParams.get('sala')
const room = requestedRoom && /^[a-zA-Z0-9_-]{1,64}$/.test(requestedRoom) ? requestedRoom : 'caderno-publico'
// A versão separa o documento XML formatado da primeira demonstração Y.Text.
const roomKey = `entrelinhas-rich-v2-${room}`
const library = createLibrary(window.indexedDB)
let initialRecord, initialError
try { initialRecord = await library.getDocument(room) } catch (error) { initialError = error }
const doc = new Y.Doc()
// A seed is an immutable Yjs update: replaying it is idempotent, including after later deletions.
try { if (initialRecord?.seed) Y.applyUpdate(doc, initialRecord.seed) } catch (error) { initialError = error }
const persistence = new IndexeddbPersistence(roomKey, doc)
const provider = new WebrtcProvider(roomKey, doc, { signaling: [signaling], maxConns: 8 })
let storageReady = false, storageFailed = false, disconnected = false
let peerCount = 0, localPeers = 0, signalReachable = false
let fileHandle = null, fileName = 'entrelinhas.html', lastSaved = null, busy = false
let toastTimer, activeMatch = null
let workspace
const colors = ['#216957', '#a94e37', '#5d5aa5', '#936416', '#256d94']
const color = colors[crypto.getRandomValues(new Uint32Array(1))[0] % colors.length]
let savedName
try { savedName = localStorage.getItem('entrelinhas-name') } catch {}
$('name').value = savedName || t('person', { number: Math.floor(Math.random() * 900 + 100) })
function identity() { return { name: $('name').value.trim() || t('anonymous'), color } }
function updateIdentity() {
  provider.awareness.setLocalState({ ...provider.awareness.getLocalState(), user: identity() })
  try { localStorage.setItem('entrelinhas-name', identity().name) } catch {}
}
updateIdentity()
const cleanHTML = createHTMLSanitizer(window)
let editor
editor = new Editor({
  element: $('editor'),
  extensions: [
    StarterKit.configure({ undoRedo: false, heading: { levels: [1, 2, 3] }, link: { openOnClick: false, autolink: false } }),
    Collaboration.configure({ document: doc, field: 'conteudo' }),
    CollaborationCaret.configure({ provider, user: identity() })
  ],
  editorProps: {
    attributes: { role: 'textbox', 'aria-multiline': 'true', 'aria-label': t('sharedContent'), spellcheck: 'true', 'data-placeholder': t('placeholder') },
    transformPastedHTML: cleanHTML
  },
  onUpdate: () => { if (!editor) return; updateStats(); updateFileStatus(); activeMatch = null; workspace?.changed() },
  onSelectionUpdate: updateFormat,
  onTransaction: updateFormat
})
workspace = createWorkspace({ editor, doc, library, room, cleanHTML, toast, isReady: () => storageReady, initialRecord })
function updateStats() {
  const content = editor.getText()
  const words = content.trim() ? content.trim().split(/\s+/u).length : 0
  $('stats').textContent = `${t(words === 1 ? 'wordOne' : 'wordMany', { count: formatNumber(words) })} · ${t(content.length === 1 ? 'characterOne' : 'characters', { count: formatNumber(content.length) })}`
}
function updateFormat() {
  // O evento inicial pode ocorrer antes da atribuição da instância.
  if (!document.querySelector('.tiptap')) return
  queueMicrotask(() => {
    if (editor.isDestroyed) return
    for (const button of document.querySelectorAll('[data-command]')) button.setAttribute('aria-pressed', String(editor.isActive(button.dataset.command)))
    $('block-style').value = String(editor.getAttributes('heading').level || 'paragraph')
    $('undo').disabled = !editor.can().undo(); $('redo').disabled = !editor.can().redo()
  })
}
const commands = { bold: 'toggleBold', italic: 'toggleItalic', underline: 'toggleUnderline', strike: 'toggleStrike', bulletList: 'toggleBulletList', orderedList: 'toggleOrderedList', blockquote: 'toggleBlockquote', codeBlock: 'toggleCodeBlock' }
for (const button of document.querySelectorAll('[data-command]')) button.addEventListener('click', () => editor.chain().focus()[commands[button.dataset.command]]().run())
$('block-style').addEventListener('change', () => {
  const value = $('block-style').value
  if (value === 'paragraph') editor.chain().focus().setParagraph().run()
  else editor.chain().focus().setHeading({ level: Number(value) }).run()
})
$('clear-format').addEventListener('click', () => editor.chain().focus().unsetAllMarks().clearNodes().run())
$('undo').addEventListener('click', () => editor.chain().focus().undo().run())
$('redo').addEventListener('click', () => editor.chain().focus().redo().run())
$('name').addEventListener('input', updateIdentity)

function updateStatus() {
  $('offline-banner').hidden = !disconnected
  $('connection').textContent = t(disconnected ? 'reconnect' : 'disconnect')
  $('connection').setAttribute('aria-pressed', String(disconnected))
  $('status-dot').classList.toggle('offline', disconnected || !signalReachable)
  const peers = peerCount ? t(peerCount === 1 ? 'peerOne' : 'peerMany', { count: formatNumber(peerCount) }) : localPeers ? t(localPeers === 1 ? 'tabOne' : 'tabMany', { count: formatNumber(localPeers) }) : t(signalReachable ? 'waiting' : 'signalUnavailable')
  $('status').textContent = `${disconnected ? t('disconnected') : peers} · ${t(storageFailed ? 'storageUnavailable' : storageReady ? 'storageActive' : 'storageOpening')}`
}
function updateParticipants() {
  $('participants').replaceChildren()
  const states = disconnected ? [[doc.clientID, { user: identity() }]] : [...provider.awareness.getStates()]
  for (const [id, state] of states) {
    if (typeof state?.user?.name !== 'string') continue
    const badge = document.createElement('span'); badge.className = 'avatar'
    badge.textContent = state.user.name.slice(0, 2).toUpperCase()
    badge.title = `${state.user.name.slice(0, 32)}${id === doc.clientID ? ` (${t('you')})` : ''}`
    badge.setAttribute('aria-label', badge.title); badge.style.backgroundColor = colors[id % colors.length]
    $('participants').append(badge)
  }
}
provider.on('peers', ({ webrtcPeers, bcPeers }) => { peerCount = webrtcPeers.length; localPeers = bcPeers.length; updateStatus() })
provider.awareness.on('change', updateParticipants)
persistence.whenSynced.then(() => { storageReady = true; updateStats(); updateStatus(); workspace.start() }).catch(() => {
  storageFailed = true; updateStatus(); toast(t('storageWarning'))
})
$('connection').addEventListener('click', () => {
  disconnected = !disconnected
  if (disconnected) { provider.disconnect(); peerCount = 0; localPeers = 0 }
  else { updateIdentity(); provider.connect(); checkSignaling() }
  updateStatus(); updateParticipants()
})
async function checkSignaling() {
  try {
    const url = new URL(signaling); url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:'; url.pathname = '/health'
    signalReachable = (await fetch(url, { signal: AbortSignal.timeout(8000), cache: 'no-store' })).ok
  } catch { signalReachable = false }
  updateStatus()
}
function toast(message) {
  $('toast').textContent = localizeMessage(message); $('toast').hidden = false
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true }, 5000)
}
$('share').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.href); toast(t('linkCopied')) }
  catch { toast(t('copyAddress')) }
})

// Arquivos permanecem locais. Somente seu conteúdo importado entra no CRDT.
function snapshot() { return JSON.stringify(editor.getJSON()) }
function updateFileStatus() {
  const changed = lastSaved !== null && lastSaved !== snapshot()
  const name = fileHandle?.name || fileName
  $('file-status').textContent = lastSaved === null ? t('browserCopy') : `${name} · ${t(changed ? 'unsaved' : fileHandle ? 'fileSaved' : 'importedCopy')}${/\.txt$/i.test(name) ? ` · ${t('plainTXT')}` : ''}`
  $('file-status').title = $('file-status').textContent
}
function htmlDocument() {
  return wrapHTML(cleanHTML(editor.getHTML()))
}
async function saveFile(saveAs = false) {
  if (busy) return
  busy = true
  try {
    let handle = saveAs ? null : fileHandle
    if ('showSaveFilePicker' in window) {
      if (!handle) handle = await window.showSaveFilePicker({ suggestedName: fileName, types: textFileTypes })
      const content = /\.txt$/i.test(handle.name) ? editor.getText() : htmlDocument()
      const version = snapshot()
      await writeTextFile(handle, content)
      fileHandle = handle; fileName = handle.name; lastSaved = version
      toast(t('savedOnComputer'))
    } else {
      // Sem File System Access, salvar oferece uma nova cópia por download.
      downloadText(htmlDocument(), 'entrelinhas.html', 'text/html')
      lastSaved = snapshot(); fileName = 'entrelinhas.html'
      toast(t('downloadFallback'))
    }
    updateFileStatus()
  } catch (error) { if (error.name !== 'AbortError') toast(t('saveError', { error: localizeMessage(error.message) })) }
  finally { busy = false }
}
$('save-file').addEventListener('click', () => saveFile())
$('save-as').addEventListener('click', () => saveFile(true))
$('download-html').addEventListener('click', () => { downloadText(htmlDocument(), 'entrelinhas.html', 'text/html'); toast(t('htmlDownloaded')) })
$('download').addEventListener('click', () => { downloadText(editor.getText(), 'entrelinhas.txt'); toast(t('textDownloaded')) })
$('open-file').addEventListener('click', () => { $('file-input').value = ''; $('file-input').click() })
$('file-input').addEventListener('change', async () => {
  const file = $('file-input').files[0]
  if (!file || busy) return
  busy = true
  try {
    if (file.size > MAX_FILE_BYTES) throw new Error('O limite para abrir arquivos é 2 MB.')
    const bytes = new Uint8Array(await file.arrayBuffer())
    const content = decodeTextFile(bytes)
    const formatted = /\.html?$/i.test(file.name)
    const imported = formatted ? cleanHTML(content) : { type: 'doc', content: content.split('\n').map(line => ({ type: 'paragraph', ...(line ? { content: [{ type: 'text', text: line }] } : {}) })) }
    await workspace.openFile({ name: file.name, sourceKey: await importSourceKey(file.name, bytes), seed: createImportSeed(imported) })
    toast(t('fileOpened'))
  } catch (error) { toast(t('openFileError', { error: localizeMessage(error.message) })) }
  finally { busy = false }
})

function openSearch() { if (!$('search-dialog').open) $('search-dialog').showModal(); $('search-query').focus() }
function searchResults() { return findMatches(editor.state.doc, $('search-query').value) }
$('search').addEventListener('click', openSearch)
function matchCount() { const count = searchResults().length; return t(count === 1 ? 'matchOne' : 'matches', { count: formatNumber(count) }) }
$('search-query').addEventListener('input', () => { activeMatch = null; $('search-result').textContent = matchCount() })
$('find-next').addEventListener('click', () => {
  const matches = searchResults()
  const next = matches.find(match => match.from >= (activeMatch?.to ?? editor.state.selection.to)) || matches[0]
  if (next) { editor.commands.setTextSelection(next); editor.commands.scrollIntoView(); activeMatch = next }
  $('search-result').textContent = `${matchCount()}${next ? ` · ${t('selectionUpdated')}` : ''}`
})
$('replace-one').addEventListener('click', () => {
  const matches = searchResults()
  const match = activeMatch && matches.find(m => m.from === activeMatch.from && m.to === activeMatch.to)
  if (!match) { $('search-result').textContent = t('chooseMatch'); return }
  const replacement = $('replace-query').value
  editor.commands.command(({ tr }) => { tr.insertText(replacement, match.from, match.to); return true })
  activeMatch = null; $('search-result').textContent = t('replacedOne', { count: formatNumber(searchResults().length) })
})
$('replace-all').addEventListener('click', () => {
  const matches = searchResults(); const replacement = $('replace-query').value
  editor.commands.command(({ tr }) => { for (const match of matches.toReversed()) tr.insertText(replacement, match.from, match.to); return matches.length > 0 })
  activeMatch = null; $('search-result').textContent = t('replacedAll', { count: formatNumber(matches.length) })
})
document.addEventListener('keydown', event => {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return
  const key = event.key.toLowerCase()
  if (key === 's') { event.preventDefault(); saveFile(event.shiftKey) }
  if (key === 'o') { event.preventDefault(); $('open-file').click() }
  if (key === 'f') { event.preventDefault(); openSearch() }
})
updateStats(); updateParticipants(); updateStatus(); updateFileStatus(); updateFormat(); checkSignaling()
if (initialError) toast(t('libraryUnavailable'))
onLanguageChange(() => {
  editor.setOptions({ editorProps: { ...editor.options.editorProps, attributes: { ...editor.options.editorProps.attributes, 'aria-label': t('sharedContent'), 'data-placeholder': t('placeholder') } } })
  updateStats(); updateStatus(); updateFileStatus(); updateParticipants()
  if ($('search-dialog').open) $('search-result').textContent = matchCount()
  $('toast').hidden = true
})
setInterval(checkSignaling, 30000)
window.addEventListener('online', checkSignaling)
