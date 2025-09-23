import type { LiveStoreSchema, Adapter, Schema } from '@livestore/livestore'
import {
  defineComponent,
  h,
  provide,
  inject,
  onUnmounted,
  type InjectionKey,
  type PropType,
  type SetupContext,
} from 'vue'
import { LiveStoreProvider } from '../provider'
import { LiveStoreKey } from '../store'
import type {
  CreateStoreContextConfig,
  CreateStoreContextReturn,
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
      // Delegate to LiveStoreProvider and register the created store instance
      const StoreRegistrar = defineComponent({
        name: `${config.name}StoreRegistrar`,
        props: {
          storeId: { type: String as PropType<string>, required: true },
          registry: { type: Object as PropType<Map<string, StoreWithVueAPI<TSchema>>>, required: true },
        },
        setup(localProps, { slots: localSlots }) {
          const store = inject(LiveStoreKey)
          if (!store) {
            throw new Error(
              `useStore: must be used within a ${config.name} Provider. ` +
              `Wrap your component tree with <${config.name}Provider> to provide the store context.`
            )
          }

          // Re-provide the store under this context's key for isolation
          provide(StoreKey, store as unknown as StoreWithVueAPI<TSchema>)

          // Register immediately with the proxy store to avoid Suspense in child setup
          localProps.registry.set(localProps.storeId, store as unknown as StoreWithVueAPI<TSchema>)
          onUnmounted(() => {
            localProps.registry.delete(localProps.storeId)
          })

          return () => localSlots.default?.()
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
            default: () =>
              h(
                StoreRegistrar as unknown as object,
                { storeId: mergedProps.storeId, registry },
                { default: slots.default },
              ),
            loading: slots.loading ? () => slots.loading!() : undefined,
          },
        )
    },
  })

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

    // Default: use the store from this context's provider
    const store = inject(StoreKey)

    if (!store) {
      throw new Error(
        `useStore: must be used within a ${config.name} Provider. ` +
        `Wrap your component tree with <${config.name}Provider> to provide the store context.`
      )
    }

    return store as unknown as StoreWithVueAPI<TSchema>
  }

  return [Provider, useStore]
}
