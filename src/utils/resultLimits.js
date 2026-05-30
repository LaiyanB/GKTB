export const RESULT_CARD_LIMIT = 50
export const RESULT_TABLE_LIMIT = 50

export function getVisibleItems(items, limit) {
  const source = Array.isArray(items) ? items : []
  const safeLimit = Math.max(0, Math.floor(Number(limit) || 0))

  return {
    visibleItems: source.slice(0, safeLimit),
    hiddenCount: Math.max(0, source.length - safeLimit),
    totalCount: source.length
  }
}
