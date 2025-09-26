import type { Adapter, LiveStoreSchema, Store, Schema } from '@livestore/livestore'
import type { useQuery } from '../query'
import type { useClientDocument } from '../clientDocument'
import type { DefineComponent } from 'vue'

// ============================================
// Core Types
// ============================================

// Configuration that can be provided to createStoreContext
export interface CreateStoreContextConfig<TSchema extends LiveStoreSchema> {
  name: string
  schema: TSchema
  adapter?: Adapter
  storeId?: string
  disableDevtools?: boolean
  confirmUnsavedChanges?: boolean
  syncPayload?: Schema.JsonValue
}

// All possible Provider props
export interface BaseProviderProps {
  storeId?: string
  adapter?: Adapter
  disableDevtools?: boolean
  confirmUnsavedChanges?: boolean
  syncPayload?: Schema.JsonValue
}

// ============================================
// Type-Level Computation
// ============================================

// Define props that can be configured either at createStoreContext or Provider level
type ConfigurableProps = {
  adapter: Adapter
  storeId: string
}

// Helper to extract props from config that have non-undefined values
type ProvidedConfigProps<T> = {
  [K in keyof T as T[K] extends undefined ? never : K]: T[K]
}

// Compute which Provider props are required based on what was provided in config
// Props in config become optional (can override), props not in config are required
export type ComputeProviderProps<TConfig extends CreateStoreContextConfig<LiveStoreSchema>> = {
  disableDevtools?: boolean
  confirmUnsavedChanges?: boolean
  syncPayload?: Schema.JsonValue
} & Omit<Required<ConfigurableProps>, keyof ProvidedConfigProps<TConfig>> &
  Partial<Pick<ConfigurableProps, keyof ProvidedConfigProps<TConfig> & keyof ConfigurableProps>>

// ============================================
// Store API Types
// ============================================

// Vue-specific methods added to the store
export type StoreVueAPI<_TSchema extends LiveStoreSchema> = {
  useQuery: typeof useQuery
  useClientDocument: typeof useClientDocument
}

// Store with Vue API methods
export type StoreWithVueAPI<TSchema extends LiveStoreSchema> = Store<TSchema> & StoreVueAPI<TSchema>

// Options for useStore hook
export interface UseStoreOptions {
  storeId?: string
}

// ============================================
// Main Function Return Type
// ============================================

export type CreateStoreContextReturn<
  TSchema extends LiveStoreSchema,
  TConfig extends CreateStoreContextConfig<TSchema>,
> = [
    DefineComponent<ComputeProviderProps<TConfig>>,
    (options?: UseStoreOptions) => StoreWithVueAPI<TSchema>,
  ]
