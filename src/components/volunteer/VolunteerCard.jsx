import { getProbabilityLevel, formatRank } from '../../utils/volunteerAlgorithm';

export function VolunteerCard({ volunteer, index, onRemove, onMoveUp, onMoveDown }) {
  const { level, color, bg } = getProbabilityLevel(volunteer.probability);

  return (
    <div className="volunteer-card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="volunteer-card-header">
        <span className="volunteer-index">{index}</span>
        <span 
          className="volunteer-level-badge"
          style={{ color, background: bg }}
        >
          {level}
        </span>
        <div className="volunteer-actions">
          {onMoveUp && (
            <button className="volunteer-action-btn" onClick={onMoveUp} title="上移">↑</button>
          )}
          {onMoveDown && (
            <button className="volunteer-action-btn" onClick={onMoveDown} title="下移">↓</button>
          )}
          {onRemove && (
            <button className="volunteer-remove-btn" onClick={onRemove} title="删除">×</button>
          )}
        </div>
      </div>

      <h4 className="volunteer-school">{volunteer.school}</h4>
      <p className="volunteer-group">{volunteer.group}</p>

      <div className="volunteer-meta">
        <span className="volunteer-rank">
          位次：{formatRank(volunteer.avgRank)}
        </span>
        <span 
          className="volunteer-prob"
          style={{ color }}
        >
          {volunteer.probability}%
        </span>
      </div>

      <div className="volunteer-majors">
        {volunteer.majors.slice(0, 3).map((m, i) => (
          <span key={i} className="volunteer-major-tag">{m}</span>
        ))}
        {volunteer.majors.length > 3 && (
          <span className="volunteer-major-tag more">+{volunteer.majors.length - 3}</span>
        )}
      </div>
    </div>
  );
}
