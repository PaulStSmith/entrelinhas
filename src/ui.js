// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Paulo Santos
import { t, onLanguageChange } from './i18n.js'
export function initializeUI() {
  const menus = [...document.querySelectorAll('.command-menu')]
  const closeMenus = except => {
    for (const menu of menus) if (menu !== except) menu.open = false
  }
  for (const menu of menus) {
    menu.addEventListener('toggle', () => { if (menu.open) closeMenus(menu) })
    menu.addEventListener('click', event => {
      if (event.target.closest('button')) menu.open = false
    })
  }
  document.addEventListener('click', event => {
    if (!event.target.closest('.command-menu')) closeMenus()
  })
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return
    const opened = menus.find(menu => menu.open)
    if (opened) {
      event.preventDefault(); closeMenus(); opened.querySelector('summary').focus()
    }
  })
  const themeButton = document.getElementById('theme-toggle')
  const preference = window.matchMedia('(prefers-color-scheme: dark)')
  const isDark = () => document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && preference.matches)
  function describeTheme() {
    const label = t(isDark() ? 'lightTheme' : 'darkTheme')
    themeButton.setAttribute('aria-label', label); themeButton.title = label
    themeButton.setAttribute('aria-pressed', String(isDark()))
  }
  themeButton.addEventListener('click', () => {
    const theme = isDark() ? 'light' : 'dark'
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('entrelinhas-theme', theme) } catch {}
    describeTheme()
  })
  preference.addEventListener('change', describeTheme)
  onLanguageChange(describeTheme)
  describeTheme()
}
