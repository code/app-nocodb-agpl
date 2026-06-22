// Height math for calendar week-view record cards.
//
// Week-view cards can show multiple fields stacked over several lines instead of
// a single truncated line. These pure helpers compute a card's natural height
// from its visible field count and lay out the all-day stacking grid so that
// multi-day bars (which share a row index across the days they span) stay
// aligned across columns even when row heights vary.

/** Height of a single-field card — matches the legacy `h-7` (28px) card. */
export const CALENDAR_CARD_BASE_HEIGHT = 28

/** Extra height added per additional visible field. */
export const CALENDAR_CARD_FIELD_HEIGHT = 20

/** Max fields a card grows to show before clipping (+ click-to-expand). */
export const CALENDAR_CARD_MAX_FIELDS = 3

/** Vertical gap between stacked rows in the all-day week view. */
export const CALENDAR_CARD_ROW_GAP = 8

/**
 * Natural card height for a given number of non-empty visible fields.
 * Always shows at least one line; capped at CALENDAR_CARD_MAX_FIELDS.
 *
 * count=1 → 28px (unchanged from legacy), 2 → 48px, 3+ → 68px.
 */
export function cardHeightForFieldCount(count: number): number {
  const fields = Math.max(1, Math.min(Math.floor(count) || 1, CALENDAR_CARD_MAX_FIELDS))
  return CALENDAR_CARD_BASE_HEIGHT + (fields - 1) * CALENDAR_CARD_FIELD_HEIGHT
}

/**
 * Lay out the all-day stacking grid.
 *
 * Each item carries the shared row index it was assigned (`findFirstSuitableRow`)
 * and its natural height. A row's height is the tallest card in that row across
 * all columns, so a multi-day bar occupying row `r` lines up with every other
 * card in row `r`. Tops are the cumulative sum of the rows above, plus a gap
 * before each row — which reproduces the legacy `row*28 + (row+1)*8` layout
 * exactly when every card is the base height.
 */
export function computeRowLayout(
  items: { rowIndex: number; height: number }[],
  gap: number = CALENDAR_CARD_ROW_GAP,
): { heights: Record<number, number>; tops: Record<number, number> } {
  const heights: Record<number, number> = {}
  let maxRow = -1

  for (const { rowIndex, height } of items) {
    heights[rowIndex] = Math.max(heights[rowIndex] ?? 0, height)
    if (rowIndex > maxRow) maxRow = rowIndex
  }

  const tops: Record<number, number> = {}
  let acc = 0
  for (let r = 0; r <= maxRow; r++) {
    const h = heights[r] ?? CALENDAR_CARD_BASE_HEIGHT
    tops[r] = acc + gap
    acc += h + gap
  }

  return { heights, tops }
}
