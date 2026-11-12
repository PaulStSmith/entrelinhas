// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Paulo Santos

export const PUBLIC_ROOM = 'caderno-publico'
export const MAX_CHECKPOINTS = 20
export const MAX_HISTORY_BYTES = 20 * 1024 * 1024
const validRoom = room => typeof room === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(room)
export function documentTitle(title) {
  return String(title || '').trim().slice(0, 100) || 'Documento sem título'
}
export function documentURL(room, base) {
  if (!validRoom(room)) throw new Error('Sala inválida.')
  const url = new URL(base)
  if (room === PUBLIC_ROOM) url.searchParams.delete('sala')
  else url.searchParams.set('sala', room)
  url.hash = ''
  return url.href
}
export function createLibrary(indexedDB, databaseName = 'entrelinhas-library-v1') {
  let connection
  function open() {
    if (!connection) connection = new Promise((resolve, reject) => {
      if (!indexedDB) { reject(new Error('Armazenamento local indisponível.')); return }
      const request = indexedDB.open(databaseName, 1)
      request.onupgradeneeded = () => {
        const db = request.result
        db.createObjectStore('documents', { keyPath: 'room' })
        const history = db.createObjectStore('checkpoints', { keyPath: 'id' })
        history.createIndex('room', 'room')
      }
      request.onsuccess = () => {
        const db = request.result
        db.onversionchange = () => { db.close(); connection = null }
        resolve(db)
      }
      request.onerror = () => { connection = null; reject(request.error) }
      request.onblocked = () => { connection = null; reject(new Error('Feche outras abas do editor e tente novamente.')) }
    })
    return connection
  }
  async function transaction(stores, mode, action) {
    const db = await open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(stores, mode)
      let result
      tx.oncomplete = () => resolve(result)
      tx.onabort = () => reject(tx.error || new Error('Não foi possível gravar no armazenamento local.'))
      tx.onerror = () => {} // onabort reports the final transaction result.
      try { action(tx, value => { result = value }) } catch (error) { tx.abort(); reject(error) }
    })
  }
  return {
    getDocument(room) {
      return transaction(['documents'], 'readonly', (tx, done) => {
        tx.objectStore('documents').get(room).onsuccess = event => done(event.target.result)
      })
    },
    listDocuments() {
      return transaction(['documents'], 'readonly', (tx, done) => {
        tx.objectStore('documents').getAll().onsuccess = event => done(event.target.result.sort((a, b) => b.updatedAt - a.updatedAt))
      })
    },
    async discoverDocuments() {
      // Browsers without enumeration still register every room when it is opened.
      if (typeof indexedDB?.databases !== 'function') return
      const databases = await indexedDB.databases().catch(() => [])
      for (const { name } of databases) {
        if (!name?.startsWith('entrelinhas-rich-v2-')) continue
        const room = name.slice('entrelinhas-rich-v2-'.length)
        if (validRoom(room) && !await this.getDocument(room)) await this.touchDocument(room)
      }
    },
    touchDocument(room, title) {
      if (!validRoom(room)) return Promise.reject(new Error('Sala inválida.'))
      return transaction(['documents'], 'readwrite', (tx, done) => {
        const store = tx.objectStore('documents')
        store.get(room).onsuccess = event => {
          const previous = event.target.result
          const now = Date.now()
          const value = { ...previous, room, title: title === undefined && previous ? previous.title : documentTitle(title || (room === PUBLIC_ROOM ? 'Nosso caderno compartilhado' : `Sala ${room}`)), createdAt: previous?.createdAt || now, updatedAt: now }
          store.put(value); done(value)
        }
      })
    },
    createDocument({ room, title, seed }) {
      if (!validRoom(room) || room === PUBLIC_ROOM) return Promise.reject(new Error('Sala inválida.'))
      return transaction(['documents'], 'readwrite', (tx, done) => {
        const now = Date.now()
        const value = { room, title: documentTitle(title), createdAt: now, updatedAt: now, ...(seed ? { seed } : {}) }
        tx.objectStore('documents').add(value); done(value)
      })
    },
    listCheckpoints(room) {
      return transaction(['checkpoints'], 'readonly', (tx, done) => {
        tx.objectStore('checkpoints').index('room').getAll(room).onsuccess = event => done(event.target.result.sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id)))
      })
    },
    saveCheckpoint(room, { update, html, text, reason = 'Automático' }) {
      if (!validRoom(room) || !(update instanceof Uint8Array) || typeof html !== 'string' || typeof text !== 'string') return Promise.reject(new Error('Versão inválida.'))
      const bytes = update.byteLength + new TextEncoder().encode(html + text).byteLength
      if (bytes > MAX_HISTORY_BYTES) return Promise.reject(new Error('Documento grande demais para o histórico local. Baixe uma cópia HTML.'))
      return transaction(['checkpoints', 'documents'], 'readwrite', (tx, done) => {
        const store = tx.objectStore('checkpoints')
        store.index('room').getAll(room).onsuccess = event => {
          const previous = event.target.result.sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id))
          if (previous[0]?.html === html) { done(previous[0]); return }
          const now = Math.max(Date.now(), (previous[0]?.createdAt || 0) + 1)
          const checkpoint = { id: crypto.randomUUID(), room, createdAt: now, reason: String(reason).slice(0, 60), update, html, text, bytes }
          let retainedBytes = bytes
          let retainedCount = 1
          for (const item of previous) {
            if (retainedCount < MAX_CHECKPOINTS && retainedBytes + item.bytes <= MAX_HISTORY_BYTES) {
              retainedCount++; retainedBytes += item.bytes
            } else store.delete(item.id)
          }
          store.add(checkpoint)
          const documents = tx.objectStore('documents')
          documents.get(room).onsuccess = event => {
            if (event.target.result) documents.put({ ...event.target.result, updatedAt: now })
          }
          done(checkpoint)
        }
      })
    },
    async close() { if (connection) (await connection).close(); connection = null }
  }
}
