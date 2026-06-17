import { RelationTypes, isBtLikeV2Junction, isLinksOrLTAR, isMMOrMMLike } from 'nocodb-sdk'
import type { ColumnType, LinkToAnotherRecordType, TableType } from 'nocodb-sdk'
import type { Ref } from 'vue'

const [useProvideSmartsheetLtarHelpers, useSmartsheetLtarHelpers] = useInjectionState(
  (meta: Ref<TableType | undefined> | ComputedRef<TableType | undefined>) => {
    const { $api } = useNuxtApp()

    const { t } = useI18n()

    const { base } = storeToRefs(useBase())

    const { getMetaByKey } = useMetas()

    const getRowLtarHelpers = (row: Row) => {
      if (!row.rowMeta) {
        row.rowMeta = {}
      }
      if (!row.rowMeta.ltarState) {
        row.rowMeta.ltarState = {}
      }
      return row.rowMeta.ltarState
    }

    // Pending unlinks buffered for an existing record edited in the expanded form.
    // Mirrors `ltarState` (pending links) but holds links to remove on save. Only
    // relevant for existing rows — new rows have nothing persisted to remove.
    const getRowLtarRemoveState = (row: Row) => {
      if (!row.rowMeta) {
        row.rowMeta = {}
      }
      if (!row.rowMeta.ltarRemoveState) {
        row.rowMeta.ltarRemoveState = {}
      }
      return row.rowMeta.ltarRemoveState
    }

    // actions
    // `skipRowDisplay` keeps `row.row` untouched — used for existing records edited in
    // the expanded form, where the visible links come from the API-loaded children list,
    // not `row.row`. New rows leave it false so the buffered links drive the cell display.
    const addLTARRef = async (
      row: Row,
      value: Record<string, any>,
      column: ColumnType,
      { skipRowDisplay = false }: { skipRowDisplay?: boolean } = {},
    ) => {
      // V2 MO/OO uses junction table but is single-record — treat as BT
      if (isBtLikeV2Junction(column) || isBt(column) || isOo(column)) {
        getRowLtarHelpers(row)[column.title!] = value
        if (!skipRowDisplay) row.row[column.title!] = value
      } else if (isHm(column) || isMm(column) || isMMOrMMLike(column)) {
        if (!getRowLtarHelpers(row)[column.title!]) getRowLtarHelpers(row)[column.title!] = []

        if (getRowLtarHelpers(row)[column.title!]!.find((ln: Record<string, any>) => deepCompare(ln, value))) {
          // This value is already in the list
          return message.info(t('msg.info.valueAlreadyInList'))
        }

        if (Array.isArray(value)) {
          getRowLtarHelpers(row)[column.title!]!.push(...value)
        } else {
          getRowLtarHelpers(row)[column.title!]!.push(value)
        }
        // Also update row.row so cellValue triggers re-render
        if (!skipRowDisplay) row.row[column.title!] = [...(getRowLtarHelpers(row)[column.title!] || [])]
      }
    }

    // actions
    const removeLTARRef = async (
      row: Row,
      value: Record<string, any>,
      column: ColumnType,
      { skipRowDisplay = false }: { skipRowDisplay?: boolean } = {},
    ) => {
      // V2 MO/OO uses junction table but is single-record — treat as BT
      if (isBtLikeV2Junction(column) || isBt(column) || isOo(column)) {
        getRowLtarHelpers(row)[column.title!] = null
        if (!skipRowDisplay) row.row[column.title!] = null
      } else if (isHm(column) || isMm(column) || isMMOrMMLike(column)) {
        const idx = getRowLtarHelpers(row)[column.title!]?.findIndex((ln: Record<string, any>) => deepCompare(ln, value)) ?? -1
        if (idx !== -1) getRowLtarHelpers(row)[column.title!]?.splice(idx, 1)
        if (!skipRowDisplay) row.row[column.title!] = [...(getRowLtarHelpers(row)[column.title!] || [])]
      }
    }

    // Buffer a link removal (existing-row unlink deferred until save).
    const addLTARRemoveRef = async (row: Row, value: Record<string, any>, column: ColumnType) => {
      if (isBtLikeV2Junction(column) || isBt(column) || isOo(column)) {
        getRowLtarRemoveState(row)[column.title!] = value
      } else if (isHm(column) || isMm(column) || isMMOrMMLike(column)) {
        if (!getRowLtarRemoveState(row)[column.title!]) getRowLtarRemoveState(row)[column.title!] = []
        const list = getRowLtarRemoveState(row)[column.title!]!
        if (!list.find((ln: Record<string, any>) => deepCompare(ln, value))) list.push(value)
      }
    }

    // Cancel a buffered link removal (re-linking something queued for unlink).
    const removeLTARRemoveRef = async (row: Row, value: Record<string, any>, column: ColumnType) => {
      const removeState = getRowLtarRemoveState(row)
      if (isBtLikeV2Junction(column) || isBt(column) || isOo(column)) {
        removeState[column.title!] = null
      } else if (isHm(column) || isMm(column) || isMMOrMMLike(column)) {
        const idx = removeState[column.title!]?.findIndex((ln: Record<string, any>) => deepCompare(ln, value)) ?? -1
        if (idx !== -1) removeState[column.title!]!.splice(idx, 1)
      }
    }

    const linkRecord = async (
      rowId: string,
      relatedRowId: string,
      column: ColumnType,
      type: RelationTypes,
      { metaValue = meta.value }: { metaValue?: TableType } = {},
    ) => {
      try {
        await $api.dbTableRow.nestedAdd(
          NOCO,
          metaValue?.base_id ?? (base.value.id as string),
          metaValue?.id as string,
          encodeURIComponent(rowId),
          type,
          column.id as string,
          encodeURIComponent(relatedRowId),
        )
      } catch (e: any) {
        message.error(await extractSdkResponseErrorMsg(e))
      }
    }

    const unlinkRecord = async (
      rowId: string,
      relatedRowId: string,
      column: ColumnType,
      type: RelationTypes,
      { metaValue = meta.value }: { metaValue?: TableType } = {},
    ) => {
      try {
        await $api.dbTableRow.nestedRemove(
          NOCO,
          metaValue?.base_id ?? (base.value.id as string),
          metaValue?.id as string,
          encodeURIComponent(rowId),
          type,
          column.id as string,
          encodeURIComponent(relatedRowId),
        )
      } catch (e: any) {
        message.error(await extractSdkResponseErrorMsg(e))
      }
    }

    /** sync LTAR relations kept in local state */
    const syncLTARRefs = async (
      row: Row,
      rowData: Record<string, any>,
      { metaValue = meta.value }: { metaValue?: TableType } = {},
    ) => {
      const id = extractPkFromRow(rowData, metaValue?.columns as ColumnType[])
      for (const column of metaValue?.columns ?? []) {
        if (!isLinksOrLTAR(column)) continue

        const colOptions = column.colOptions as LinkToAnotherRecordType

        const relatedBaseId = (colOptions as any)?.fk_related_base_id || metaValue?.base_id
        const relatedTableMeta = getMetaByKey(relatedBaseId, colOptions?.fk_related_model_id as string)

        if (isBtLikeV2Junction(column) || isBt(column) || isOo(column)) {
          // V2 MO/OO and V1 BT/OO — single-record link
          if (getRowLtarHelpers(row)?.[column.title!]) {
            await linkRecord(
              id,
              extractPkFromRow(
                getRowLtarHelpers(row)?.[column.title!] as Record<string, any>,
                relatedTableMeta.columns as ColumnType[],
              ),
              column,
              colOptions.type as RelationTypes,
              { metaValue },
            )
          }
        } else if (isHm(column) || isMm(column) || isMMOrMMLike(column)) {
          const relatedRows = (getRowLtarHelpers(row)?.[column.title!] ?? []) as Record<string, any>[]

          for (const relatedRow of relatedRows) {
            await linkRecord(
              id,
              extractPkFromRow(relatedRow, relatedTableMeta.columns as ColumnType[]),
              column,
              colOptions.type as RelationTypes,
              { metaValue },
            )
          }
        }

        // Replay buffered unlinks (existing record edited in the expanded form).
        const removeState = getRowLtarRemoveState(row)?.[column.title!]
        if (removeState) {
          const rowsToRemove = (Array.isArray(removeState) ? removeState : [removeState]).filter(Boolean)
          for (const relatedRow of rowsToRemove) {
            await unlinkRecord(
              id,
              extractPkFromRow(relatedRow, relatedTableMeta.columns as ColumnType[]),
              column,
              colOptions.type as RelationTypes,
              { metaValue },
            )
          }
        }

        // clear LTAR refs after sync
        getRowLtarHelpers(row)[column.title!] = null
        getRowLtarRemoveState(row)[column.title!] = null
      }
    }

    // clear LTAR cell
    const clearLTARCell = async (row: Row, column: ColumnType) => {
      try {
        if (!column || !isLinksOrLTAR(column)) return

        const relatedTableMeta = getMetaByKey(
          meta.value?.base_id,
          (<LinkToAnotherRecordType>column?.colOptions)?.fk_related_model_id as string,
        )

        if (row.rowMeta.new) {
          getRowLtarHelpers(row)[column.title!] = null
        } else {
          if ([RelationTypes.BELONGS_TO, RelationTypes.ONE_TO_ONE].includes((<LinkToAnotherRecordType>column.colOptions)?.type)) {
            if (!row.row[column.title!]) return
            await $api.dbTableRow.nestedRemove(
              NOCO,
              meta.value?.base_id ?? (base.value.id as string),
              meta.value?.id as string,
              extractPkFromRow(row.row, meta.value?.columns as ColumnType[]),
              (<LinkToAnotherRecordType>column.colOptions)?.type as any,
              column.id as string,
              extractPkFromRow(row.row[column.title!], relatedTableMeta?.columns as ColumnType[]),
            )
            row.row[column.title!] = null
          } else {
            for (const link of (row.row[column.title!] as Record<string, any>[]) || []) {
              await $api.dbTableRow.nestedRemove(
                NOCO,
                meta.value?.base_id ?? (base.value.id as string),
                meta.value?.id as string,
                encodeURIComponent(extractPkFromRow(row.row, meta.value?.columns as ColumnType[])),
                (<LinkToAnotherRecordType>column?.colOptions).type as 'hm' | 'mm',
                column.id as string,
                encodeURIComponent(extractPkFromRow(link, relatedTableMeta?.columns as ColumnType[])),
              )
            }
            row.row[column.title!] = []
          }
        }
      } catch (e: any) {
        message.error(await extractSdkResponseErrorMsg(e))
      }
    }

    const loadRow = async (row: Row) => {
      const record = await $api.dbTableRow.read(
        NOCO,
        meta.value?.base_id ?? (base.value?.id as string),
        meta.value?.title as string,
        encodeURIComponent(extractPkFromRow(row.row, meta.value?.columns as ColumnType[])),
      )
      Object.assign(unref(row), {
        row: record,
        oldRow: { ...record },
        rowMeta: {
          ...row.rowMeta,
          new: false,
        },
      })
    }

    // clear MM cell
    const cleaMMCell = async (row: Row, column: ColumnType) => {
      try {
        if (!column || !isLinksOrLTAR(column)) return

        if (row.rowMeta.new) {
          getRowLtarHelpers(row)[column.title!] = null
        } else {
          if (isMMOrMMLike(column)) {
            if (!row.row[column.title!]) return

            const result = await $api.internal.postOperation(
              meta.value?.fk_workspace_id ?? base.value.fk_workspace_id,
              meta.value?.base_id ?? base.value.id,
              {
                operation: 'nestedDataListCopyPasteOrDeleteAll',
                tableId: meta.value?.id as string,
                columnId: column.id as string,
              },
              [
                {
                  operation: 'deleteAll',
                  rowId: extractPkFromRow(row.row, meta.value?.columns as ColumnType[]) as string,
                  columnId: column.id as string,
                  fk_related_model_id: (column.colOptions as LinkToAnotherRecordType)?.fk_related_model_id as string,
                },
              ],
            )

            row.row[column.title!] = null

            return Array.isArray(result.unlink) ? result.unlink : []
          }
        }
      } catch (e: any) {
        message.error(await extractSdkResponseErrorMsg(e))
      }
    }

    return {
      addLTARRef,
      removeLTARRef,
      addLTARRemoveRef,
      removeLTARRemoveRef,
      syncLTARRefs,
      loadRow,
      clearLTARCell,
      cleaMMCell,
    }
  },
  'smartsheet-ltar-helpers',
)

export { useProvideSmartsheetLtarHelpers }

export function useSmartsheetLtarHelpersOrThrow() {
  const smartsheetLtarHelpers = useSmartsheetLtarHelpers()

  if (smartsheetLtarHelpers == null) throw new Error('Please call `useSmartsheetLtarHelpers` on the appropriate parent component')

  return smartsheetLtarHelpers
}
