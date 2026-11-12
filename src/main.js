import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'
import { IndexeddbPersistence } from 'y-indexeddb'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCaret from '@tiptap/extension-collaboration-caret'
import { createHTMLSanitizer, wrapHTML } from './richtext.js'
import { decodeTextFile, downloadText, writeTextFile, textFileTypes, MAX_FILE_BYTES } from './files.js'
import { findMatches } from './search.js'
import './style.css'

const $ = id => document.getElementById(id)
const signaling = import.meta.env.VITE_SIGNALING_URL || 'wss://editor-crdt-byteforge-gcgzh6bmbcf2eudx.canadacentral-01.azurewebsites.net'
const requestedRoom = new URL(location.href).searchParams.get('sala')
const room = requestedRoom && /^[a-zA-Z0-9_-]{1,64}$/.test(requestedRoom) ? requestedRoom : 'caderno-publico'
// A versão separa o documento XML formatado da primeira demonstração Y.Text.
const roomKey = `entrelinhas-rich-v2-${room}`
const doc = new Y.Doc()
const persistence = new IndexeddbPersistence(roomKey, doc)
const provider = new WebrtcProvider(roomKey, doc, { signaling: [signaling], maxConns: 8 })
let storageReady = false, storageFailed = false, disconnected = false
let peerCount = 0, localPeers = 0, signalReachable = false
let fileHandle = null, fileName = 'entrelinhas.html', lastSaved = null, busy = false
let pendingImport = null, toastTimer, activeMatch = null
const colors = ['#216957', '#a94e37', '#5d5aa5', '#936416', '#256d94']
const color = colors[crypto.getRandomValues(new Uint32Array(1))[0] % colors.length]
let savedName
try { savedName = localStorage.getItem('entrelinhas-name') } catch {}
$('name').value = savedName || `Pessoa ${Math.floor(Math.random() * 900 + 100)}`
function identity() { return { name: $('name').value.trim() || 'Pessoa anônima', color } }
function updateIdentity() {
  provider.awareness.setLocalState({ ...provider.awareness.getLocalState(), user: identity() })
  try { localStorage.setItem('entrelinhas-name', identity().name) } catch {}
}
updateIdentity()
const cleanHTML = createHTMLSanitizer(window)
const editor = new Editor({
  element: $('editor'),
  extensions: [
    StarterKit.configure({ undoRedo: false, heading: { levels: [1, 2, 3] }, link: { openOnClick: false, autolink: false } }),
    Collaboration.configure({ document: doc, field: 'conteudo' }),
    CollaborationCaret.configure({ provider, user: identity() })
  ],
  editorProps: {
    attributes: { role: 'textbox', 'aria-multiline': 'true', 'aria-label': 'Conteúdo do documento compartilhado', spellcheck: 'true', 'data-placeholder': 'Comece uma ideia. Convide outra pessoa para continuar…' },
    transformPastedHTML: cleanHTML
  },
  onUpdate: () => { updateStats(); updateFileStatus(); activeMatch = null },
  onSelectionUpdate: updateFormat,
  onTransaction: updateFormat
})
function updateStats() {
  const content = editor.getText()
  const words = content.trim() ? content.trim().split(/\s+/u).length : 0
  $('stats').textContent = `${words} ${words === 1 ? 'palavra' : 'palavras'} · ${content.length} caracteres`
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
  $('connection').textContent = disconnected ? 'Reconectar' : 'Simular desconexão'
  $('connection').setAttribute('aria-pressed', String(disconnected))
  $('status-dot').classList.toggle('offline', disconnected || !signalReachable)
  const peers = peerCount ? `${peerCount} ${peerCount === 1 ? 'conexão WebRTC' : 'conexões WebRTC'}` : localPeers ? `${localPeers} ${localPeers === 1 ? 'aba local conectada' : 'abas locais conectadas'}` : signalReachable ? 'Aguardando participantes' : 'Sinalização indisponível · edição local'
  $('status').textContent = `${disconnected ? 'Desconectado · edição local' : peers} · ${storageFailed ? 'armazenamento local indisponível' : storageReady ? 'armazenamento local ativo' : 'abrindo armazenamento local'}`
}
function updateParticipants() {
  $('participants').replaceChildren()
  const states = disconnected ? [[doc.clientID, { user: identity() }]] : [...provider.awareness.getStates()]
  for (const [id, state] of states) {
    if (typeof state?.user?.name !== 'string') continue
    const badge = document.createElement('span'); badge.className = 'avatar'
    badge.textContent = state.user.name.slice(0, 2).toUpperCase()
    badge.title = `${state.user.name.slice(0, 32)}${id === doc.clientID ? ' (você)' : ''}`
    badge.setAttribute('aria-label', badge.title); badge.style.backgroundColor = colors[id % colors.length]
    $('participants').append(badge)
  }
}
provider.on('peers', ({ webrtcPeers, bcPeers }) => { peerCount = webrtcPeers.length; localPeers = bcPeers.length; updateStatus() })
provider.awareness.on('change', updateParticipants)
persistence.whenSynced.then(() => { storageReady = true; updateStats(); updateStatus() }).catch(() => {
  storageFailed = true; updateStatus(); toast('Armazenamento local indisponível. Salve uma cópia antes de fechar.')
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
  $('toast').textContent = message; $('toast').hidden = false
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true }, 5000)
}
$('share').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.href); toast('Link copiado. Convide alguém para escrever com você.') }
  catch { toast('Copie o endereço da barra do navegador para compartilhar.') }
})

