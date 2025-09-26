/* eslint-disable @typescript-eslint/no-explicit-any */
import { onUnmounted, shallowRef, computed, type WritableComputedRef } from 'vue'

import { queryDb, SessionIdSymbol, State, type RowQuery, type LiveQueryDef, type Store } from '@livestore/livestore'

import { useStore } from './store'

export type ClientDocumentTable<Value extends Record<string, any>> =
  State.SQLite.ClientDocumentTableDef.Trait<
    any,
    any,
    Value,
    { partialSet: boolean; default: { id: string | SessionIdSymbol; value: Value } }
  >

export type UseClientDocumentResult<TTableDef extends State.SQLite.ClientDocumentTableDef.TraitAny> = {
  id: string
  query$: LiveQueryDef<TTableDef['Value']>
} & {
  [K in keyof TTableDef['Value']]: WritableComputedRef<TTableDef['Value'][K]>
}

export function useClientDocument<
  TTableDef extends State.SQLite.ClientDocumentTableDef.Trait<
    any,
    any,
    any,
    { partialSet: boolean; default: { id: string | SessionIdSymbol; value: any } }
  >
>(
  table: TTableDef,
  id?: State.SQLite.ClientDocumentTableDef.DefaultIdType<TTableDef> | SessionIdSymbol,
  options?: RowQuery.GetOrCreateOptions<TTableDef>,
  storeArg?: { store: Store }
): UseClientDocumentResult<TTableDef> {
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

  const documentId = id ?? SessionIdSymbol
  if (!documentId) {
    throw new Error('Client document requires an ID')
  }

  let idStr: string
  if (documentId === SessionIdSymbol) {
    idStr = store.clientSession.sessionId
  } else if (typeof documentId === 'string') {
    idStr = documentId
  } else {
    idStr = store.clientSession.sessionId
  }

  const query$: LiveQueryDef<TTableDef['Value']> = queryDb(
    table.get(documentId as string | typeof SessionIdSymbol, options)
  )
  const state = shallowRef<TTableDef['Value']>(store.query(query$))

  const unsubscribe = store.subscribe(query$, {
    onUpdate: (result: TTableDef['Value']) => {
      state.value = result
    }
  })

  const setState = (value: TTableDef['Value']) => {
    store.commit(table.set(value, documentId as string | typeof SessionIdSymbol))
  }

  type V = TTableDef['Value']
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
