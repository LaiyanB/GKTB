import { formatNumber } from '../utils/predict'

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
  // 取最新可用年份的排位值（dataYears 已按年份降序排列）
  var latestYear = item.dataYears && item.dataYears.length > 0 ? item.dataYears[0] : null
  var latestRank = latestYear != null ? item.ranks[latestYear] : null
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
        <div><span>{latestYear != null ? latestYear + ' 排位' : '往年排位'}</span><strong>{formatNumber(latestRank)}</strong></div>
        <div><span>预测排位</span><strong>{formatNumber(item.predictedRank)}</strong></div>
      </div>
    </article>
  )
}
