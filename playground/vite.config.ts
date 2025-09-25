import { livestoreDevtoolsPlugin } from '@livestore/devtools-vite'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    livestoreDevtoolsPlugin({
      schemaPath: [
        './src/livestore/todos/schema.ts',
        './src/livestore/workspaces/schema.ts',
        './src/livestore/projects/schema.ts',
        './src/livestore/issues/schema.ts',
      ]
    }),
  ],
  worker: { format: 'es' },
})
