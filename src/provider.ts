import { defineComponent, provide, toRaw, type PropType } from 'vue'
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
    const store = withVueApi(await createStorePromise(props.options))
    provide(LiveStoreKey, store)

    // Add __debugLiveStore property to window / globalThis
    globalThis.__debugLiveStore ??= {}
    if (Object.keys(globalThis.__debugLiveStore).length === 0) {
      globalThis.__debugLiveStore._ = toRaw(store)
    }
    globalThis.__debugLiveStore[props.options.debug?.instanceId ?? props.options.storeId] = toRaw(store)

    return () => {
      return slots.default ? slots.default() : []
    }
  },
})
