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

import createDOMPurify from 'dompurify'

// O importador aceita somente o subconjunto de HTML representado pelo editor.
export function createHTMLSanitizer(window) {
  const purifier = createDOMPurify(window)
  return html => purifier.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'h1', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'hr', 'a'],
    ALLOWED_ATTR: ['href', 'start'],
    ALLOW_DATA_ATTR: false
  })
}

export function wrapHTML(body) {
  return `<!doctype html>\n<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Documento Entrelinhas</title></head><body>\n${body}\n</body></html>\n`
}
