import { shallowRef, onUnmounted, type Ref } from 'vue'

import { type Queryable, type Store } from '@livestore/livestore'
import { useStore } from './store'

const subscriptionLabel = <TResult>(queryable: Queryable<TResult>): string | undefined => {
  const maybeLabel = (queryable as { label?: unknown }).label
  return typeof maybeLabel === 'string' ? maybeLabel : undefined
}

export const useQuery = <TResult, TQueryable extends Queryable<TResult>>(
  queryable: TQueryable,
  options?: { store?: Store }
): Readonly<Ref<TResult>> => {
  const { store } = useStore(options)

  const data = shallowRef<TResult>(store.query(queryable))

  const label = subscriptionLabel(queryable)
  const unsubscribeResult = store.subscribe(
    queryable,
    (result: TResult) => {
      data.value = result
    },
    label ? { label } : undefined
  )
  const unsubscribe = typeof unsubscribeResult === 'function' ? unsubscribeResult : () => { }

  onUnmounted(() => {
    unsubscribe()
  })

  return data
}
