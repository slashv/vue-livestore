import { defineComponent, provide, ref, markRaw, type PropType } from 'vue'
import {
  type CreateStoreOptions,
  type LiveStoreSchema,
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
  },
  async setup(props, { slots }) {
    const initError = ref<unknown | null>(null)
    provide(StoreInitErrorKey, { error: initError })

    const ready = ref(false)
    let resolveReady!: () => void
    let rejectReady!: (e: unknown) => void
    const readyPromise = new Promise<void>((resolve, reject) => { resolveReady = resolve; rejectReady = reject })
    provide(StoreReadyStateKey, { ready, promise: readyPromise })

    try {
      const store = await createStorePromise(props.options)
      const storeWithApi = markRaw(withVueApi(store))
      provide(LiveStoreKey, storeWithApi)
      ready.value = true
      resolveReady()
      return () => (slots.default ? slots.default({ store: storeWithApi }) : [])
    } catch (e) {
      initError.value = e
      rejectReady(e)
      throw e
    }
  },
})
