// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Paulo Santos
import * as Y from 'yjs'
import { documentTitle, documentURL, PUBLIC_ROOM } from './library.js'

export function createWorkspace({ editor, doc, library, room, cleanHTML, toast, isReady, initialTitle }) {
  const $ = id => document.getElementById(id)
  const date = value => new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  let title = initialTitle || (room === PUBLIC_ROOM ? 'Nosso caderno compartilhado' : `Sala ${room}`)
  let ready = false, timer, revision = 0, dirty = false, selectedCheckpoint, queue = Promise.resolve()
  function updateTitle(value) {
    title = documentTitle(value)
    $('document-title').textContent = title
    $('document-label').textContent = title
    document.title = `${title} — Entrelinhas`
  }
  updateTitle(title)
  function warning(error) {
    $('checkpoint-status').textContent = 'Histórico local indisponível · baixe uma cópia'
    toast(error.message || 'Não foi possível acessar a biblioteca local. Baixe uma cópia HTML.')
  }
  function capture(reason = 'Automático') {
    if (!ready || !isReady()) return Promise.reject(new Error('Aguarde o armazenamento local antes de guardar uma versão.'))
    clearTimeout(timer); timer = undefined
    const version = revision
    const value = { update: Y.encodeStateAsUpdate(doc), html: cleanHTML(editor.getHTML()), text: editor.getText(), reason }
    const saving = queue.catch(() => {}).then(() => library.saveCheckpoint(room, value)).then(checkpoint => {
      if (revision === version) dirty = false
      $('checkpoint-status').textContent = `Última versão local: ${date(checkpoint.createdAt)}`
      return checkpoint
    })
    queue = saving
    return saving
  }
  function changed() {
    dirty = true; revision++
    if (ready && isReady() && !timer) timer = setTimeout(() => capture().catch(warning), 30000)
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
    const query = $('document-filter').value.toLocaleLowerCase('pt-BR')
    const list = $('document-list'); list.replaceChildren()
    for (const record of records.filter(item => `${item.title} ${item.room}`.toLocaleLowerCase('pt-BR').includes(query))) {
      const row = document.createElement('li')
      const link = document.createElement('a'); link.href = documentURL(record.room, location.href)
      link.textContent = record.title
      if (record.room === room) link.setAttribute('aria-current', 'page')
      link.addEventListener('click', event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button) return
        event.preventDefault(); navigate(record.room).catch(warning)
      })
      const detail = document.createElement('span')
      detail.textContent = `${record.room === room ? 'Aberto agora · ' : ''}${date(record.updatedAt)} · ${record.room}`
      row.append(link, detail); list.append(row)
    }
    $('document-empty').hidden = !!list.children.length
  }
  action('documents', async () => {
    await capture('Antes de abrir a biblioteca')
    await renderDocuments()
    $('documents-dialog').showModal(); $('document-filter').focus()
  })
  $('document-filter').addEventListener('input', () => renderDocuments().catch(warning))
  action('new-document-form', () => newDocument(documentTitle($('new-document-title').value)), 'submit')
  action('rename-document', () => {
    $('rename-title').value = title; $('rename-dialog').showModal(); $('rename-title').focus()
  })
  action('rename-form', async () => {
    const record = await library.touchDocument(room, $('rename-title').value)
    updateTitle(record.title); $('rename-dialog').close()
    toast('Nome atualizado neste navegador. O link da sala continua o mesmo.')
  }, 'submit')
  action('duplicate-document', () => newDocument(`${title} — cópia`, Y.encodeStateAsUpdate(doc)))

  function preview(checkpoint) {
    selectedCheckpoint = checkpoint
    $('checkpoint-details').textContent = `${date(checkpoint.createdAt)} · ${checkpoint.reason}`
    $('checkpoint-preview').innerHTML = cleanHTML(checkpoint.html)
    for (const anchor of $('checkpoint-preview').querySelectorAll('a')) anchor.removeAttribute('href')
    $('restore-checkpoint').disabled = false
    for (const button of $('checkpoint-list').querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.id === checkpoint.id))
  }
  async function renderHistory() {
    const checkpoints = await library.listCheckpoints(room)
    const list = $('checkpoint-list'); list.replaceChildren()
    selectedCheckpoint = undefined; $('restore-checkpoint').disabled = true
    $('checkpoint-preview').replaceChildren(); $('checkpoint-details').textContent = 'Selecione uma versão para conferir o conteúdo.'
    $('checkpoint-empty').hidden = !!checkpoints.length
    for (const checkpoint of checkpoints) {
      const li = document.createElement('li'); const button = document.createElement('button')
      button.type = 'button'; button.dataset.id = checkpoint.id; button.setAttribute('aria-pressed', 'false')
      button.textContent = `${date(checkpoint.createdAt)} · ${checkpoint.reason}`
      button.addEventListener('click', () => preview(checkpoint)); li.append(button); list.append(li)
    }
    if (checkpoints[0]) preview(checkpoints[0])
  }
  action('history', async () => {
    await capture('Ao abrir o histórico'); await renderHistory(); $('history-dialog').showModal()
  })
  action('checkpoint-now', async () => {
    await capture('Versão manual'); toast('Versão guardada neste navegador.')
  })
  action('restore-checkpoint', async () => {
    if (!selectedCheckpoint) return
    await newDocument(`${title} — recuperado`, selectedCheckpoint.update)
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
  return {
    changed,
    capture,
    async start() {
      try {
        const record = await library.touchDocument(room)
        updateTitle(record.title); ready = true
        for (const button of document.querySelectorAll('[data-library-action]')) button.disabled = false
        await capture('Ao abrir o documento')
      } catch (error) { warning(error) }
    }
  }
}
