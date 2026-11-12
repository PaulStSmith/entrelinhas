// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Paulo Santos
import * as Y from 'yjs'
import { documentTitle, documentURL, PUBLIC_ROOM, displayDocumentTitle } from './library.js'
import { t, getLocale, formatDate, localizeMessage, onLanguageChange } from './i18n.js'

export function createWorkspace({ editor, doc, library, room, cleanHTML, toast, isReady, initialRecord }) {
  const document = globalThis.document
  const window = document.defaultView
  const $ = id => document.getElementById(id)
  const date = formatDate
  let titleRecord = initialRecord || { room, titleKey: room === PUBLIC_ROOM ? 'publicTitle' : 'roomTitle' }
  let title = displayDocumentTitle(titleRecord)
  let ready = false, timer, revision = 0, dirty = false, selectedCheckpoint, queue = Promise.resolve()
  let lastCheckpoint, historyWarning = false, removed = false, renameTarget = room
  function updateTitle(value) {
    title = documentTitle(value)
    $('document-title').textContent = title
    $('document-label').textContent = title
    document.title = `${title} — Entrelinhas`
  }
  updateTitle(title)
  function warning(error) {
    historyWarning = true; updateCheckpointStatus()
    toast(localizeMessage(error.message) || t('libraryError'))
  }
  function updateCheckpointStatus() {
    $('checkpoint-status').textContent = removed ? t('documentRemoved') : historyWarning ? t('historyUnavailable') : lastCheckpoint ? t('latestVersion', { date: date(lastCheckpoint.createdAt) }) : t('openingHistory')
  }
  function capture(reason = 'Automático') {
    if (removed) return Promise.resolve(null)
    if (!ready || !isReady()) return Promise.reject(new Error('Aguarde o armazenamento local antes de guardar uma versão.'))
    clearTimeout(timer); timer = undefined
    const version = revision
    const value = { update: Y.encodeStateAsUpdate(doc), html: cleanHTML(editor.getHTML()), text: editor.getText(), reason }
    const saving = queue.catch(() => {}).then(() => library.saveCheckpoint(room, value)).then(checkpoint => {
      if (revision === version) dirty = false
      lastCheckpoint = checkpoint; historyWarning = false; updateCheckpointStatus()
      return checkpoint
    })
    queue = saving
    return saving
  }
  function changed() {
    dirty = true; revision++
    if (!removed && ready && isReady() && !timer) timer = setTimeout(() => capture().catch(warning), 30000)
  }
  function action(id, callback, type = 'click') {
    $(id).addEventListener(type, async event => {
      event.preventDefault()
      const control = event.currentTarget
      if (control.disabled) return
      control.disabled = true
      try { await callback(event) } catch (error) { warning(error) }
      finally { control.disabled = false }
    })
  }
  for (const button of document.querySelectorAll('[data-close]')) button.addEventListener('click', () => $(button.dataset.close).close())
  async function navigate(roomToOpen) {
    await capture('Antes de trocar de documento')
    location.assign(documentURL(roomToOpen, location.href))
  }
  async function newDocument(name, seed) {
    await capture('Antes de criar uma cópia')
    const newRoom = `doc-${crypto.randomUUID()}`
    await library.createDocument({ room: newRoom, title: name, seed })
    location.assign(documentURL(newRoom, location.href))
  }
  async function renderDocuments() {
    await library.discoverDocuments()
    const records = await library.listDocuments()
    const query = $('document-filter').value.toLocaleLowerCase(getLocale())
    const list = $('document-list'); list.replaceChildren()
    for (const record of records.filter(item => `${displayDocumentTitle(item)} ${item.room}`.toLocaleLowerCase(getLocale()).includes(query))) {
      const row = document.createElement('li')
      const link = document.createElement('a'); link.href = documentURL(record.room, location.href)
      link.textContent = displayDocumentTitle(record)
      if (record.room === room) {
        link.setAttribute('aria-current', 'page')
        const current = document.createElement('span'); current.className = 'current-label'; current.textContent = ` · ${t('current')}`; link.append(current)
      }
      link.addEventListener('click', event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button) return
        event.preventDefault(); navigate(record.room).catch(warning)
      })
      const detail = document.createElement('span')
      detail.textContent = `${record.room === room ? `${t('openNow')} · ` : ''}${date(record.updatedAt)} · ${record.room}`
      const heading = document.createElement('div'); heading.className = 'document-row-heading'
      const rename = document.createElement('button'); rename.type = 'button'; rename.className = 'rename-document'
      rename.dataset.room = record.room
      rename.setAttribute('aria-label', t('renameDocument', { title: displayDocumentTitle(record) }))
      rename.title = rename.getAttribute('aria-label')
      rename.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-pencil"/></svg>'
      rename.addEventListener('click', () => openRename(record.room, displayDocumentTitle(record)))
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove-document'
      remove.setAttribute('aria-label', t('removeDocument', { title: displayDocumentTitle(record) }))
      remove.title = remove.getAttribute('aria-label')
      remove.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg>'
      remove.addEventListener('click', async () => {
        if (!window.confirm(t('removeDocumentConfirm', { title: displayDocumentTitle(record) }))) return
        remove.disabled = true
        const wasRemoved = removed
        try {
          if (record.room === room) {
            removed = true; clearTimeout(timer); timer = undefined
            await queue.catch(() => {})
          }
          await library.removeDocument(record.room)
          if (record.room === room) { dirty = false; lastCheckpoint = undefined; updateCheckpointStatus() }
          await renderDocuments(); $('document-filter').focus()
          toast(t('documentRemoved'))
        } catch (error) { removed = wasRemoved; remove.disabled = false; toast(t('removeDocumentError')) }
      })
      heading.append(link, rename, remove); row.append(heading, detail); list.append(row)
    }
    $('document-empty').hidden = !!list.children.length
  }
  action('documents', async () => {
    await capture('Antes de abrir a biblioteca')
    await renderDocuments()
    $('documents-dialog').showModal(); $('document-filter').focus()
  })
  $('document-filter').addEventListener('input', () => renderDocuments().catch(warning))
  action('new-document-form', () => newDocument($('new-document-title').value), 'submit')
  function openRename(targetRoom, name) {
    renameTarget = targetRoom
    $('rename-title').value = name; $('rename-dialog').showModal()
    $('rename-title').focus(); $('rename-title').select()
  }
  action('rename-document', () => openRename(room, title))
  action('rename-form', async () => {
    const record = await library.touchDocument(renameTarget, $('rename-title').value)
    if (record.room === room) {
      removed = false; titleRecord = record; updateTitle(displayDocumentTitle(record))
    }
    if ($('documents-dialog').open) await renderDocuments()
    $('rename-dialog').close()
    if ($('documents-dialog').open) {
      const button = [...$('document-list').querySelectorAll('.rename-document')].find(item => item.dataset.room === record.room)
      const focusTarget = button || $('document-filter')
      focusTarget.focus()
    }
    toast(t('renamed'))
  }, 'submit')
  action('duplicate-document', () => newDocument(t('copyTitle', { title }), Y.encodeStateAsUpdate(doc)))

  function preview(checkpoint) {
    selectedCheckpoint = checkpoint
    $('checkpoint-details').textContent = `${date(checkpoint.createdAt)} · ${localizeMessage(checkpoint.reason)}`
    $('checkpoint-preview').innerHTML = cleanHTML(checkpoint.html)
    for (const anchor of $('checkpoint-preview').querySelectorAll('a')) anchor.removeAttribute('href')
    $('restore-checkpoint').disabled = false
    for (const button of $('checkpoint-list').querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.id === checkpoint.id))
  }
  async function renderHistory(preferredId) {
    const checkpoints = await library.listCheckpoints(room)
    const list = $('checkpoint-list'); list.replaceChildren()
    selectedCheckpoint = undefined; $('restore-checkpoint').disabled = true
    $('checkpoint-preview').replaceChildren(); $('checkpoint-details').textContent = t('selectVersion')
    $('checkpoint-empty').hidden = !!checkpoints.length
    for (const checkpoint of checkpoints) {
      const li = document.createElement('li'); const button = document.createElement('button')
      button.type = 'button'; button.dataset.id = checkpoint.id; button.setAttribute('aria-pressed', 'false')
      button.textContent = `${date(checkpoint.createdAt)} · ${localizeMessage(checkpoint.reason)}`
      button.addEventListener('click', () => preview(checkpoint)); li.append(button); list.append(li)
    }
    const selected = checkpoints.find(item => item.id === preferredId) || checkpoints[0]
    if (selected) preview(selected)
  }
  action('history', async () => {
    await capture('Ao abrir o histórico'); await renderHistory(); $('history-dialog').showModal()
  })
  action('checkpoint-now', async () => {
    await capture('Versão manual'); toast(t('versionSaved'))
  })
  action('restore-checkpoint', async () => {
    if (!selectedCheckpoint) return
    await newDocument(t('recoveredTitle', { title }), selectedCheckpoint.update)
  })

  function preparePrint() {
    const output = $('print-output'); output.replaceChildren()
    const heading = document.createElement('h1'); heading.textContent = title
    const body = document.createElement('article'); body.className = 'print-content'
    body.innerHTML = cleanHTML(editor.getHTML()); output.append(heading, body)
    $('print-preview').replaceChildren(...[...output.children].map(child => child.cloneNode(true)))
  }
  action('print-document', () => {
    preparePrint(); $('print-dialog').showModal()
  })
  $('print-now').addEventListener('click', () => { $('print-dialog').close(); preparePrint(); window.print() })
  window.addEventListener('beforeprint', preparePrint)
  window.addEventListener('afterprint', () => $('print-output').replaceChildren())
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && dirty && ready) capture('Ao sair da aba').catch(warning)
  })
  const stopLanguageUpdates = onLanguageChange(() => {
    updateTitle(displayDocumentTitle(titleRecord)); updateCheckpointStatus()
    if ($('documents-dialog').open) renderDocuments().catch(warning)
    if ($('history-dialog').open) renderHistory(selectedCheckpoint?.id).catch(warning)
  })
  return {
    dispose() { clearTimeout(timer); stopLanguageUpdates() },
    changed,
    capture,
    async openFile(imported) {
      await capture('Antes de abrir arquivo')
      const record = await library.openImportedDocument(imported)
      if (record.room !== room) location.assign(documentURL(record.room, location.href))
    },
    async start() {
      try {
        const record = await library.touchDocument(room)
        titleRecord = record; updateTitle(displayDocumentTitle(record)); ready = true
        for (const button of document.querySelectorAll('[data-library-action]')) button.disabled = false
        await capture('Ao abrir o documento')
      } catch (error) { warning(error) }
    }
  }
}
