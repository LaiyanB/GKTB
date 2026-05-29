export default function DraftList({ draft, onRemove, onSelectSchool }) {
  return (
    <section className="draft-card">
      <div className="section-heading">
        <h2>志愿草案</h2>
        <span>{draft.length} 个已加入</span>
      </div>
      {draft.length === 0 && <p className="empty-text">从卡片中加入院校，形成第一版可讨论的志愿草案。</p>}
      <div className="draft-list">
        {draft.map((item, index) => (
          <div className="draft-item" key={item.id}>
            <span className="draft-index">{index + 1}</span>
            <div>
              <strong className="draft-school-name" onClick={function () { if (onSelectSchool) onSelectSchool(item.school) }}>{item.school}</strong>
              <p>{item.group} · {item.major} · {item.level}</p>
            </div>
            <button onClick={() => onRemove(item.id)}>移除</button>
          </div>
        ))}
      </div>
    </section>
  )
}
