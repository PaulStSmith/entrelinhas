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
