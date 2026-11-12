import test from 'node:test'
import assert from 'node:assert/strict'
import { Schema } from '@tiptap/pm/model'
import { decodeTextFile, writeTextFile, MAX_FILE_BYTES } from '../src/files.js'
import { findMatches } from '../src/search.js'

test('importa UTF-8 com BOM e normaliza quebras sem interpretar HTML', () => {
  const bytes = new TextEncoder().encode('\uFEFFOlá\r\n<script>texto</script>\rfim')
  assert.equal(decodeTextFile(bytes), 'Olá\n<script>texto</script>\nfim')
  assert.equal(decodeTextFile(new Uint8Array()), '')
})
test('rejeita binário, UTF-8 inválido e arquivos grandes', () => {
  assert.throws(() => decodeTextFile(new Uint8Array([0])), /binário/)
  assert.throws(() => decodeTextFile(new Uint8Array([255])), /UTF-8/)
  assert.throws(() => decodeTextFile(new Uint8Array(MAX_FILE_BYTES + 1)), /2 MB/)
})
test('grava o snapshot e fecha o arquivo; aborta se a escrita falhar', async () => {
  const events = []
  await writeTextFile({ createWritable: async () => ({ write: async t => events.push(t), close: async () => events.push('close') }) }, '<p>Olá</p>')
  assert.deepEqual(events, ['<p>Olá</p>', 'close'])
  let aborted = false
  await assert.rejects(writeTextFile({ createWritable: async () => ({ write: async () => { throw Error('disco cheio') }, abort: async () => { aborted = true } }) }, 'texto'), /disco cheio/)
  assert.ok(aborted)
})
test('busca atravessa marcas de formatação e trata pontuação como texto', () => {
  const schema = new Schema({ nodes: { doc: { content: 'paragraph+' }, paragraph: { content: 'text*' }, text: {} }, marks: { bold: {} } })
  const doc = schema.node('doc', null, [schema.node('paragraph', null, [schema.text('Olá '), schema.text('mundo', [schema.mark('bold')]), schema.text('. Olá mundo.')])])
  const matches = findMatches(doc, 'OLÁ MUNDO.')
  assert.equal(matches.length, 2)
  assert.equal(doc.textBetween(matches[0].from, matches[0].to), 'Olá mundo.')
  assert.equal(findMatches(doc, '[').length, 0)
})
