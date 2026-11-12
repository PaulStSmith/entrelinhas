import http from 'node:http'
import { pathToFileURL } from 'node:url'
import { WebSocketServer, WebSocket } from 'ws'

// Protocolo pub/sub compatível com y-webrtc. Nenhum texto é armazenado aqui.
export function createSignalingServer() {
  const topics = new Map()
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.writeHead(req.url === '/health' || req.url === '/' ? 200 : 404)
    res.end(JSON.stringify({ service: 'entrelinhas-signaling', status: 'ok' }))
  })
  const wss = new WebSocketServer({ server, maxPayload: 128 * 1024, perMessageDeflate: false })
  function send(socket, message) {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
  }
  wss.on('connection', socket => {
    const subscriptions = new Set()
    socket.alive = true
    let count = 0
    const rateReset = setInterval(() => { count = 0 }, 1000)
    const unsubscribe = topic => {
      const members = topics.get(topic)
      members?.delete(socket)
      if (members?.size === 0) topics.delete(topic)
      subscriptions.delete(topic)
    }
    socket.on('error', () => {}) // Erros de transporte encerram apenas este participante.
    socket.on('pong', () => { socket.alive = true })
    socket.on('close', () => { clearInterval(rateReset); for (const topic of subscriptions) unsubscribe(topic) })
    socket.on('message', raw => {
      if (++count > 100) { socket.close(1008, 'Rate limit'); return }
      let message
      try { message = JSON.parse(raw.toString()) } catch { socket.close(1007, 'Invalid JSON'); return }
      if (!message || typeof message !== 'object') return
      if (message.type === 'ping') { send(socket, { type: 'pong' }); return }
      if (message.type === 'subscribe' && Array.isArray(message.topics)) {
        for (const topic of message.topics.slice(0, 16)) {
          if (typeof topic !== 'string' || topic.length > 200 || subscriptions.size >= 16) continue
          if (!topics.has(topic)) topics.set(topic, new Set())
          topics.get(topic).add(socket); subscriptions.add(topic)
        }
      } else if (message.type === 'unsubscribe' && Array.isArray(message.topics)) {
        for (const topic of message.topics) unsubscribe(topic)
      } else if (message.type === 'publish' && typeof message.topic === 'string' && subscriptions.has(message.topic)) {
        const members = topics.get(message.topic)
        if (members) for (const member of members) send(member, { ...message, clients: members.size })
      }
    })
  })
  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      if (!socket.alive) socket.terminate()
      else { socket.alive = false; socket.ping() }
    }
  }, 30000)
  server.on('close', () => clearInterval(heartbeat))
  return { server, wss }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server, wss } = createSignalingServer()
  server.listen(Number(process.env.PORT || 4444), '0.0.0.0', () => console.log('Servidor de sinalização iniciado'))
  const shutdown = () => { for (const socket of wss.clients) socket.terminate(); wss.close(); server.close() }
  process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown)
}
