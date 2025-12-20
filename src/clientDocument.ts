import { onUnmounted, shallowRef, computed, type WritableComputedRef } from 'vue'

import {
  queryDb,
  SessionIdSymbol,
  State,
  type RowQuery,
  type LiveQueryDef,
  type LiveStoreSchema,
  type Store
} from '@livestore/livestore'

import { useStore } from './store'

export type ClientDocumentTable<Value extends Record<string, unknown>> = State.SQLite.ClientDocumentTableDef<
  string,
  Value,
  unknown,
  State.SQLite.ClientDocumentTableOptions<Value>
>

type UseClientDocumentResult<
  TTableDef extends State.SQLite.ClientDocumentTableDef.TraitAny & { Value: Record<string, unknown> },
> = {
  id: string
  query$: LiveQueryDef<TTableDef['Value']>
} & {
    [K in keyof TTableDef['Value']]: WritableComputedRef<TTableDef['Value'][K]>
  }

type ClientDocumentTableWithRecordValue = State.SQLite.ClientDocumentTableDef.TraitAny & {
  Value: Record<string, unknown>
}

type ClientDocumentTableWithDefaultId<T extends ClientDocumentTableWithRecordValue> =
  [State.SQLite.ClientDocumentTableDef.DefaultIdType<T>] extends [never] ? never : T

export const useClientDocument: {
  // case: with default id
  <TTableDef extends ClientDocumentTableWithDefaultId<ClientDocumentTableWithRecordValue>>(
    table: TTableDef,
    id?: State.SQLite.ClientDocumentTableDef.DefaultIdType<TTableDef> | SessionIdSymbol,
    options?: Partial<RowQuery.GetOrCreateOptions<TTableDef>>,
    storeArg?: { store?: Store<LiveStoreSchema> }
  ): UseClientDocumentResult<TTableDef>

  // case: no default id → id arg is required
  <TTableDef extends ClientDocumentTableWithRecordValue>(
    table: TTableDef,
    id: State.SQLite.ClientDocumentTableDef.DefaultIdType<TTableDef> | string | SessionIdSymbol,
    options?: Partial<RowQuery.GetOrCreateOptions<TTableDef>>,
    storeArg?: { store?: Store<LiveStoreSchema> }
  ): UseClientDocumentResult<TTableDef>
} = <TTableDef extends State.SQLite.ClientDocumentTableDef.Any & { Value: Record<string, unknown> }>(
  table: TTableDef,
  id?: State.SQLite.ClientDocumentTableDef.DefaultIdType<TTableDef> | string | SessionIdSymbol,
  options?: Partial<RowQuery.GetOrCreateOptions<TTableDef>>,
  storeArg?: { store?: Store<LiveStoreSchema> }
): UseClientDocumentResult<TTableDef> => {
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

    type Value = TTableDef['Value']
    const defaultValues: Partial<Value> | undefined = options?.default
    const idStr = resolvedId === SessionIdSymbol ? store.sessionId : resolvedId
    const tableName = table.sqliteDef.name

    const getOptions = defaultValues ? { default: defaultValues } : undefined

    const query$: LiveQueryDef<Value> = queryDb(table.get(resolvedId, getOptions), {
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

    const computedFields = {} as { [K in keyof Value]: WritableComputedRef<Value[K]> }
    for (const key of Object.keys(state.value) as (keyof Value)[]) {
      computedFields[key] = computed<Value[typeof key]>({
        get: () => state.value[key],
        set: (value) => {
          setState({ ...state.value, [key]: value })
        },
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
