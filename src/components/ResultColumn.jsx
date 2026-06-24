import { useState } from 'react'
import ResultCard from './ResultCard'
import { RESULT_CARD_LIMIT, RESULT_CARD_INITIAL_LIMIT, getVisibleItems } from '../utils/resultLimits'
import { ChevronDown, ChevronUp } from 'lucide-react'

export default function ResultColumn({ title, items, onSelectSchool, onFavorite, isFavorited }) {
  const [expanded, setExpanded] = useState(false)
  const limit = expanded ? RESULT_CARD_LIMIT : RESULT_CARD_INITIAL_LIMIT
  const { visibleItems, hiddenCount } = getVisibleItems(items, limit)
  const hasMore = items.length > RESULT_CARD_INITIAL_LIMIT

  return (
    <section className="result-column">
      <div className="column-title">
        <span className={`badge ${title}`}>{title}</span>
        <strong>{items.length} 个候选</strong>
      </div>
      {items.length === 0 && <p className="empty-text">暂无匹配结果</p>}
      {!expanded && hiddenCount > 0 && <p className="limit-note">仅显示前 {visibleItems.length} 条，另有 {hiddenCount} 条未显示</p>}
      {expanded && hiddenCount > 0 && <p className="limit-note">仅显示前 {visibleItems.length} 条，另有 {hiddenCount} 条请用筛选缩小范围。</p>}
      {visibleItems.map((item) => (
        <ResultCard key={item.id} item={item} onSelectSchool={onSelectSchool} onFavorite={onFavorite} isFavorited={isFavorited} />
      ))}
      {hasMore && (
        <button className="expand-btn" onClick={() => setExpanded(!expanded)}>
          {expanded ? <><ChevronUp size={16} /> 收起</> : <><ChevronDown size={16} /> 展开更多（共 {items.length} 条）</>}
        </button>
      )}
    </section>
  )
}
