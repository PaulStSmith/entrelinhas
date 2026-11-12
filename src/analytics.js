// SPDX-License-Identifier: MIT — Copyright (c) 2026 Paulo Santos
export const MEASUREMENT_ID = 'G-K9Q5RVRJ7L'

export function initializeAnalytics(target = window) {
  if (target.location.hostname !== 'editor.byteforge.biz' || target.location.protocol !== 'https:') return
  if (target.document.querySelector('[data-entrelinhas-analytics]')) return
  // The tag sees a fixed document with no editor names, room URLs, or user content.
  const frame = target.document.createElement('iframe')
  frame.src = '/analytics.html'
  frame.hidden = true
  frame.title = 'Analytics'
  frame.referrerPolicy = 'no-referrer'
  frame.setAttribute('aria-hidden', 'true')
  frame.dataset.entrelinhasAnalytics = ''
  target.document.body.append(frame)
}
