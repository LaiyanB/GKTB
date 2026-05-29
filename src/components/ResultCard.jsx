import { formatNumber, formatPercent, trendLabel } from '../utils/predict'

function SchoolTags({ item }) {
  return (
    <div className="school-tags">
      {item.is985 && <span>985</span>}
      {item.is211 && <span>211</span>}
      {item.isDoubleFirstClass && <span>双一流</span>}
      {item.dataYears?.length > 0 && <span>{item.dataYears.join('/')} 数据</span>}
    </div>
  )
}

export default function ResultCard({ item, onSelectSchool, onFavorite, isFavorited }) {
  var favorited = isFavorited ? isFavorited(item.school) : false
  return (
    <article className="result-card" onClick={function () { onSelectSchool(item.school) }}>
      <div className="result-head">
        <span className={`badge ${item.level}`}>{item.level}</span>
        {onFavorite && (
          <button className={'fav-btn-sm' + (favorited ? ' favorited' : '')} onClick={function (e) { e.stopPropagation(); onFavorite(item) }} title={favorited ? '取消收藏' : '加入自选'}>{favorited ? '★' : '☆'}</button>
        )}
      </div>
      <h3>{item.school}</h3>
      <SchoolTags item={item} />
      <p className="major-line">{item.group} · {item.major}</p>
      <div className="rank-grid">
        <div><span>2024 排位</span><strong>{formatNumber(item.ranks[2024])}</strong></div>
        <div><span>预测排位</span><strong>{formatNumber(item.predictedRank)}</strong></div>
      </div>
      <p className="reason-text">
        {trendLabel(item.rateChange)}；当前排位与预测排位差率 {formatPercent(item.diffRate)}。{item.note}
      </p>
    </article>
  )
}
