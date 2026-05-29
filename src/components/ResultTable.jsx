import { formatNumber } from '../utils/predict'
import { RESULT_TABLE_LIMIT, getVisibleItems } from '../utils/resultLimits'

function Tags({ item }) {
  const tags = []
  if (item.is985) tags.push('985')
  if (item.is211) tags.push('211')
  if (item.isDoubleFirstClass) tags.push('双一流')
  return tags.length ? tags.join(' / ') : '-'
}

export default function ResultTable({ rows, onSelectSchool }) {
  const { visibleItems, hiddenCount } = getVisibleItems(rows, RESULT_TABLE_LIMIT)

  return (
    <section className="table-card">
      <div className="section-heading">
        <h2>院校筛选结果</h2>
        <span>按预测排位排序</span>
      </div>
      {hiddenCount > 0 && <p className="limit-note">仅渲染前 {visibleItems.length} 条，另有 {hiddenCount} 条请继续筛选。</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>院校</th>
              <th>标签</th>
              <th>专业组</th>
              <th>专业</th>
              <th>城市</th>
              <th>年份</th>
              <th>2024</th>
              <th>预测</th>
              <th>分层</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item) => (
              <tr key={item.id} className="clickable-row" onClick={function () { if (onSelectSchool) onSelectSchool(item.school) }}>
                <td>{item.school}</td>
                <td>{Tags({ item })}</td>
                <td>{item.group}</td>
                <td>{item.major}</td>
                <td>{item.city}</td>
                <td>{item.dataYears?.join('/') || '-'}</td>
                <td>{formatNumber(item.ranks[2024])}</td>
                <td>{formatNumber(item.predictedRank)}</td>
                <td><span className={`badge ${item.level}`}>{item.level}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
