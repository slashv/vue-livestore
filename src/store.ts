import { inject, type InjectionKey } from 'vue'
import {
  createStorePromise,
  type CreateStoreOptionsPromise,
  type LiveStoreSchema,
  type Store,
} from '@livestore/livestore'
import { useQuery } from './query'
import { useClientDocument } from './clientDocument'

export type VueApi = {
  useQuery: typeof useQuery,
  useClientDocument: typeof useClientDocument
}

export type LiveStoreInstance<TSchema extends LiveStoreSchema = LiveStoreSchema> = Store<TSchema> & VueApi

export const LiveStoreKey: InjectionKey<LiveStoreInstance> = Symbol('LiveStore')

const VueApiMarker: unique symbol = Symbol('LiveStoreVueApiApplied')

type VueApiTaggedStore<TSchema extends LiveStoreSchema = LiveStoreSchema> = LiveStoreInstance<TSchema> & {
  [VueApiMarker]?: boolean
}

export const createStore = async <TSchema extends LiveStoreSchema>(
  options: CreateStoreOptionsPromise<TSchema>,
): Promise<LiveStoreInstance<TSchema>> => {
  const store = await createStorePromise<TSchema>(options)
  return withVueApi(store)
}

export const withVueApi = <TSchema extends LiveStoreSchema>(
  baseStore: Store<TSchema>,
): LiveStoreInstance<TSchema> => {
  const taggedStore = baseStore as VueApiTaggedStore<TSchema>

  if (taggedStore[VueApiMarker]) {
    return taggedStore
  }

  taggedStore.useQuery = ((queryable, options) =>
    useQuery(queryable, { ...options, store: baseStore })) as typeof useQuery
  taggedStore.useClientDocument = ((table, id, options, storeArg) => {
    const mergedStoreArg = { ...storeArg, store: baseStore as unknown as Store<LiveStoreSchema> }
    if (id === undefined) {
      return useClientDocument(table, undefined, options, mergedStoreArg)
    }
    return useClientDocument(table, id, options, mergedStoreArg)
  }) as typeof useClientDocument
  taggedStore[VueApiMarker] = true

  return taggedStore
}

export const useStore = <TSchema extends LiveStoreSchema = LiveStoreSchema>(
  options?: { store?: Store<TSchema> },
): { store: LiveStoreInstance<TSchema> } => {
  if (options?.store) {
    return { store: withVueApi(options.store) }
  }

  const injected = inject(LiveStoreKey)
  if (!injected) {
    throw new Error('LiveStore instance not provided. Make sure to install the provider and pass a store.')
  }

  return { store: injected as LiveStoreInstance<TSchema> }
}
