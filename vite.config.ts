import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import legacy from '@vitejs/plugin-legacy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    legacy({
      // Target TV browsers (Chromium 67+, older Safari, older Firefox)
      targets: ['chrome >= 67', 'safari >= 10', 'firefox >= 67', 'edge >= 18'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
      renderLegacyChunks: true,
    }),
  ],
  build: {
    target: 'es2015',
  },
})
