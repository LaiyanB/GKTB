import ResultCard from './ResultCard'
import { RESULT_CARD_LIMIT, getVisibleItems } from '../utils/resultLimits'

export default function ResultColumn({ title, items, onAdd, onSelectSchool, onFavorite, isFavorited }) {
  const { visibleItems, hiddenCount } = getVisibleItems(items, RESULT_CARD_LIMIT)

  return (
    <section className="result-column">
      <div className="column-title">
        <span className={`badge ${title}`}>{title}</span>
        <strong>{items.length} 个候选</strong>
      </div>
      {items.length === 0 && <p className="empty-text">暂无匹配结果</p>}
      {hiddenCount > 0 && <p className="limit-note">仅显示前 {visibleItems.length} 条，另有 {hiddenCount} 条请用筛选缩小范围。</p>}
      {visibleItems.map((item) => (
        <ResultCard key={item.id} item={item} onAdd={onAdd} onSelectSchool={onSelectSchool} onFavorite={onFavorite} isFavorited={isFavorited} />
      ))}
    </section>
  )
}
