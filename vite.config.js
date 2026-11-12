import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// Usa o caminho real também quando a pasta do usuário é acessada por uma junction.
export default defineConfig({ root: fileURLToPath(new URL('.', import.meta.url)) })
