import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from "path";
import vuetify from "vite-plugin-vuetify";

// https://vitejs.dev/config
export default defineConfig({
  root: path.resolve(__dirname, './src'),
  base: '',
  plugins: [
      vue(),
      vuetify({
        autoImport: true,
      }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
