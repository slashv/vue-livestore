import type { LiveStoreSchema } from '@livestore/livestore'
import { createStorePromise } from '@livestore/livestore'
import {
  defineComponent,
  provide,
  inject,
  onUnmounted,
  type InjectionKey,
  type PropType,
  type SetupContext,
  shallowRef,
  toRaw,
  watch,
} from 'vue'
import { withVueApi } from '../store'
import { useQuery } from '../query'
import { useClientDocument } from '../clientDocument'
import type {
  CreateStoreContextConfig,
  CreateStoreContextReturn,
  StoreWithVueAPI,
  UseStoreOptions,
} from './types'

// ============================================
// Main Implementation
// ============================================

export function createStoreContext<
  TSchema extends LiveStoreSchema,
  const TConfig extends CreateStoreContextConfig<TSchema>,
>(config: TConfig): CreateStoreContextReturn<TSchema, TConfig> {
  // Create unique injection keys for this store context
  const StoreKey: InjectionKey<StoreWithVueAPI<TSchema>> = Symbol(`${config.name}Store`)
  const RegistryKey: InjectionKey<Map<string, StoreWithVueAPI<TSchema>>> = Symbol(`${config.name}Registry`)

  // ============================================
  // Provider Component
  // ============================================

  const Provider = defineComponent({
    name: `${config.name}StoreProvider`,
    props: {
      storeId: {
        type: String as PropType<string>,
        required: !config.storeId,
        default: config.storeId,
      },
      adapter: {
        type: [Object, Function] as PropType<any>, // eslint-disable-line @typescript-eslint/no-explicit-any
        required: !config.adapter,
        default: () => config.adapter,
      },
      disableDevtools: {
        type: Boolean,
        default: config.disableDevtools ?? false,
      },
      confirmUnsavedChanges: {
        type: Boolean,
        default: config.confirmUnsavedChanges ?? false,
      },
      syncPayload: {
        type: Object as PropType<any>, // eslint-disable-line @typescript-eslint/no-explicit-any
        default: () => config.syncPayload,
      },
    },
    setup(props: any, { slots }: SetupContext) { // eslint-disable-line @typescript-eslint/no-explicit-any
      // Registry for multi-instance support
      let registry = inject(RegistryKey, null)
      if (!registry) {
        registry = new Map<string, StoreWithVueAPI<TSchema>>()
        provide(RegistryKey, registry)
      }

      // Merge config with props - props take precedence
      const mergedProps = {
        schema: config.schema,
        adapter: props.adapter ?? config.adapter,
        storeId: props.storeId ?? config.storeId ?? config.name,
        disableDevtools: props.disableDevtools,
        confirmUnsavedChanges: props.confirmUnsavedChanges,
        syncPayload: props.syncPayload,
      }

      // Validate required props at runtime
      if (!mergedProps.adapter) {
        throw new Error(
          `${config.name} Provider: adapter is required. Provide it either in createStoreContext or as a prop to the Provider.`
        )
      }
      if (!mergedProps.storeId) {
        throw new Error(
          `${config.name} Provider: storeId is required. Provide it either in createStoreContext or as a prop to the Provider.`
        )
      }

      // Create a ref to hold the store once loaded
      const storeRef = shallowRef<StoreWithVueAPI<TSchema>>()

      // Create a proxy store that's available immediately (like the original provider)
      const proxyStore = new Proxy({} as any, { // eslint-disable-line @typescript-eslint/no-explicit-any
        get(_, key) {
          if (!storeRef.value) {
            throw new Error('LiveStore not initialized yet')
          }
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore – dynamic access
          return storeRef.value[key]
        },
      }) as StoreWithVueAPI<TSchema>

      // Provide the proxy store immediately
      provide(StoreKey, proxyStore)

      // Initiate async store creation
      createStorePromise({
        schema: mergedProps.schema,
        adapter: mergedProps.adapter,
        storeId: mergedProps.storeId,
        debug: mergedProps.disableDevtools ? undefined : { instanceId: mergedProps.storeId },
        ...(mergedProps.confirmUnsavedChanges && { confirmUnsavedChanges: true }),
        ...(mergedProps.syncPayload && { syncPayload: mergedProps.syncPayload }),
      }).then((store) => {
        // Add Vue-specific methods to the store
        const vueStore = withVueApi(store) as StoreWithVueAPI<TSchema>

        // Override the useQuery and useClientDocument to use the store directly
        vueStore.useQuery = (queryDef) => useQuery(queryDef, { store })
        vueStore.useClientDocument = (table, id, options) => useClientDocument(table, id, options, { store })

        storeRef.value = vueStore

        // Register in the registry for multi-instance access
        registry!.set(mergedProps.storeId, vueStore)
      })

      // Add debug support like original provider
      globalThis.__debugLiveStore ??= {}
      watch(
        () => storeRef.value,
        (updatedStore) => {
          if (updatedStore) {
            if (Object.keys(globalThis.__debugLiveStore).length === 0) {
              globalThis.__debugLiveStore._ = toRaw(updatedStore) as any // eslint-disable-line @typescript-eslint/no-explicit-any
            }
            globalThis.__debugLiveStore[mergedProps.storeId] = toRaw(updatedStore) as any // eslint-disable-line @typescript-eslint/no-explicit-any
          }
        },
      )

      // Cleanup on unmount
      onUnmounted(() => {
        if (storeRef.value) {
          registry?.delete(mergedProps.storeId)
        }
      })

      // Render loading state if store not ready, otherwise render children
      return () => {
        if (!storeRef.value) {
          return null // Similar to original provider's loading behavior
        }
        return slots.default?.()
      }
    },
  })

  // ============================================
  // useStore Composable
  // ============================================

  const useStore = (options?: UseStoreOptions): StoreWithVueAPI<TSchema> => {
    // Multi-instance access via storeId
    if (options?.storeId) {
      const registry = inject(RegistryKey)

      if (!registry) {
        throw new Error(
          `Multi-instance access requires the store to be created with createStoreContext. ` +
          `Cannot access store with storeId="${options.storeId}".`
        )
      }

      const store = registry.get(options.storeId)

      if (!store) {
        // For Suspense support, throw a promise that resolves when store is available
        throw new Promise<void>((resolve, reject) => {
          const targetStoreId = options.storeId!
          let attempts = 0
          const maxAttempts = 500 // 5 seconds with 10ms intervals

          const checkInterval = setInterval(() => {
            attempts++
            const foundStore = registry.get(targetStoreId)

            if (foundStore) {
              clearInterval(checkInterval)
              resolve()
            } else if (attempts >= maxAttempts) {
              clearInterval(checkInterval)
              reject(new Error(
                `Store instance "${targetStoreId}" not found after timeout. ` +
                `Make sure a ${config.name} Provider with storeId="${targetStoreId}" exists.`
              ))
            }
          }, 10)
        })
      }

      return store
    }

    // Default: use the store from the current context
    const store = inject(StoreKey)

    if (!store) {
      throw new Error(
        `useStore: must be used within a ${config.name} Provider. ` +
        `Wrap your component tree with <${config.name}Provider> to provide the store context.`
      )
    }

    return store
  }

  // Return the tuple
  return [Provider as any, useStore] // eslint-disable-line @typescript-eslint/no-explicit-any
}