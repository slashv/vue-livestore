import type { LiveStoreSchema, Adapter, Schema } from '@livestore/livestore'
import {
  defineComponent,
  h,
  provide,
  inject,
  onUnmounted,
  Suspense,
  type InjectionKey,
  type PropType,
  type SetupContext,
  type DefineComponent,
} from 'vue'
import { LiveStoreProvider } from '../provider'
import { LiveStoreKey, StoreReadyStateKey, type LiveStoreInstance } from '../store'
import type {
  CreateStoreContextConfig,
  CreateStoreContextReturn,
  ComputeProviderProps,
  StoreWithVueAPI,
  UseStoreOptions,
} from './types'

// Define the props interface for the Provider component
interface ProviderProps {
  storeId?: string
  adapter?: Adapter
  disableDevtools?: boolean
  confirmUnsavedChanges?: boolean
  syncPayload?: Schema.JsonValue
}

export function createStoreContext<
  TSchema extends LiveStoreSchema,
  const TConfig extends CreateStoreContextConfig<TSchema>,
>(config: TConfig): CreateStoreContextReturn<TSchema, TConfig> {
  // Create unique injection keys for this store context
  const RegistryKey: InjectionKey<Map<string, StoreWithVueAPI<TSchema>>> = Symbol(`${config.name}Registry`)
  const StoreKey: InjectionKey<StoreWithVueAPI<TSchema>> = Symbol(`${config.name}Store`)

  const Provider = defineComponent({
    name: `${config.name}StoreProvider`,
    props: {
      storeId: {
        type: String as PropType<string>,
        required: !config.storeId,
        default: config.storeId,
      },
      adapter: {
        type: [Object, Function] as PropType<Adapter>,
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
        type: Object as PropType<Schema.JsonValue>,
        default: () => config.syncPayload,
      },
    },
    setup(props: ProviderProps, { slots }: SetupContext) {
      // Per-provider registry for React parity (no inheritance)
      const registry = new Map<string, StoreWithVueAPI<TSchema>>()
      provide(RegistryKey, registry)

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
      // Delegate to LiveStoreProvider and register the created store instance (proxy provided by provider)
      const StoreRegistrar = defineComponent({
        name: `${config.name}StoreRegistrar`,
        props: {
          storeId: { type: String as PropType<string>, required: true },
          registry: { type: Object as PropType<Map<string, StoreWithVueAPI<TSchema>>>, required: true },
        },
        setup(localProps, { slots: localSlots }) {
          const injectedStore = inject(LiveStoreKey)
          if (!injectedStore) {
            throw new Error(`${config.name} Provider: LiveStore is not available in StoreRegistrar`)
          }
          // Provide the store under this context's key for isolation
          provide(StoreKey, injectedStore as unknown as StoreWithVueAPI<TSchema>)
          // Also re-provide LiveStoreKey locally so generic hooks can work inside this subtree
          provide(LiveStoreKey, injectedStore as unknown as LiveStoreInstance)

          // Re-provide StoreReadyStateKey so useStore can access it for Suspense support
          const readyState = inject(StoreReadyStateKey)
          if (readyState) {
            provide(StoreReadyStateKey, readyState)
          }

          // Register the provided store for multi-instance lookup
          localProps.registry.set(localProps.storeId, injectedStore as unknown as StoreWithVueAPI<TSchema>)
          onUnmounted(() => {
            localProps.registry.delete(localProps.storeId)
          })

          return () => localSlots.default?.()
        },
      })

      // Optional gate that awaits until provider store is ready; used only when loading slot is provided
      const ReadyGate = defineComponent({
        name: `${config.name}ReadyGate`,
        async setup(_p, { slots: s }) {
          const readyState = inject(StoreReadyStateKey, null)
          if (readyState && !readyState.ready.value) {
            await readyState.promise
          }
          return () => s.default?.()
        },
      })

      return () =>
        h(
          LiveStoreProvider as unknown as object,
          {
            options: {
              schema: mergedProps.schema,
              adapter: mergedProps.adapter,
              storeId: mergedProps.storeId,
              debug: mergedProps.disableDevtools ? undefined : { instanceId: mergedProps.storeId },
              ...(mergedProps.confirmUnsavedChanges && { confirmUnsavedChanges: true }),
              ...(mergedProps.syncPayload && { syncPayload: mergedProps.syncPayload }),
            } as unknown,
          },
          {
            default: () => {
              const inner = h(
                StoreRegistrar as unknown as object,
                { storeId: mergedProps.storeId, registry },
                { default: slots.default },
              )
              if (slots.loading) {
                return h(
                  Suspense,
                  {},
                  {
                    default: () => h(ReadyGate as unknown as object, {}, { default: () => inner }),
                    fallback: () => slots.loading!(),
                  },
                )
              }
              return inner
            },
          },
        )
    },
  })

  // Synchronous version - for use with provider's loading slot or when store is guaranteed to be ready
  const useStoreSync = (options?: UseStoreOptions): StoreWithVueAPI<TSchema> => {
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
        // Instance not registered yet; return the provider-level store so callers can at least read storeId
        // The registrar will replace the context store before children render.
        const fallback = inject(LiveStoreKey)
        if (!fallback) {
          throw new Error(
            `useStoreSync: must be used within a ${config.name} Provider. ` +
            `Wrap your component tree with <${config.name}Provider> to provide the store context.`
          )
        }
        return fallback as unknown as StoreWithVueAPI<TSchema>
      }
      return store
    }

    // Get the store - for sync version, we expect it to be ready or within a loading slot
    const store = inject(StoreKey)
    if (!store) {
      throw new Error(
        `useStoreSync: must be used within a ${config.name} Provider. ` +
        `Wrap your component tree with <${config.name}Provider> to provide the store context.`
      )
    }

    return store as unknown as StoreWithVueAPI<TSchema>
  }

  // Async version - waits for store to be ready before returning
  const useStore = (options?: UseStoreOptions): Promise<StoreWithVueAPI<TSchema>> => {
    // All inject calls must happen synchronously in setup context
    const readyState = inject(StoreReadyStateKey, null)

    // For multi-instance access, we need to handle it specially
    if (options?.storeId) {
      const registry = inject(RegistryKey)
      const fallback = inject(LiveStoreKey)

      return new Promise((resolve, reject) => {
        // Wait for ready if needed
        const waitPromise = readyState && !readyState.ready.value ? readyState.promise : Promise.resolve()

        waitPromise.then(() => {
          if (!registry) {
            reject(new Error(
              `Multi-instance access requires the store to be created with createStoreContext. ` +
              `Cannot access store with storeId="${options.storeId}".`
            ))
            return
          }

          const store = registry.get(options.storeId!)
          if (store) {
            resolve(store)
          } else if (fallback) {
            resolve(fallback as unknown as StoreWithVueAPI<TSchema>)
          } else {
            reject(new Error(
              `useStore: must be used within a ${config.name} Provider. ` +
              `Wrap your component tree with <${config.name}Provider> to provide the store context.`
            ))
          }
        })
      })
    }

    // Single instance access
    const store = inject(StoreKey)

    return new Promise((resolve, reject) => {
      if (!store) {
        reject(new Error(
          `useStore: must be used within a ${config.name} Provider. ` +
          `Wrap your component tree with <${config.name}Provider> to provide the store context.`
        ))
        return
      }

      // If store isn't ready, wait for it
      if (readyState && !readyState.ready.value) {
        readyState.promise.then(() => {
          resolve(store as unknown as StoreWithVueAPI<TSchema>)
        })
      } else {
        resolve(store as unknown as StoreWithVueAPI<TSchema>)
      }
    })
  }

  return [Provider as unknown as DefineComponent<ComputeProviderProps<TConfig>>, useStoreSync, useStore]
}
