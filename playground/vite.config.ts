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
        './src/livestore/schemas/todoSchema.ts',
        './src/livestore/schemas/workspaceSchema.ts',
        './src/livestore/schemas/projectSchema.ts',
        './src/livestore/schemas/issueSchema.ts',
      ]
    }),
  ],
  worker: { format: 'es' },
})
