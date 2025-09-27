import { defineComponent, provide, ref, toRaw, watch, shallowRef, onUnmounted, type PropType } from 'vue'
import {
  type CreateStoreOptions,
  type LiveStoreSchema,
  type Store,
  createStorePromise,
} from '@livestore/livestore'
import { LiveStoreKey, withVueApi, StoreReadyStateKey, StoreInitErrorKey } from './store'

export const LiveStoreProvider = defineComponent({
  name: 'LiveStoreProvider',
  props: {
    options: {
      type: Object as PropType<CreateStoreOptions<LiveStoreSchema>>,
      required: true,
    },
    blockUntilReady: {
      type: Boolean,
      default: true,
    },
  },
  setup(props, { slots }) {
    const storeRef = ref<Store>()

    // Provide readiness and error state for Suspense consumers
    let resolveReady!: () => void
    let rejectReady!: (e: unknown) => void
    const ready = ref(false)
    const initError = ref<unknown | null>(null)

    const readyPromise = new Promise<void>((resolve, reject) => {
      resolveReady = resolve
      rejectReady = reject
    })

    provide(StoreReadyStateKey, { ready, promise: readyPromise })
    provide(StoreInitErrorKey, { error: initError })

    // Initiate async store creation
    createStorePromise(props.options)
      .then((store) => {
        storeRef.value = withVueApi(store)
        ready.value = true
        resolveReady()
      })
      .catch((e) => {
        initError.value = e
        rejectReady(e)
      })

    // Inject a proxy immediately so that useStore() can be called while loading.
    provide(
      LiveStoreKey,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new Proxy({} as any, {
        get(_, key) {
          // Before initialization, expose safe fields and provide non-throwing stubs for Vue API
          if (!storeRef.value) {
            // Surface init errors immediately
            if (initError.value) throw initError.value

            // Always allow reading configured storeId early
            if (key === 'storeId') {
              return props.options.storeId
            }

            // Provide a non-throwing useQuery stub that hydrates after ready
            if (key === 'useQuery') {
              return (queryDef: unknown) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const data = shallowRef([] as any)
                let unsubscribe: void | (() => void)
                readyPromise.then(() => {
                  const readyStore = storeRef.value!
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  data.value = readyStore.query(queryDef as any)
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  unsubscribe = readyStore.subscribe(queryDef as any, {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onUpdate: (result: any) => {
                      data.value = result
                    },
                  })
                })
                onUnmounted(() => unsubscribe?.())
                return data
              }
            }
            if (key === 'useClientDocument') {
              return () => {
                throw readyPromise
              }
            }

            // Avoid throwing during render for unknown keys; return a callable that suspends when invoked.
            if (typeof key === 'symbol') return undefined
            if (
              key === '__v_isReactive' ||
              key === '__v_skip' ||
              key === '__v_raw' ||
              key === 'toString' ||
              key === 'valueOf' ||
              key === 'then'
            ) {
              return undefined
            }
            return (..._args: unknown[]) => {
              throw readyPromise
            }
          }
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore – dynamic access
          return storeRef.value[key]
        },
      }),
    )

    // Add __debugLiveStore property to window / globalThis
    globalThis.__debugLiveStore ??= {}
    watch(
      () => storeRef.value,
      (updatedStore) => {
        if (Object.keys(globalThis.__debugLiveStore).length === 0) {
          globalThis.__debugLiveStore._ = toRaw(updatedStore)
        }
        globalThis.__debugLiveStore[props.options.debug?.instanceId ?? props.options.storeId] =
          toRaw(updatedStore)
      },
    )

    return () => {
      if (props.blockUntilReady) {
        if (!storeRef.value) {
          return slots.loading ? slots.loading() : null
        }
        return slots.default ? slots.default() : []
      }
      return slots.default ? slots.default() : []
    }
  },
})
