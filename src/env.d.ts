/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module '@kangc/v-md-editor/lib/preview' {
  import type { DefineComponent, PluginObject } from 'vue'
  const VMdPreview: DefineComponent<{
    text?: string
    mode?: string
    [key: string]: unknown
  }> & { use: (plugin: PluginObject<unknown>) => void }
  export default VMdPreview
}

declare module '@kangc/v-md-editor/lib/theme/github' {
  import type { PluginObject } from 'vue'
  const theme: PluginObject<unknown>
  export default theme
}

declare module '@kangc/v-md-editor/lib/style/preview.css'
declare module '@kangc/v-md-editor/lib/theme/style/github.css'
