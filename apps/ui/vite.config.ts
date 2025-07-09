import { defineConfig, loadEnv } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import react from '@vitejs/plugin-react-swc'
import { fileURLToPath, URL } from 'node:url'

const getServerConfig = (env: Record<string, string>) => {
  const config = {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    allowedHosts: [
      env?.VITE_HOSTNAME_ALIAS
    ]
  }
  return {
    server: config,
    preview: config
  } as any
}

export default defineConfig(
  ({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')
    return {
      plugins: [
        react(),
        nodePolyfills()
      ],
      resolve: {
        alias: {
          '@': fileURLToPath(new URL('./src', import.meta.url))
        }
      },
      ...getServerConfig(env)
    }
  }
)
