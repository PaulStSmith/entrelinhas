// SPDX-License-Identifier: MIT — Copyright (c) 2026 Paulo Santos
import test from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { IDBFactory } from 'fake-indexeddb'
import * as Y from 'yjs'
import { importSourceKey, createImportSeed } from '../src/imports.js'
import { createLibrary } from '../src/library.js'
import { createHTMLSanitizer } from '../src/richtext.js'

test('file identity distinguishes names and changed contents, not timestamps', async () => {
  const bytes = new TextEncoder().encode('Hello')
  const key = await importSourceKey('Notes.txt', bytes)
  assert.equal(key, await importSourceKey('Notes.txt', bytes.slice()))
  assert.notEqual(key, await importSourceKey('Other.txt', bytes))
  assert.notEqual(key, await importSourceKey('Notes.txt', new TextEncoder().encode('Changed')))
})

test('opening imports creates one independent document and preserves edited replicas on reopen', async () => {
  const page = new JSDOM('<body></body>')
  const oldWindow = globalThis.window, oldDocument = globalThis.document
  globalThis.window = page.window; globalThis.document = page.window.document
  const indexedDB = new IDBFactory()
  const library = createLibrary(indexedDB)
  const active = new Y.Doc(), replica = new Y.Doc(), reloaded = new Y.Doc()
  try {
    active.getText('original').insert(0, 'Keep the current notebook')
    const clean = createHTMLSanitizer(page.window)
    const content = clean('<h2>Imported title</h2><p><strong>Hello</strong></p><script>alert(1)</script>')
    const seed = createImportSeed(content)
    const sourceKey = await importSourceKey('Notes.html', new TextEncoder().encode(content))
    const input = { sourceKey, name: 'Notes.html', seed }
    const records = await Promise.all([library.openImportedDocument(input), library.openImportedDocument(input)])
    assert.equal(records[0].room, records[1].room)
    assert.equal(records[0].title, 'Notes.html')
    assert.equal((await library.listDocuments()).length, 1)
    assert.equal(active.getText('original').toString(), 'Keep the current notebook')
    Y.applyUpdate(replica, records[0].seed)
    const fragment = replica.getXmlFragment('conteudo')
    assert.match(fragment.toString(), /Imported title/)
    assert.match(fragment.toString(), /bold/)
    assert.doesNotMatch(fragment.toString(), /script|alert/)
    fragment.delete(0, fragment.length)
    await library.touchDocument(records[0].room, 'My renamed notes')
    await library.close()
    const reopened = await library.openImportedDocument({ ...input, seed: createImportSeed('<p>Must not replace edits</p>') })
    assert.equal(reopened.room, records[0].room)
    assert.equal(reopened.title, 'My renamed notes')
    Y.applyUpdate(reloaded, Y.encodeStateAsUpdate(replica)); Y.applyUpdate(reloaded, reopened.seed)
    assert.equal(reloaded.getXmlFragment('conteudo').length, 0)
    const changed = await library.openImportedDocument({ ...input, sourceKey: await importSourceKey('Notes.html', new TextEncoder().encode('Changed')) })
    assert.notEqual(changed.room, reopened.room)
    assert.equal((await library.listDocuments()).length, 2)
    const plain = new Y.Doc()
    Y.applyUpdate(plain, createImportSeed({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<literal>' }] }] }))
    assert.equal(plain.getXmlFragment('conteudo').get(0).get(0).toString(), '<literal>')
    plain.destroy()
  } finally {
    active.destroy(); replica.destroy(); reloaded.destroy(); await library.close()
    globalThis.window = oldWindow; globalThis.document = oldDocument; page.window.close()
  }
})
