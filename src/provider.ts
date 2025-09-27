import { defineComponent, provide, ref, markRaw, h, type PropType } from 'vue'
import {
  type CreateStoreOptions,
  type LiveStoreSchema,
  createStorePromise,
} from '@livestore/livestore'
import { LiveStoreKey, withVueApi, StoreReadyStateKey, StoreInitErrorKey, createDeferredStoreProxy, type LiveStoreInstance } from './store'

export const LiveStoreProvider = defineComponent({
  name: 'LiveStoreProvider',
  props: {
    options: {
      type: Object as PropType<CreateStoreOptions<LiveStoreSchema>>,
      required: true,
    },
    suspend: {
      type: Boolean as PropType<boolean>,
      default: false,
    },
  },
  setup(props, { slots }) {
    const initError = ref<unknown | null>(null)
    provide(StoreInitErrorKey, { error: initError })

    const ready = ref(false)
    let resolveReady!: () => void
    let rejectReady!: (e: unknown) => void
    const readyPromise = new Promise<void>((resolve, reject) => { resolveReady = resolve; rejectReady = reject })
    provide(StoreReadyStateKey, { ready, promise: readyPromise })

    let resolvedStore: LiveStoreInstance | null = null
    const proxy = createDeferredStoreProxy(() => resolvedStore, ready, readyPromise, () => initError.value)
    provide(LiveStoreKey, proxy)

    createStorePromise(props.options)
      .then((store) => {
        const storeWithApi = markRaw(withVueApi(store))
        resolvedStore = storeWithApi
        ready.value = true
        resolveReady()
      })
      .catch((e) => {
        initError.value = e
        rejectReady(e)
      })

    const Gate = defineComponent({
      name: 'LiveStoreProviderGate',
      async setup(_p, { slots: s }) {
        if (!ready.value) {
          await readyPromise
        }
        return () => s.default?.()
      },
    })

    return () => {
      if (!slots.default) return []
      if (!props.suspend) {
        return slots.default()
      }
      return h(Gate as unknown as object, {}, { default: () => slots.default!() })
    }
  },
})
