export function VolunteerReport({ analysis, volunteers, onExport }) {
  const { score, issues, warnings, suggestions, stats } = analysis;

  const getScoreColor = (s) => {
    if (s >= 80) return '#2d7a3e';
    if (s >= 60) return '#b8860b';
    return '#8b2c1f';
  };

  const handleCopy = () => {
    const text = volunteers.map((v, i) => 
      `${i + 1}. ${v.school} - ${v.group}（录取概率：${v.probability}%）`
    ).join('\n');
    
    navigator.clipboard.writeText(text).then(() => {
      alert('志愿表已复制到剪贴板！');
    });
  };

  return (
    <div className="volunteer-report-card">
      <div className="volunteer-report-header">
        <h3>志愿方案分析</h3>
        <div 
          className="volunteer-score-circle"
          style={{ borderColor: getScoreColor(score), color: getScoreColor(score) }}
        >
          <span className="score-number">{score}</span>
          <span className="score-label">分</span>
        </div>
      </div>

      <div className="volunteer-stats">
        <div className="stat-item rush">
          <span className="stat-count">{stats.rushCount}</span>
          <span className="stat-label">冲刺</span>
        </div>
        <div className="stat-item stable">
          <span className="stat-count">{stats.stableCount}</span>
          <span className="stat-label">稳妥</span>
        </div>
        <div className="stat-item safe">
          <span className="stat-count">{stats.safeCount}</span>
          <span className="stat-label">保底</span>
        </div>
        <div className="stat-item total">
          <span className="stat-count">{stats.total}</span>
          <span className="stat-label">总计</span>
        </div>
      </div>

      {issues.length > 0 && (
        <div className="volunteer-issues">
          <h4>⚠️ 问题</h4>
          <ul>
            {issues.map((issue, i) => (
              <li key={i} className="issue">{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="volunteer-warnings">
          <h4>⚡ 注意</h4>
          <ul>
            {warnings.map((warn, i) => (
              <li key={i} className="warning">{warn}</li>
            ))}
          </ul>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="volunteer-suggestions">
          <h4>💡 建议</h4>
          <ul>
            {suggestions.map((s, i) => (
              <li key={i} className="suggestion">{s}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="volunteer-export-btns">
        <button className="export-btn primary" onClick={handleCopy}>
          📋 复制志愿表
        </button>
        <button className="export-btn" onClick={onExport}>
          📤 导出文本
        </button>
      </div>
    </div>
  );
}