// Arquivos permanecem locais. Somente seu conteúdo importado entra no CRDT.
function snapshot() { return JSON.stringify(editor.getJSON()) }
function updateFileStatus() {
  const changed = lastSaved !== null && lastSaved !== snapshot()
  const name = fileHandle?.name || fileName
  $('file-status').textContent = lastSaved === null ? 'Cópia no navegador · salve em HTML para guardar o arquivo' : `${name} · ${changed ? 'alterações não salvas no arquivo' : fileHandle ? 'arquivo salvo' : 'cópia importada ou baixada' }${/\.txt$/i.test(name) ? ' · TXT sem formatação' : ''}`
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
      toast('Arquivo salvo no computador.')
    } else {
      // Sem File System Access, salvar oferece uma nova cópia por download.
      downloadText(htmlDocument(), 'entrelinhas.html', 'text/html')
      lastSaved = snapshot(); fileName = 'entrelinhas.html'
      toast('Cópia HTML enviada aos downloads. Este navegador não grava diretamente no arquivo original.')
    }
    updateFileStatus()
  } catch (error) { if (error.name !== 'AbortError') toast(`Não foi possível salvar: ${error.message}`) }
  finally { busy = false }
}
$('save-file').addEventListener('click', () => saveFile())
$('save-as').addEventListener('click', () => saveFile(true))
$('download-html').addEventListener('click', () => { downloadText(htmlDocument(), 'entrelinhas.html', 'text/html'); toast('Cópia HTML baixada com formatação.') })
$('download').addEventListener('click', () => { downloadText(editor.getText(), 'entrelinhas.txt'); toast('Cópia TXT baixada sem formatação.') })
$('open-file').addEventListener('click', () => { $('file-input').value = ''; $('file-input').click() })
$('file-input').addEventListener('change', async () => {
  const file = $('file-input').files[0]
  if (!file) return
  try {
    if (file.size > MAX_FILE_BYTES) throw new Error('O limite para abrir arquivos é 2 MB.')
    const content = decodeTextFile(new Uint8Array(await file.arrayBuffer()))
    const formatted = /\.html?$/i.test(file.name)
    pendingImport = { name: file.name, content: formatted ? cleanHTML(content) : { type: 'doc', content: content.split('\n').map(line => ({ type: 'paragraph', ...(line ? { content: [{ type: 'text', text: line }] } : {}) })) } }
    $('import-filename').textContent = file.name; $('import-dialog').returnValue = ''; $('import-dialog').showModal()
  } catch (error) { toast(error.message) }
})
$('import-dialog').addEventListener('close', () => {
  if ($('import-dialog').returnValue === 'confirm' && pendingImport) {
    editor.commands.setContent(pendingImport.content)
    fileName = /\.html?$/i.test(pendingImport.name) ? pendingImport.name.replace(/\.htm$/i, '.html') : pendingImport.name.replace(/\.[^.]+$/, '') + '.html'
    fileHandle = null; lastSaved = snapshot(); updateFileStatus()
    toast('Arquivo aberto e conteúdo compartilhado. A primeira gravação pedirá um destino.')
  }
  pendingImport = null
})

function openSearch() { if (!$('search-dialog').open) $('search-dialog').showModal(); $('search-query').focus() }
function searchResults() { return findMatches(editor.state.doc, $('search-query').value) }
$('search').addEventListener('click', openSearch)
$('search-query').addEventListener('input', () => { activeMatch = null; $('search-result').textContent = `${searchResults().length} ocorrência(s)` })
$('find-next').addEventListener('click', () => {
  const matches = searchResults()
  const next = matches.find(match => match.from >= (activeMatch?.to ?? editor.state.selection.to)) || matches[0]
  if (next) { editor.commands.setTextSelection(next); editor.commands.scrollIntoView(); activeMatch = next }
  $('search-result').textContent = `${matches.length} ocorrência(s)${next ? ' · seleção atualizada no documento' : ''}`
})
$('replace-one').addEventListener('click', () => {
  const matches = searchResults()
  const match = activeMatch && matches.find(m => m.from === activeMatch.from && m.to === activeMatch.to)
  if (!match) { $('search-result').textContent = 'Clique em Próximo para selecionar uma ocorrência atual.'; return }
  const replacement = $('replace-query').value
  editor.commands.command(({ tr }) => { tr.insertText(replacement, match.from, match.to); return true })
  activeMatch = null; $('search-result').textContent = `Substituição aplicada · ${searchResults().length} ocorrência(s) restantes`
})
$('replace-all').addEventListener('click', () => {
  const matches = searchResults(); const replacement = $('replace-query').value
  editor.commands.command(({ tr }) => { for (const match of matches.toReversed()) tr.insertText(replacement, match.from, match.to); return matches.length > 0 })
  activeMatch = null; $('search-result').textContent = `${matches.length} substituição(ões) aplicada(s)`
})
document.addEventListener('keydown', event => {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return
  const key = event.key.toLowerCase()
  if (key === 's') { event.preventDefault(); saveFile(event.shiftKey) }
  if (key === 'o') { event.preventDefault(); $('open-file').click() }
  if (key === 'f' && !$('import-dialog').open) { event.preventDefault(); openSearch() }
})
if (room !== 'caderno-publico') $('document-label').textContent = `Sala ${room}`
updateStats(); updateParticipants(); updateStatus(); updateFileStatus(); updateFormat(); checkSignaling()
setInterval(checkSignaling, 30000)
window.addEventListener('online', checkSignaling)
