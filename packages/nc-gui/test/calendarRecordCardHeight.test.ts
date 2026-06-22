import {
  CALENDAR_CARD_BASE_HEIGHT,
  cardHeightForFieldCount,
  computeRowLayout,
} from '~/components/smartsheet/calendar/calendarRecordCardHeight'

describe('cardHeightForFieldCount', () => {
  it('shows at least one line', () => {
    expect(cardHeightForFieldCount(0)).toBe(28)
    expect(cardHeightForFieldCount(-3)).toBe(28)
    expect(cardHeightForFieldCount(1)).toBe(28)
  })

  it('grows per field', () => {
    expect(cardHeightForFieldCount(2)).toBe(48)
    expect(cardHeightForFieldCount(3)).toBe(68)
  })

  it('caps at the max field count', () => {
    expect(cardHeightForFieldCount(4)).toBe(68)
    expect(cardHeightForFieldCount(20)).toBe(68)
  })
})

describe('computeRowLayout', () => {
  it('reproduces the legacy uniform 28px layout', () => {
    // legacy: top = row*28 + (row+1)*8  →  8, 44, 80
    const { tops } = computeRowLayout([
      { rowIndex: 0, height: CALENDAR_CARD_BASE_HEIGHT },
      { rowIndex: 1, height: CALENDAR_CARD_BASE_HEIGHT },
      { rowIndex: 2, height: CALENDAR_CARD_BASE_HEIGHT },
    ])
    expect(tops[0]).toBe(8)
    expect(tops[1]).toBe(44)
    expect(tops[2]).toBe(80)
  })

  it('uses the tallest card in a row as that row height', () => {
    // two cards share row 0 (e.g. different columns); the taller one wins
    const { heights } = computeRowLayout([
      { rowIndex: 0, height: 28 },
      { rowIndex: 0, height: 68 },
      { rowIndex: 1, height: 48 },
    ])
    expect(heights[0]).toBe(68)
    expect(heights[1]).toBe(48)
  })

  it('keeps multi-day bars aligned: row tops are cumulative of per-row max heights', () => {
    // row 0 max = 68 (a tall single-day card sets the row height),
    // a multi-day bar sits in row 1 and must start below the full 68 + gaps.
    const { tops, heights } = computeRowLayout([
      { rowIndex: 0, height: 28 }, // column A, row 0
      { rowIndex: 0, height: 68 }, // column B, row 0 (taller → sets row height)
      { rowIndex: 1, height: 48 }, // multi-day bar spanning columns, row 1
    ])
    expect(heights[0]).toBe(68)
    expect(tops[0]).toBe(8) // gap before first row
    // row 1 top = gap + row0Height + gap = 8 + 68 + 8 = 84
    expect(tops[1]).toBe(84)
  })

  it('handles gaps in row indices (defaults missing rows to base height)', () => {
    const { tops } = computeRowLayout([{ rowIndex: 2, height: 48 }])
    // rows 0 and 1 absent → default 28 each
    // top0 = 8; top1 = 8+28+8 = 44; top2 = 44+28+8 = 80
    expect(tops[2]).toBe(80)
  })
})
