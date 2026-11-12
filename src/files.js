/*
=============================================================================
Projeto: Arquitetura Reativa - Entrelinhas
Trabalho acadêmico desenvolvido individualmente.
Autor: Paulo Santos

Copyright (c) 2026 Paulo Santos

-----------------------------------------------------------------------------

SPDX-License-Identifier: MIT

Licenciado sob a licença MIT. Consulte o arquivo LICENSE na raiz do projeto
para o texto completo da licença e o aviso de copyright.

São permitidos o uso, a cópia, a modificação e a redistribuição, inclusive
para fins comerciais, mediante a preservação dos avisos exigidos pela MIT.
Software fornecido "COMO ESTÁ", sem garantias, nos termos da licença.

Nota sobre copyleft: a MIT é uma licença permissiva; trabalhos derivados
não precisam adotar a mesma licença.

=============================================================================
*/

export const MAX_FILE_BYTES = 2 * 1024 * 1024
export const textFileTypes = [{ description: 'Documento HTML com formatação', accept: { 'text/html': ['.html'] } }, { description: 'Texto simples sem formatação', accept: { 'text/plain': ['.txt'] } }]

// Rejeita binários e codificações incompatíveis em vez de corromper o conteúdo.
export function decodeTextFile(bytes) {
  if (bytes.byteLength > MAX_FILE_BYTES) throw new Error('O limite para abrir arquivos é 2 MB.')
  let content
  try { content = new TextDecoder('utf-8', { fatal: true }).decode(bytes) }
  catch { throw new Error('Este arquivo não está em UTF-8. Converta-o para UTF-8 antes de abrir.') }
  if (content.includes('\0')) throw new Error('Este arquivo parece ser binário. Escolha um arquivo de texto.')
  return content.replace(/\r\n?/g, '\n')
}

export function downloadText(content, name, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }))
  const a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function writeTextFile(handle, content) {
  const writable = await handle.createWritable()
  try { await writable.write(content); await writable.close() }
  catch (error) { try { await writable.abort() } catch {} throw error }
}
