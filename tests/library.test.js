// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Paulo Santos
import test from 'node:test'
import assert from 'node:assert/strict'
import { IDBFactory } from 'fake-indexeddb'
import * as Y from 'yjs'
import { createLibrary, documentURL, MAX_CHECKPOINTS, MAX_HISTORY_BYTES } from '../src/library.js'

test('biblioteca preserva nomes, sementes e dados entre conexões e rejeita salas duplicadas', async () => {
  const indexedDB = new IDBFactory()
  const library = createLibrary(indexedDB)
  const original = new Y.Doc(); original.getText('teste').insert(0, 'Documento original')
  await library.createDocument({ room: 'doc-copia', title: '  Minha cópia  ', seed: Y.encodeStateAsUpdate(original) })
  await library.touchDocument('doc-copia')
  await assert.rejects(library.createDocument({ room: 'doc-copia', title: 'Sobrescrever' }))
  await library.close()
  const reopened = createLibrary(indexedDB)
  const record = await reopened.getDocument('doc-copia')
  assert.equal(record.title, 'Minha cópia')
  const copy = new Y.Doc(); Y.applyUpdate(copy, record.seed)
  copy.getText('teste').delete(0, 9)
  const later = Y.encodeStateAsUpdate(copy)
  const reload = new Y.Doc(); Y.applyUpdate(reload, later); Y.applyUpdate(reload, record.seed)
  assert.equal(reload.getText('teste').toString(), copy.getText('teste').toString())
  assert.equal(original.getText('teste').toString(), 'Documento original')
  assert.equal((await reopened.listDocuments()).length, 1)
  await reopened.close(); original.destroy(); copy.destroy(); reload.destroy()
})

test('histórico serializa gravações concorrentes, deduplica conteúdo e retém as versões recentes por sala', async () => {
  const library = createLibrary(new IDBFactory())
  await library.touchDocument('sala-a')
  await library.touchDocument('sala-b')
  const checkpoint = i => ({ update: new Uint8Array([i]), html: `<p>Versão ${i}</p>`, text: `Versão ${i}` })
  await library.saveCheckpoint('sala-b', checkpoint(99))
  await Promise.all(Array.from({ length: MAX_CHECKPOINTS + 5 }, (_, i) => library.saveCheckpoint('sala-a', checkpoint(i))))
  let history = await library.listCheckpoints('sala-a')
  assert.equal(history.length, MAX_CHECKPOINTS)
  assert.equal(history[0].text, 'Versão 24')
  assert.equal(history.at(-1).text, 'Versão 5')
  const latest = await library.saveCheckpoint('sala-a', checkpoint(24))
  assert.equal(latest.id, history[0].id)
  assert.equal((await library.listCheckpoints('sala-a')).length, MAX_CHECKPOINTS)
  assert.equal((await library.listCheckpoints('sala-b'))[0].text, 'Versão 99')
  await library.close()
})

test('limites de histórico preservam a versão existente se uma versão nova for grande demais', async () => {
  const library = createLibrary(new IDBFactory())
  await library.saveCheckpoint('sala', { update: new Uint8Array(1), html: '<p>Importante</p>', text: 'Importante' })
  await assert.rejects(library.saveCheckpoint('sala', { update: new Uint8Array(MAX_HISTORY_BYTES + 1), html: '', text: '' }), /grande demais/)
  assert.equal((await library.listCheckpoints('sala'))[0].text, 'Importante')
  const update = new Uint8Array(MAX_HISTORY_BYTES / 2)
  await library.saveCheckpoint('sala', { update, html: '<p>A</p>', text: 'A' })
  await library.saveCheckpoint('sala', { update, html: '<p>B</p>', text: 'B' })
  const history = await library.listCheckpoints('sala')
  assert.equal(history[0].text, 'B')
  assert.ok(history.reduce((total, item) => total + item.bytes, 0) <= MAX_HISTORY_BYTES)
  await library.close()
})

test('URLs mantêm a origem e as salas existentes sem aceitar identificadores inválidos', () => {
  assert.equal(documentURL('caderno-publico', 'https://editor.byteforge.biz/?sala=outra#fim'), 'https://editor.byteforge.biz/')
  assert.equal(documentURL('doc-novo', 'https://editor.byteforge.biz/?sala=outra'), 'https://editor.byteforge.biz/?sala=doc-novo')
  assert.throws(() => documentURL('../outra', 'https://editor.byteforge.biz/'))
})

test('descobre réplicas anteriores sem alterar seus dados ou nomes já cadastrados', async () => {
  const indexedDB = new IDBFactory()
  const request = indexedDB.open('entrelinhas-rich-v2-sala-antiga')
  const replica = await new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) })
  const library = createLibrary(indexedDB)
  await library.discoverDocuments()
  assert.equal((await library.getDocument('sala-antiga')).title, 'Sala sala-antiga')
  await library.touchDocument('sala-antiga', 'Nome preservado')
  await library.discoverDocuments()
  assert.equal((await library.getDocument('sala-antiga')).title, 'Nome preservado')
  assert.equal(replica.name, 'entrelinhas-rich-v2-sala-antiga')
  await library.close(); replica.close()
})

test('uma transação abortada não apaga versões durante a retenção', async context => {
  const library = createLibrary(new IDBFactory())
  const value = i => ({ update: new Uint8Array([i]), html: `<p>${i}</p>`, text: String(i) })
  for (let i = 0; i < MAX_CHECKPOINTS; i++) await library.saveCheckpoint('sala', value(i))
  const before = await library.listCheckpoints('sala')
  context.mock.method(crypto, 'randomUUID', () => before[0].id)
  await assert.rejects(library.saveCheckpoint('sala', value(100)))
  const after = await library.listCheckpoints('sala')
  assert.deepEqual(after.map(item => item.id), before.map(item => item.id))
  await library.close()
})
