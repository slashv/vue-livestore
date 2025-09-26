import { defineComponent, provide, ref, toRaw, watch, type PropType } from 'vue'
import {
  type CreateStoreOptions,
  type LiveStoreSchema,
  type Store,
  createStorePromise,
} from '@livestore/livestore'
import { LiveStoreKey, withVueApi } from './store'

export const LiveStoreProvider = defineComponent({
  name: 'LiveStoreProvider',
  props: {
    options: {
      type: Object as PropType<CreateStoreOptions<LiveStoreSchema>>,
      required: true,
    },
  },
  setup(props, { slots }) {
    const storeRef = ref<Store>()

    // Initiate async store creation
    createStorePromise(props.options).then((store) => {
      storeRef.value = withVueApi(store)
    })

    // Inject a proxy immediately so that useStore() can be called while loading.
    provide(
      LiveStoreKey,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new Proxy({} as any, {
        get(_, key) {
          if (!storeRef.value) throw new Error('LiveStore not initialized yet')
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
      if (!storeRef.value) {
        return slots.loading ? slots.loading() : null
      }
      return slots.default ? slots.default() : []
    }
  },
})
