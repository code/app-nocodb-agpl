import type { MaybeRef } from '@vueuse/core'

const [useProvideSmartsheetRowStore, useSmartsheetRowStore] = useInjectionState(
  (row: MaybeRef<Row>, changedColumns: Ref<Set<string>> = ref(new Set<string>())) => {
    const currentRow = ref(row)

    // state
    const state = computed({
      get: () => currentRow.value?.rowMeta?.ltarState ?? {},
      set: (value) => {
        if (currentRow.value) {
          if (!currentRow.value.rowMeta) {
            currentRow.value.rowMeta = {}
          }
          currentRow.value.rowMeta.ltarState = value
        }
      },
    })

    const meta = inject(MetaInj, ref())

    const pk = computed(() => extractPkFromRow(currentRow.value.row, meta.value?.columns ?? []))

    // getters
    const isNew = computed(() => unref(row).rowMeta?.new ?? false)

    const displayValue = computed(() => {
      const row = unref(currentRow)

      const column = meta.value?.columns.find((col) => col.pv) || meta.value?.columns.find((col) => col.pk)

      return row.row[column?.title]
    })

    const { addLTARRef, removeLTARRef, addLTARRemoveRef, removeLTARRemoveRef, syncLTARRefs, loadRow, clearLTARCell, cleaMMCell } =
      useSmartsheetLtarHelpersOrThrow()

    // True when the row has buffered link/unlink changes not yet persisted.
    // Drives the expanded form's "modified" state for relational fields.
    const hasLtarChanges = computed(() => {
      const ltarState = currentRow.value?.rowMeta?.ltarState ?? {}
      const ltarRemoveState = currentRow.value?.rowMeta?.ltarRemoveState ?? {}
      const hasEntries = (s: Record<string, any>) =>
        Object.values(s).some((v) => (Array.isArray(v) ? v.length > 0 : !!v))
      return hasEntries(ltarState) || hasEntries(ltarRemoveState)
    })

    return {
      pk,
      row,
      changedColumns,
      state,
      isNew,
      hasLtarChanges,
      displayValue,
      // todo: use better name
      addLTARRef: async (...args: any) => {
        await addLTARRef(currentRow.value, ...args)
        // Force reactivity trigger — nested mutations on row.row may not auto-trigger
        triggerRef(currentRow as Ref)
      },
      removeLTARRef: async (...args: any) => {
        await removeLTARRef(currentRow.value, ...args)
        triggerRef(currentRow as Ref)
      },
      addLTARRemoveRef: async (...args: any) => {
        await addLTARRemoveRef(currentRow.value, ...args)
        triggerRef(currentRow as Ref)
      },
      removeLTARRemoveRef: async (...args: any) => {
        await removeLTARRemoveRef(currentRow.value, ...args)
        triggerRef(currentRow as Ref)
      },
      syncLTARRefs: (...args: any) => syncLTARRefs(currentRow.value, ...args),
      loadRow: (...args: any) => loadRow(currentRow.value, ...args),
      currentRow,
      clearLTARCell: (...args: any) => clearLTARCell(currentRow.value, ...args),
      cleaMMCell: (...args: any) => cleaMMCell(currentRow.value, ...args),
    }
  },
  'smartsheet-row-store',
)

export { useProvideSmartsheetRowStore, useSmartsheetRowStore }

export function useSmartsheetRowStoreOrThrow() {
  const smartsheetRowStore = useSmartsheetRowStore()

  if (smartsheetRowStore == null) throw new Error('Please call `useSmartsheetRowStore` on the appropriate parent component')

  return smartsheetRowStore
}
