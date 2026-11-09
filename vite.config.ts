import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' hace que el build funcione desde cualquier carpeta (GitHub Pages, Netlify, etc.)
export default defineConfig({
  plugins: [react()],
  base: './',
})
