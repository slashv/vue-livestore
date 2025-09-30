import { defineComponent, provide, ref, markRaw, type PropType } from 'vue'
import {
  type CreateStoreOptions,
  type LiveStoreSchema,
  createStorePromise,
} from '@livestore/livestore'
import { LiveStoreKey, withVueApi, createDeferredStoreProxy, type LiveStoreInstance } from './store'

export const LiveStoreProvider = defineComponent({
  name: 'LiveStoreProvider',
  props: {
    options: {
      type: Object as PropType<CreateStoreOptions<LiveStoreSchema>>,
      required: true,
    },
  },
  setup(props, { slots }) {
    const ready = ref(false)
    const initError = ref<unknown | null>(null)
    let resolveReady!: () => void
    let rejectReady!: (e: unknown) => void
    const readyPromise = new Promise<void>((resolve, reject) => {
      resolveReady = resolve
      rejectReady = reject
    })

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

    return () => {
      if (!slots.default) return []
      if (slots.loading && !ready.value) {
        return slots.loading()
      }
      return slots.default()
    }
  },
})
