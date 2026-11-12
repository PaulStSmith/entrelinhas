// SPDX-License-Identifier: MIT — Copyright (c) 2026 Paulo Santos
import test from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { initializeAnalytics, MEASUREMENT_ID } from '../src/analytics.js'

test('analytics uses the production stream without exposing document titles or room links', () => {
  const page = new JSDOM('<head><title>Private document name</title></head><body><input value="Private person"><p>Private text</p></body>', { url: 'https://editor.byteforge.biz/?sala=private-room#private', referrer: 'https://editor.byteforge.biz/?sala=another-private-room' })
  try {
    initializeAnalytics(page.window); initializeAnalytics(page.window)
    const queue = page.window.dataLayer.map(item => [...item])
    assert.equal(queue.length, 4)
    assert.equal(queue[2][0], 'config')
    assert.equal(queue[2][1], MEASUREMENT_ID)
    assert.equal(queue[1][1].send_page_view, false)
    assert.equal(queue[2][2].send_page_view, false)
    assert.deepEqual(queue[3].slice(0, 2), ['event', 'page_view'])
    assert.equal(queue[3][2].page_title, 'Entrelinhas')
    assert.equal(queue[3][2].page_location, 'https://editor.byteforge.biz/')
    assert.equal(queue[2][2].page_location, 'https://editor.byteforge.biz/')
    assert.equal(queue[2][2].page_title, 'Entrelinhas')
    assert.equal(queue[2][2].page_referrer, '')
    assert.equal(queue[2][2].allow_google_signals, false)
    assert.equal(queue[2][2].allow_ad_personalization_signals, false)
    assert.doesNotMatch(JSON.stringify(queue), /private|Private/)
    const scripts = page.window.document.querySelectorAll('[data-entrelinhas-analytics]')
    assert.equal(scripts.length, 1)
    assert.equal(scripts[0].referrerPolicy, 'origin')
    assert.equal(scripts[0].src, `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`)
  } finally { page.window.close() }
})

test('analytics strips referral paths and stays disabled on development and preview origins', () => {
  const publicPage = new JSDOM('', { url: 'https://editor.byteforge.biz/', referrer: 'https://example.com/private/path?email=private#fragment' })
  initializeAnalytics(publicPage.window)
  assert.equal(publicPage.window.dataLayer[2][2].page_referrer, 'https://example.com/')
  publicPage.window.close()
  for (const url of ['http://127.0.0.1:5173/', 'https://icy-mushroom-0b351a10f.5.azurestaticapps.net/', 'http://editor.byteforge.biz/']) {
    const page = new JSDOM('', { url })
    initializeAnalytics(page.window)
    assert.equal(page.window.dataLayer, undefined)
    assert.equal(page.window.document.querySelector('script'), null)
    page.window.close()
  }
})
