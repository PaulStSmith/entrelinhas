// SPDX-License-Identifier: MIT — Copyright (c) 2026 Paulo Santos
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { initializeAnalytics, MEASUREMENT_ID } from '../src/analytics.js'

const trackingPage = readFileSync(new URL('../public/analytics.html', import.meta.url), 'utf8')
test('analytics isolates the tag from document titles, room URLs, and editor contents', () => {
  const page = new JSDOM('<head><title>Private name</title></head><body>Private text</body>', { url: 'https://editor.byteforge.biz/?sala=private#private' })
  try {
    initializeAnalytics(page.window); initializeAnalytics(page.window)
    const frames = page.window.document.querySelectorAll('[data-entrelinhas-analytics]')
    assert.equal(frames.length, 1)
    assert.equal(frames[0].src, 'https://editor.byteforge.biz/analytics.html')
    assert.equal(frames[0].referrerPolicy, 'no-referrer')
    assert.equal(frames[0].hidden, true)
    assert.equal(page.window.document.querySelector('script'), null)
    assert.equal(page.window.document.title, 'Private name')
    const isolated = new JSDOM(trackingPage, { url: frames[0].src, runScripts: 'dangerously' })
    try {
      const queue = isolated.window.dataLayer.map(item => [...item])
      assert.equal(queue.length, 3)
      assert.equal(queue[2][1], MEASUREMENT_ID)
      assert.equal(queue[2][2].page_title, 'Entrelinhas')
      assert.equal(queue[2][2].page_location, 'https://editor.byteforge.biz/')
      assert.equal(queue[2][2].page_referrer, '')
      assert.equal(queue[2][2].allow_google_signals, false)
      assert.equal(queue[2][2].allow_ad_personalization_signals, false)
      assert.equal(isolated.window.document.title, 'Entrelinhas')
      assert.equal(isolated.window.document.referrer, '')
      assert.doesNotMatch(JSON.stringify(queue), /private|Private/)
      assert.equal(isolated.window.document.querySelector('script[src]').src, `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`)
    } finally { isolated.window.close() }
  } finally { page.window.close() }
})

test('analytics stays disabled on development and preview origins', () => {
  for (const url of ['http://127.0.0.1:5173/', 'https://icy-mushroom-0b351a10f.5.azurestaticapps.net/', 'http://editor.byteforge.biz/']) {
    const page = new JSDOM('', { url })
    initializeAnalytics(page.window)
    assert.equal(page.window.document.querySelector('iframe'), null)
    page.window.close()
    const isolated = new JSDOM(trackingPage, { url, runScripts: 'dangerously' })
    assert.equal(isolated.window.dataLayer, undefined)
    isolated.window.close()
  }
})
