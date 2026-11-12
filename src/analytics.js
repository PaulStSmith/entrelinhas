// SPDX-License-Identifier: MIT — Copyright (c) 2026 Paulo Santos
export const MEASUREMENT_ID = 'G-K9Q5RVRJ7L'

export function initializeAnalytics(target = window) {
  // Preview builds and alternate origins must not contaminate production reports.
  if (target.location.hostname !== 'editor.byteforge.biz' || target.location.protocol !== 'https:') return
  if (target.document.querySelector('[data-entrelinhas-analytics]')) return
  target.dataLayer = target.dataLayer || []
  target.gtag = function () { target.dataLayer.push(arguments) }
  const page = {
    page_title: 'Entrelinhas',
    page_location: 'https://editor.byteforge.biz/',
    page_referrer: '',
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_domain: 'editor.byteforge.biz'
  }
  // Keep external referral origins, but never room URLs, query strings, or hashes.
  try {
    const referrer = new URL(target.document.referrer)
    if (referrer.hostname !== target.location.hostname) page.page_referrer = referrer.origin + '/'
  } catch {}
  target.gtag('js', new Date())
  target.gtag('set', page)
  target.gtag('config', MEASUREMENT_ID, { ...page, send_page_view: false })
  target.gtag('event', 'page_view', { ...page, send_to: MEASUREMENT_ID })
  const script = target.document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`
  script.referrerPolicy = 'origin'
  script.dataset.entrelinhasAnalytics = ''
  target.document.head.append(script)
}
