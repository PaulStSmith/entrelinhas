// SPDX-License-Identifier: MIT — Copyright (c) 2026 Paulo Santos
import { messageRows } from './messages.js'

export const languages = [
  { code: 'en', name: 'English', locale: 'en' },
  { code: 'pt', name: 'Português', locale: 'pt-BR' },
  { code: 'es', name: 'Español', locale: 'es' },
  { code: 'fr', name: 'Français', locale: 'fr' }
]
const codes = languages.map(item => item.code)
export const messages = Object.fromEntries(messageRows.map(([key, pt, en, es, fr]) => [key, { pt, en, es, fr }]))
const sourceKeys = new Map(messageRows.map(([key, source]) => [source, key]))
let language = 'en'
const listeners = new Set()

export function chooseLanguage(preferences = [], override) {
  if (codes.includes(override)) return override
  for (const preference of preferences) {
    if (typeof preference !== 'string') continue
    const primary = preference.trim().toLowerCase().replaceAll('_', '-').split('-')[0]
    if (codes.includes(primary)) return primary
  }
  return 'en'
}
export function translateFor(code, key, values = {}) {
  const entry = messages[key]
  if (!entry) throw new Error(`Unknown interface message: ${key}`)
  return (entry[code] || entry.en).replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''))
}
export const t = (key, values) => translateFor(language, key, values)
export const getLanguage = () => language
export const getLocale = () => languages.find(item => item.code === language).locale
export const localizeMessage = source => sourceKeys.has(source) ? t(sourceKeys.get(source)) : source
export const onLanguageChange = callback => { listeners.add(callback); return () => listeners.delete(callback) }
export const formatDate = value => new Intl.DateTimeFormat(getLocale(), { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
export const formatNumber = value => new Intl.NumberFormat(getLocale()).format(value)

export function initializeI18n({ document: target = document, navigator: browser = navigator, storage } = {}) {
  let store = storage
  try { store ||= target.defaultView.localStorage } catch {}
  let override
  try { override = store?.getItem('entrelinhas-language') } catch {}
  const preferences = () => browser.languages?.length ? browser.languages : [browser.language]
  language = chooseLanguage(preferences(), override)
  const textTargets = [], attributeTargets = []
  // Capture only the original interface, before the editor or saved documents are mounted.
  // Later language changes never walk or translate document content or user-provided names.
  const walker = target.createTreeWalker(target.body, 4)
  while (walker.nextNode()) {
    const node = walker.currentNode
    if (node.parentElement.closest('script,style,svg,kbd,[data-language-name]')) continue
    const key = sourceKeys.get(node.textContent.trim())
    if (key) {
      const [, before, , after] = node.textContent.match(/^(\s*)([\s\S]*?)(\s*)$/)
      textTargets.push({ node, key, before, after })
    }
  }
  for (const element of target.querySelectorAll('[aria-label],[title],[placeholder],meta[name=description]')) {
    for (const attribute of ['aria-label', 'title', 'placeholder', 'content']) {
      const key = sourceKeys.get(element.getAttribute(attribute))
      if (key) attributeTargets.push({ element, attribute, key })
    }
  }
  function render() {
    target.documentElement.lang = getLocale()
    target.title = t('appTitle')
    for (const { node, key, before, after } of textTargets) if (node.isConnected) node.textContent = before + t(key) + after
    for (const { element, attribute, key } of attributeTargets) element.setAttribute(attribute, t(key))
    const current = languages.find(item => item.code === language)
    const summary = target.getElementById('language-summary')
    if (summary) summary.setAttribute('aria-label', `${t('language')}: ${current.name}`)
    const name = target.getElementById('current-language')
    if (name) name.textContent = current.name
    const short = target.getElementById('current-language-short')
    if (short) short.textContent = current.code.toUpperCase()
    target.querySelector('#current-language-flag use')?.setAttribute('href', `#flag-${language}`)
    for (const button of target.querySelectorAll('[data-language]')) button.setAttribute('aria-pressed', String(button.dataset.language === language))
  }
  function select(code) {
    override = codes.includes(code) ? code : undefined
    try {
      if (override) store?.setItem('entrelinhas-language', override)
      else store?.removeItem('entrelinhas-language')
    } catch {}
    language = chooseLanguage(preferences(), override)
    render()
    for (const listener of listeners) listener(language)
  }
  for (const button of target.querySelectorAll('[data-language]')) button.addEventListener('click', () => select(button.dataset.language))
  target.defaultView.addEventListener('languagechange', () => { if (!codes.includes(override)) select('auto') })
  render()
  return { select }
}
