import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Use relative base path for IPFS deployment
  // This ensures assets load correctly from IPFS gateways
  base: './',
  server: {
    // Proxy API requests to backend to avoid CORS issues
    // This is especially important for Microsoft Edge which has stricter CORS policies
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  define: {
    global: 'globalThis',
    'process.env': '{}',
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      external: [
        '@ledgerhq/hw-transport-webusb',
        '@ledgerhq/hw-app-eth',
        '@walletconnect/ethereum-provider',
      ],
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-ethers': ['ethers'],
          'vendor-scure': ['@scure/bip39', '@scure/bip32', '@noble/hashes'],
          'vendor-walletconnect': ['@walletconnect/web3wallet', '@walletconnect/core', '@walletconnect/utils'],
        },
      },
    },
  },
})
