// SPDX-License-Identifier: MIT — Copyright (c) 2026 Paulo Santos
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { IDBFactory } from 'fake-indexeddb'
import * as Y from 'yjs'
import { createLibrary } from '../src/library.js'
import { createWorkspace } from '../src/workspace.js'
import { initializeI18n } from '../src/i18n.js'

const until = async predicate => {
  for (let i = 0; i < 100; i++) {
    if (predicate()) return
    await new Promise(resolve => setTimeout(resolve, 5))
  }
  assert.fail('UI did not finish updating')
}

test('trash button cancels safely and removes the open document without autosave resurrection', async () => {
  const page = new JSDOM(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), { url: 'https://editor.byteforge.biz/' })
  const previous = { window: globalThis.window, document: globalThis.document, location: globalThis.location }
  globalThis.window = page.window; globalThis.document = page.window.document; globalThis.location = page.window.location
  const library = createLibrary(new IDBFactory()), doc = new Y.Doc()
  try {
    initializeI18n({ document: page.window.document, navigator: { languages: ['en'] } })
    const initialRecord = await library.createDocument({ room: 'doc-current', title: 'Notes <safe>.txt' })
    await library.createDocument({ room: 'doc-other', title: 'Other document' })
    const dialog = page.window.document.getElementById('documents-dialog')
    dialog.showModal = () => { dialog.open = true }
    let confirmation, toast
    page.window.confirm = message => { confirmation = message; return false }
    const workspace = createWorkspace({ editor: { getHTML: () => '<p>Important</p>', getText: () => 'Important' }, doc, library, room: 'doc-current', cleanHTML: html => html, toast: message => { toast = message }, isReady: () => true, initialRecord })
    await workspace.start()
    page.window.document.getElementById('documents').click()
    await until(() => dialog.open || toast)
    assert.equal(toast, undefined)
    const button = [...dialog.querySelectorAll('.remove-document')].find(item => item.getAttribute('aria-label').includes('Notes <safe>.txt'))
    assert.ok(button.querySelector('use[href="#i-trash"]'))
    button.click()
    assert.match(confirmation, /local history/)
    assert.equal((await library.listDocuments()).length, 2)
    assert.equal((await library.listCheckpoints('doc-current')).length, 1)
    page.window.confirm = () => true
    button.click()
    await until(() => toast === 'Removed from My documents')
    assert.equal(dialog.querySelectorAll('.remove-document').length, 1)
    assert.equal((await library.listCheckpoints('doc-current')).length, 0)
    workspace.changed()
    assert.equal(await workspace.capture(), null)
    assert.equal((await library.listDocuments()).length, 1)
    assert.equal(page.window.document.getElementById('document-title').textContent, 'Notes <safe>.txt')
    assert.equal(page.window.document.activeElement.id, 'document-filter')
  } finally {
    await library.close(); doc.destroy(); page.window.close()
    globalThis.window = previous.window; globalThis.document = previous.document; globalThis.location = previous.location
  }
})
