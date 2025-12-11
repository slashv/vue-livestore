/* eslint-disable @typescript-eslint/no-explicit-any */
import { onUnmounted, shallowRef, computed, type WritableComputedRef } from 'vue'

import {
  queryDb,
  SessionIdSymbol,
  State,
  type RowQuery,
  type LiveQueryDef,
  type Store
} from '@livestore/livestore'

import { useStore } from './store'

export type ClientDocumentTable<Value extends Record<string, any>> =
  State.SQLite.ClientDocumentTableDef.Trait<
    any,
    any,
    Value,
    { partialSet: boolean; default: { id: string | SessionIdSymbol; value: Value } }
  >

type UseClientDocumentResult<Value extends Record<string, any>> = {
  id: string
  query$: LiveQueryDef<Value>
} & {
  [K in keyof Value]: WritableComputedRef<Value[K]>
}

export function useClientDocument<Value extends Record<string, any>>(
  table: ClientDocumentTable<Value>,
  id?: string | SessionIdSymbol,
  options?: RowQuery.GetOrCreateOptions<ClientDocumentTable<Value>>,
  storeArg?: { store?: Store }
): UseClientDocumentResult<Value> {
  /* Used for clientDocuments only (UI state)
   *
   * WARNING: The interface for this is still experimental.
   * We might choose to revert to state, setState to match
   * the react bindings and provide a separate composable
   * or wrapper for better Vue DX.
   *
   * Returns:
   * - ...uiState variabels as writable computed refs
   * - 'id': Document ID
   * - 'query$': LiveQuery that can be used to subscribe to changes in document
   *
   * This composable functions different to the React hook useClientDocument
   * which returns state and setState in a more React way. The approach chosen
   * here allows us to write nice code like this:
   *
   * const { newTodoText, filters } = useClientDocument(tables.uiState)
   * ...
   * <input v-model="newTodoText" ...>
   * <select v-model="filters" ...>
   */

  const { store } = useStore(storeArg)

  if (!store) {
    throw new Error('Store not found. Make sure you are using LiveStoreProvider.')
  }

  const resolvedId =
    typeof id === 'string' || id === SessionIdSymbol
      ? id
      : table[State.SQLite.ClientDocumentTableDefSymbol].options.default.id

  if (!resolvedId) {
    throw new Error('Client document requires an ID')
  }

  const defaultValues = options?.default
  const idStr = resolvedId === SessionIdSymbol ? store.sessionId : resolvedId
  const tableName = (table as unknown as State.SQLite.TableDef<any, any>).sqliteDef.name

  const query$ = queryDb(table.get(resolvedId, options), {
    deps: [
      idStr,
      tableName,
      defaultValues ? JSON.stringify(defaultValues) : ''
    ]
  })
  const state = shallowRef<Value>(store.query(query$))

  const unsubscribeResult = store.subscribe(
    query$,
    (result: Value) => {
      state.value = result
    },
    { label: query$.label }
  )
  const unsubscribe = typeof unsubscribeResult === 'function' ? unsubscribeResult : () => { }

  const setState = (value: Value) => {
    store.commit(table.set(removeUndefinedValues(value), resolvedId))
  }

  type V = Value
  const computedFields = {} as { [K in keyof V]: WritableComputedRef<V[K]> }
  for (const key in state.value) {
    computedFields[key as keyof V] = computed({
      get: () => state.value[key as keyof V],
      set: (value: V[keyof V]) => {
        setState({ ...state.value, [key]: value })
      }
    })
  }

  onUnmounted(() => unsubscribe())

  return {
    ...computedFields,
    id: idStr,
    query$
  }
}

const removeUndefinedValues = <T extends Record<string, unknown>>(value: T): T => {
  if (typeof value !== 'object' || value === null) {
    return value
  }

  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined)
  ) as T
}
