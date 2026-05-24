import assert from 'node:assert/strict'
import {
  RESULT_CARD_LIMIT,
  RESULT_TABLE_LIMIT,
  getVisibleItems
} from '../src/utils/resultLimits.js'

const items = Array.from({ length: 100 }, (_, index) => ({ id: index + 1 }))

const cardResult = getVisibleItems(items, RESULT_CARD_LIMIT)
assert.equal(cardResult.visibleItems.length, 20)
assert.equal(cardResult.hiddenCount, 80)
assert.equal(cardResult.totalCount, 100)

const tableResult = getVisibleItems(items, RESULT_TABLE_LIMIT)
assert.equal(tableResult.visibleItems.length, 100)
assert.equal(tableResult.hiddenCount, 0)
assert.equal(tableResult.totalCount, 100)

console.log('display limits ok')
