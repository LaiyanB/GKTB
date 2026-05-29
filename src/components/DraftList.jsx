export default function DraftList({ draft, onRemove, onSelectSchool, title, removeKey }) {
  var displayTitle = title || '志愿草案'
  return (
    <section className="draft-card">
      <div className="section-heading">
        <h2>{displayTitle}</h2>
        <span>{draft.length} 个已加入</span>
      </div>
      {draft.length === 0 && <p className="empty-text">点击院校旁的 ☆ 加入{displayTitle}。</p>}
      <div className="draft-list">
        {draft.map((item, index) => (
          <div className="draft-item" key={item.school || item.id || index}>
            <span className="draft-index">{index + 1}</span>
            <div>
              <strong className="draft-school-name" onClick={function () { if (onSelectSchool) onSelectSchool(item.school) }}>{item.school}</strong>
              <p>{item.group ? item.group + ' · ' + item.major + ' · ' + item.level : (item.province || '') + (item.city ? ' ' + item.city : '')}</p>
            </div>
            <button onClick={function () { onRemove(item[removeKey || 'id']) }}>移除</button>
          </div>
        ))}
      </div>
    </section>
  )
}
