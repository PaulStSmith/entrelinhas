import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { createSignalingServer } from '../server/index.js'

test('réplicas convergem após inserções e exclusões concorrentes offline', () => {
  const a = new Y.Doc(); const b = new Y.Doc()
  a.getText('documento').insert(0, 'Olá mundo')
  Y.applyUpdate(b, Y.encodeStateAsUpdate(a))
  const updatesA = []; const updatesB = []
  a.on('update', u => updatesA.push(u)); b.on('update', u => updatesB.push(u))
  a.getText('documento').insert(3, '!'); a.getText('documento').delete(5, 5)
  b.getText('documento').insert(3, '?'); b.getText('documento').insert(9, ' colaborativo')
  // Entrega fora de ordem e duplicada, como pode ocorrer em uma reconexão.
  for (const u of [...updatesA].reverse()) { Y.applyUpdate(b, u); Y.applyUpdate(b, u) }
  for (const u of [...updatesB].reverse()) Y.applyUpdate(a, u)
  assert.equal(a.getText('documento').toString(), b.getText('documento').toString())
  assert.match(a.getText('documento').toString(), /colaborativo/)
  assert.ok(a.getText('documento').toString().includes('!'))
  assert.ok(a.getText('documento').toString().includes('?'))
  a.destroy(); b.destroy()
})

test('sinalização encaminha mensagens e sobrevive a JSON inválido', { timeout: 10000 }, async () => {
  const { server, wss } = createSignalingServer()
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = `ws://127.0.0.1:${server.address().port}`
  const a = new WebSocket(address); const b = new WebSocket(address)
  try {
    await Promise.all([once(a, 'open'), once(b, 'open')])
    a.send(JSON.stringify({ type: 'subscribe', topics: ['teste'] }))
    b.send(JSON.stringify({ type: 'subscribe', topics: ['teste'] }))
    // Ping/pong confirma que a inscrição de B foi processada antes da publicação.
    const pong = once(b, 'message'); b.send(JSON.stringify({ type: 'ping' })); await pong
    const received = once(b, 'message')
    a.send(JSON.stringify({ type: 'publish', topic: 'teste', data: { offer: 'sdp' } }))
    const [payload] = await received
    assert.equal(JSON.parse(payload).data.offer, 'sdp')
    const closed = once(a, 'close'); a.send('{broken'); await closed
    const healthy = once(b, 'message'); b.send(JSON.stringify({ type: 'ping' }))
    assert.equal(JSON.parse((await healthy)[0]).type, 'pong')
  } finally {
    a.terminate(); b.terminate(); for (const socket of wss.clients) socket.terminate()
    await new Promise(resolve => wss.close(resolve)); await new Promise(resolve => server.close(resolve))
  }
})
