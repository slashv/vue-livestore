// Original exports for backward compatibility
export { useQuery } from './query'
export { useStore } from './store'
export { useClientDocument } from './clientDocument'
export { LiveStoreProvider } from './provider'

// Multi-store API exports
export { createStoreContext } from './multi-store'
export type {
  ComputeProviderProps,
  CreateStoreContextConfig,
  CreateStoreContextReturn,
  StoreWithVueAPI,
  UseStoreOptions,
} from './multi-store'
