import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'
import { IndexeddbPersistence } from 'y-indexeddb'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, placeholder } from '@codemirror/view'
import { yCollab, yUndoManagerKeymap } from 'y-codemirror.next'
import './style.css'

const $ = id => document.getElementById(id)
const signaling = import.meta.env.VITE_SIGNALING_URL || 'wss://editor-crdt-byteforge-gcgzh6bmbcf2eudx.canadacentral-01.azurewebsites.net'
// A sala padrão é única e pública. Salas adicionais permitem testes isolados.
const requestedRoom = new URL(location.href).searchParams.get('sala')
const room = requestedRoom && /^[a-zA-Z0-9_-]{1,64}$/.test(requestedRoom) ? requestedRoom : 'caderno-publico-v1'
const doc = new Y.Doc()
const text = doc.getText('documento')
const persistence = new IndexeddbPersistence(`entrelinhas-${room}`, doc)
let storageReady = false
let storageFailed = false
let disconnected = false
let peerCount = 0
let localPeers = 0
let signalReachable = false
const colors = ['#216957', '#a94e37', '#5d5aa5', '#936416', '#256d94']
const color = colors[crypto.getRandomValues(new Uint32Array(1))[0] % colors.length]
let savedName
try { savedName = localStorage.getItem('entrelinhas-name') } catch { /* A edição continua sem preferências persistentes. */ }
$('name').value = savedName || `Pessoa ${Math.floor(Math.random() * 900 + 100)}`

// O servidor apenas encaminha sinalização; o documento é combinado nos nós.
const provider = new WebrtcProvider(`entrelinhas-${room}`, doc, { signaling: [signaling], maxConns: 8 })
function updateIdentity() {
  const name = $('name').value.trim() || 'Pessoa anônima'
  // disconnect() remove a presença local. setLocalState também a recria ao voltar.
  provider.awareness.setLocalState({ ...provider.awareness.getLocalState(), user: { name, color, colorLight: `${color}33` } })
  try { localStorage.setItem('entrelinhas-name', name) } catch { /* Preferência opcional. */ }
}
updateIdentity()
$('name').addEventListener('input', updateIdentity)

const undoManager = new Y.UndoManager(text)
const view = new EditorView({
  state: EditorState.create({
    doc: text.toString(),
    extensions: [
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({ 'aria-label': 'Conteúdo do documento compartilhado', spellcheck: 'true' }),
      placeholder('Comece uma ideia. Convide outra pessoa para continuar…'),
      yCollab(text, provider.awareness, { undoManager }),
      keymap.of(yUndoManagerKeymap),
      EditorView.updateListener.of(update => { if (update.docChanged) updateStats() })
    ]
  }),
  parent: $('editor')
})
function updateStats() {
  const content = text.toString()
  const words = content.trim() ? content.trim().split(/\s+/u).length : 0
  $('stats').textContent = `${words} ${words === 1 ? 'palavra' : 'palavras'} · ${content.length} caracteres`
}
function updateStatus() {
  $('offline-banner').hidden = !disconnected
  $('connection').textContent = disconnected ? 'Reconectar' : 'Simular desconexão'
  $('connection').setAttribute('aria-pressed', String(disconnected))
  $('status-dot').classList.toggle('offline', disconnected || !signalReachable)
  const peers = peerCount ? `${peerCount} ${peerCount === 1 ? 'conexão WebRTC' : 'conexões WebRTC'}` : localPeers ? `${localPeers} ${localPeers === 1 ? 'aba local conectada' : 'abas locais conectadas'}` : signalReachable ? 'Aguardando participantes' : 'Sinalização indisponível · edição local'
  const storage = storageFailed ? 'armazenamento local indisponível' : storageReady ? 'armazenamento local ativo' : 'abrindo armazenamento local'
  $('status').textContent = `${disconnected ? 'Desconectado · edição local' : peers} · ${storage}`
}
function updateParticipants() {
  $('participants').replaceChildren()
  const states = disconnected ? [[doc.clientID, provider.awareness.getLocalState()]] : [...provider.awareness.getStates()]
  for (const [id, state] of states) {
    if (!state?.user) continue
    const badge = document.createElement('span')
    badge.className = 'avatar'
    badge.textContent = state.user.name.slice(0, 2).toUpperCase()
    // Nomes remotos entram como texto; nunca são interpretados como HTML.
    badge.title = `${state.user.name}${id === doc.clientID ? ' (você)' : ''}`
    badge.setAttribute('aria-label', badge.title)
    // Usa a paleta local para não confiar em CSS recebido de outro participante.
    badge.style.backgroundColor = colors[id % colors.length]
    $('participants').append(badge)
  }
}
provider.on('peers', ({ webrtcPeers, bcPeers }) => {
  peerCount = webrtcPeers.length
  localPeers = bcPeers.length
  updateStatus()
})
provider.awareness.on('change', updateParticipants)
persistence.whenSynced.then(() => { storageReady = true; updateStats(); updateStatus() }).catch(() => {
  storageFailed = true; updateStatus(); toast('Não foi possível abrir o armazenamento local. Baixe uma cópia antes de fechar.')
})
$('connection').addEventListener('click', () => {
  disconnected = !disconnected
  if (disconnected) { provider.disconnect(); peerCount = 0; localPeers = 0 }
  else { provider.connect(); updateIdentity(); checkSignaling() }
  updateStatus(); updateParticipants()
})
async function checkSignaling() {
  try {
    const url = new URL(signaling)
    url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:'
    url.pathname = '/health'
    const response = await fetch(url, { signal: AbortSignal.timeout(8000), cache: 'no-store' })
    signalReachable = response.ok
  } catch { signalReachable = false }
  updateStatus()
}
let toastTimer
function toast(message) {
  $('toast').textContent = message; $('toast').hidden = false
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true }, 4000)
}
$('share').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.href); toast('Link copiado. Convide alguém para escrever com você.') }
  catch { toast('Copie o endereço da barra do navegador para compartilhar.') }
})
$('download').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([text.toString()], { type: 'text/plain;charset=utf-8' }))
  const a = document.createElement('a'); a.href = url; a.download = 'entrelinhas.txt'; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
})
if (room !== 'caderno-publico-v1') $('document-label').textContent = `Sala ${room}`
updateStats(); updateParticipants(); updateStatus(); checkSignaling()
setInterval(checkSignaling, 30000)
window.addEventListener('online', checkSignaling)
