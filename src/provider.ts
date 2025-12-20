import { defineComponent, provide, shallowRef, toRaw, type PropType } from 'vue'
import {
  createStorePromise,
  type CreateStoreOptionsPromise,
  type LiveStoreSchema,
} from '@livestore/livestore'
import { LiveStoreKey, withVueApi } from './store'

export const LiveStoreProvider = defineComponent({
  name: 'LiveStoreProvider',
  props: {
    options: {
      type: Object as PropType<CreateStoreOptionsPromise<LiveStoreSchema>>,
      required: true,
    },
  },
  async setup(props, { slots }) {
    const store = shallowRef<ReturnType<typeof withVueApi> | null>(null)
    const promise = createStorePromise(props.options).then((resolvedStore) => withVueApi(resolvedStore))

    provide(LiveStoreKey, { store, promise })

    const resolvedStore = await promise
    store.value = resolvedStore

    globalThis.__debugLiveStore ??= {}
    if (Object.keys(globalThis.__debugLiveStore).length === 0) {
      globalThis.__debugLiveStore._ = toRaw(resolvedStore)
    }
    globalThis.__debugLiveStore[props.options.debug?.instanceId ?? props.options.storeId] = toRaw(resolvedStore)

    return () => (slots.default ? slots.default() : [])
  },
})
