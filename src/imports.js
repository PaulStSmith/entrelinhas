// SPDX-License-Identifier: MIT — Copyright (c) 2026 Paulo Santos
import * as Y from 'yjs'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'

// Include the filename so distinct named files are kept as separate documents.
export async function importSourceKey(name, bytes) {
  const prefix = new TextEncoder().encode(name + '\0')
  const input = new Uint8Array(prefix.length + bytes.length)
  input.set(prefix); input.set(bytes, prefix.length)
  const digest = await crypto.subtle.digest('SHA-256', input)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

// Build an independent CRDT seed without modifying the active shared document.
export function createImportSeed(content) {
  const doc = new Y.Doc()
  let editor
  try {
    editor = new Editor({
      element: document.createElement('div'),
      extensions: [StarterKit.configure({ undoRedo: false, heading: { levels: [1, 2, 3] }, link: { openOnClick: false, autolink: false } }), Collaboration.configure({ document: doc, field: 'conteudo' })]
    })
    editor.commands.setContent(content)
    return Y.encodeStateAsUpdate(doc)
  } finally { editor?.destroy(); doc.destroy() }
}
