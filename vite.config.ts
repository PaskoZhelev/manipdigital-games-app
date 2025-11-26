import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  base: '/games/app/',
  server: {
    host: true, // <-- listen on all network interfaces
    port: 5173, // optional, defaults to 5173
  },
})
