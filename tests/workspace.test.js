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
  let workspace
  try {
    initializeI18n({ document: page.window.document, navigator: { languages: ['en'] } })
    const initialRecord = await library.createDocument({ room: 'doc-current', title: 'Notes <safe>.txt' })
    await library.createDocument({ room: 'doc-other', title: 'Other document' })
    const dialog = page.window.document.getElementById('documents-dialog')
    dialog.showModal = () => { dialog.open = true }
    let confirmation, toast
    page.window.confirm = message => { confirmation = message; return false }
    workspace = createWorkspace({ editor: { getHTML: () => '<p>Important</p>', getText: () => 'Important' }, doc, library, room: 'doc-current', cleanHTML: html => html, toast: message => { toast = message }, isReady: () => true, initialRecord })
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
    await workspace.save()
    assert.equal((await library.listDocuments()).length, 2)
    assert.equal((await library.listCheckpoints('doc-current')).length, 1)
    await workspace.save()
    assert.equal((await library.listDocuments()).length, 2)
    assert.equal((await library.listCheckpoints('doc-current')).length, 1)
  } finally {
    workspace?.dispose()
    await library.close(); doc.destroy(); page.window.close()
    globalThis.window = previous.window; globalThis.document = previous.document; globalThis.location = previous.location
  }
})

test('library actions share without navigating, rename selected documents, and localize tooltips', async () => {
  const page = new JSDOM(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), { url: 'https://editor.byteforge.biz/' })
  const previous = { window: globalThis.window, document: globalThis.document, location: globalThis.location }
  globalThis.window = page.window; globalThis.document = page.window.document; globalThis.location = page.window.location
  const library = createLibrary(new IDBFactory()), doc = new Y.Doc()
  let workspace
  try {
    const i18n = initializeI18n({ document: page.window.document, navigator: { languages: ['en'] } })
    const initialRecord = await library.createDocument({ room: 'doc-current', title: 'Current' })
    const imported = await library.openImportedDocument({ sourceKey: 'b'.repeat(64), name: 'Other.txt', seed: new Uint8Array([1]) })
    const $ = id => page.window.document.getElementById(id)
    for (const id of ['documents-dialog', 'rename-dialog']) {
      $(id).showModal = () => { $(id).open = true }
      $(id).close = () => { $(id).open = false }
    }
    let toast
    workspace = createWorkspace({ editor: { getHTML: () => '<p>Important</p>', getText: () => 'Important' }, doc, library, room: 'doc-current', cleanHTML: html => html, toast: message => { toast = message }, isReady: () => true, initialRecord })
    await workspace.start(); $('documents').click()
    await until(() => $('documents-dialog').open)
    const pencil = target => [...$('document-list').querySelectorAll('.rename-document')].find(button => button.dataset.room === target)
    const otherPencil = pencil(imported.room)
    assert.equal(otherPencil.title, 'Rename “Other.txt”')
    assert.equal(otherPencil.getAttribute('aria-label'), otherPencil.title)
    assert.ok(otherPencil.querySelector('use[href="#i-pencil"]'))
    let copied
    Object.defineProperty(page.window.navigator, 'clipboard', { value: { writeText: async text => { copied = text } } })
    const share = otherPencil.previousElementSibling
    assert.equal(share.title, 'Copy link to “Other.txt”')
    assert.equal(share.getAttribute('aria-label'), share.title)
    share.click()
    await until(() => copied !== undefined)
    assert.equal(copied, `https://editor.byteforge.biz/?sala=${imported.room}`)
    assert.equal(page.window.location.href, 'https://editor.byteforge.biz/')
    assert.equal($('document-title').textContent, 'Current')
    page.window.navigator.clipboard.writeText = async () => { throw new Error('Blocked') }
    share.click()
    await until(() => toast?.startsWith('Could not copy the link'))
    toast = undefined
    const trash = otherPencil.nextElementSibling
    assert.equal(trash.title, 'Remove “Other.txt” from My documents')
    assert.equal(trash.getAttribute('aria-label'), trash.title)
    otherPencil.click()
    assert.equal($('rename-title').value, 'Other.txt')
    $('rename-title').value = 'Cancelled change'
    $('rename-dialog').querySelector('[data-close]').click()
    assert.equal((await library.getDocument(imported.room)).title, 'Other.txt')
    otherPencil.click(); $('rename-title').value = 'Renamed <notes>'
    $('rename-form').dispatchEvent(new page.window.Event('submit', { cancelable: true }))
    await until(() => toast?.startsWith('Name updated') && !$('rename-form').disabled)
    assert.equal((await library.getDocument(imported.room)).title, 'Renamed <notes>')
    assert.equal((await library.getDocument(imported.room)).sourceKey, 'b'.repeat(64))
    assert.equal($('document-title').textContent, 'Current')
    assert.equal(page.window.document.activeElement, pencil(imported.room))
    assert.equal(pencil(imported.room).parentElement.querySelector('a').textContent, 'Renamed <notes>')
    toast = undefined
    pencil('doc-current').click(); $('rename-title').value = 'New current name'
    $('rename-form').dispatchEvent(new page.window.Event('submit', { cancelable: true }))
    await until(() => toast?.startsWith('Name updated') && !$('rename-form').disabled)
    assert.equal($('document-title').textContent, 'New current name')
    assert.equal(page.window.document.title, 'New current name — Entrelinhas')
    i18n.select('fr')
    await until(() => pencil(imported.room)?.title === 'Renommer « Renamed <notes> »')
    assert.equal(pencil(imported.room).previousElementSibling.title, 'Copier le lien de « Renamed <notes> »')
    assert.equal(pencil(imported.room).nextElementSibling.title, 'Retirer « Renamed <notes> » de Mes documents')
    await library.close()
    assert.equal((await library.getDocument(imported.room)).title, 'Renamed <notes>')
    assert.equal((await library.listCheckpoints('doc-current')).length, 1)
  } finally {
    workspace?.dispose()
    await library.close(); doc.destroy(); page.window.close()
    globalThis.window = previous.window; globalThis.document = previous.document; globalThis.location = previous.location
  }
})
