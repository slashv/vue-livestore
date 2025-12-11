import { inject, type InjectionKey } from 'vue'
import { type Store } from '@livestore/livestore'
import { useQuery } from './query'
import { useClientDocument } from './clientDocument'

export type VueApi = {
  useQuery: typeof useQuery,
  useClientDocument: typeof useClientDocument
}

export type LiveStoreInstance = Store & VueApi

export const LiveStoreKey: InjectionKey<LiveStoreInstance> = Symbol('LiveStore')

const VueApiMarker: unique symbol = Symbol('LiveStoreVueApiApplied')

type VueApiTaggedStore = LiveStoreInstance & {
  [VueApiMarker]?: boolean
}

export const withVueApi = (store: Store): LiveStoreInstance => {
  const taggedStore = store as VueApiTaggedStore

  if (taggedStore[VueApiMarker]) {
    return taggedStore
  }

  taggedStore.useQuery = (queryable) => useQuery(queryable, { store })
  taggedStore.useClientDocument = (table, id, options) => useClientDocument(table, id, options, { store })
  taggedStore[VueApiMarker] = true

  return taggedStore
}

export const useStore = (options?: { store?: Store }) => {
  if (options?.store) {
    return { store: withVueApi(options.store) }
  }
  const injected = inject(LiveStoreKey)
  if (!injected) {
    throw new Error('LiveStore instance not provided. Make sure to install the provider and pass a store.')
  }
  return { store: injected }
}
