import { useState, useCallback } from 'react'
import { formatNumber } from '../utils/predict'

function StatsBar({ favorites }) {
  const total = favorites.length
  const chong = favorites.filter(function (f) { return f.level === '冲' }).length
  const wen = favorites.filter(function (f) { return f.level === '稳' }).length
  const bao = favorites.filter(function (f) { return f.level === '保' }).length

  if (total === 0) return null

  return (
    <div className="fav-stats">
      <span className="fav-stat-total">共 <strong>{total}</strong> 所院校</span>
      <span className="fav-stat-item chong">冲 <strong>{chong}</strong></span>
      <span className="fav-stat-item wen">稳 <strong>{wen}</strong></span>
      <span className="fav-stat-item bao">保 <strong>{bao}</strong></span>
    </div>
  )
}

function copyList(favorites) {
  const text = favorites.map(function (f, i) {
    return (i + 1) + '. ' + f.school + (f.major ? ' · ' + f.major : '') + '  ' + (f.city || '')
  }).join('\n')
  navigator.clipboard.writeText(text).then(
    function () { alert('已复制 ' + favorites.length + ' 所院校名单') },
    function () { alert('复制失败，请手动选择') }
  )
}

export default function FavoritesPage({ favorites, onRemove, onReorder, onClear, onSelectSchool, onFavorite, isFavorited, onClose }) {
  const [dragIndex, setDragIndex] = useState(null)

  const handleDragStart = useCallback(function (e, index) {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }, [])

  const handleDragOver = useCallback(function (e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback(function (e, dropIndex) {
    e.preventDefault()
    if (dragIndex === null || dragIndex === dropIndex) return
    onReorder(dragIndex, dropIndex)
    setDragIndex(null)
  }, [dragIndex, onReorder])

  const handleDragEnd = useCallback(function () {
    setDragIndex(null)
  }, [])

  if (!favorites || favorites.length === 0) {
    return (
      <section className="fav-page">
        <div className="fav-header">
          <h2>自选院校志愿清单</h2>
        </div>
        <div className="fav-empty">
          <div className="fav-empty-icon">☆</div>
          <h3>还没有添加院校</h3>
          <p>在推荐结果中点击院校旁的 ☆ 即可加入自选清单</p>
        </div>
      </section>
    )
  }

  return (
    <section className="fav-page">
      <div className="fav-header">
        <h2>自选院校志愿清单</h2>
      </div>

      <StatsBar favorites={favorites} />

      <div className="fav-actions">
        <button className="fav-action-btn" onClick={function () { copyList(favorites) }}>📋 复制名单</button>
        <button className="fav-action-btn danger" onClick={function () {
          if (confirm('确定要清空全部 ' + favorites.length + ' 所自选院校吗？')) { onClear() }
        }}>🗑 全部清空</button>
      </div>

      <div className="fav-grid">
        {favorites.map(function (item, index) {
          var favorited = isFavorited ? isFavorited(item.school) : false
          var latestYear = item.dataYears && item.dataYears.length > 0 ? item.dataYears[0] : null
          var latestRank = latestYear != null ? item.ranks[latestYear] : null

          return (
            <div
              key={item.school}
              className={'fav-card' + (dragIndex === index ? ' dragging' : '')}
              draggable
              onDragStart={function (e) { handleDragStart(e, index) }}
              onDragOver={handleDragOver}
              onDrop={function (e) { handleDrop(e, index) }}
              onDragEnd={handleDragEnd}
            >
              <div className="fav-card-top">
                <span className="fav-card-index">{index + 1}</span>
                <div className="fav-card-badges">
                  <span className={'badge ' + (item.level || '稳')}>{item.level || '?'}</span>
                  {item.is985 && <span className="tag-985">985</span>}
                  {item.is211 && <span className="tag-211">211</span>}
                  {item.isDoubleFirstClass && <span className="tag-df">双一流</span>}
                </div>
                <div className="fav-card-spacer" />
                {onFavorite && (
                  <button
                    className={'fav-btn-sm' + (favorited ? ' favorited' : '')}
                    onClick={function (e) { e.stopPropagation(); onFavorite(item) }}
                    title={favorited ? '取消收藏' : '加入自选'}
                  >{favorited ? '★' : '☆'}</button>
                )}
                <button
                  className="fav-card-remove"
                  onClick={function (e) { e.stopPropagation(); onRemove(item.school) }}
                  title="移出清单"
                >×</button>
              </div>

              <h3
                className="fav-card-school"
                onClick={function () { if (onSelectSchool) onSelectSchool(item.school) }}
              >{item.school}</h3>

              <p className="fav-card-major">{item.group} · {item.major}</p>
              <p className="fav-card-city">{item.city}</p>

              <div className="fav-card-ranks">
                <div><span>{latestYear != null ? latestYear : '—'} 排位</span><strong>{formatNumber(latestRank)}</strong></div>
                <div><span>预测</span><strong>{formatNumber(item.predictedRank)}</strong></div>
              </div>

              <div className="fav-card-reorder">
                <button
                  className="reorder-btn"
                  disabled={index === 0}
                  title="上移"
                  onClick={function (e) { e.stopPropagation(); onReorder(index, index - 1) }}
                >▲</button>
                <button
                  className="reorder-btn"
                  disabled={index === favorites.length - 1}
                  title="下移"
                  onClick={function (e) { e.stopPropagation(); onReorder(index, index + 1) }}
                >▼</button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
