// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Paulo Santos
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const staging = path.join(root, '.azure-deploy', 'staging')
// Remove somente o pacote gerado dentro deste projeto.
if (path.relative(root, staging) !== path.join('.azure-deploy', 'staging')) {
  throw new Error('Destino de empacotamento inválido')
}
const ws = JSON.parse(await readFile(path.join(root, 'node_modules/ws/package.json'), 'utf8'))
await rm(staging, { recursive: true, force: true })
await mkdir(path.join(staging, 'server'), { recursive: true })
await mkdir(path.join(staging, 'node_modules'), { recursive: true })
await cp(path.join(root, 'server/index.js'), path.join(staging, 'server/index.js'))
await cp(path.join(root, 'node_modules/ws'), path.join(staging, 'node_modules/ws'), { recursive: true })
await writeFile(path.join(staging, 'package.json'), JSON.stringify({
  name: 'entrelinhas-signaling', version: '1.0.0', private: true, type: 'module',
  scripts: { start: 'node server/index.js' }, dependencies: { ws: ws.version }
}, null, 2) + '\n')
console.log('Pacote de sinalização pronto em .azure-deploy/staging')
