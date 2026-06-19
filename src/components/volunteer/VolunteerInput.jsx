import { useState } from 'react';
import { estimateRank } from '../../utils/volunteerAlgorithm';

export function VolunteerInput({ onGenerate, initialRank = 50000, initialSubject = 'physics' }) {
  const [score, setScore] = useState('');
  const [rank, setRank] = useState(initialRank);
  const [subject, setSubject] = useState(initialSubject);
  const [rushCount, setRushCount] = useState(15);
  const [stableCount, setStableCount] = useState(15);
  const [safeCount, setSafeCount] = useState(15);

  const handleScoreChange = (e) => {
    const val = e.target.value;
    setScore(val);
    if (val && parseInt(val) > 0) {
      const estimated = estimateRank(parseInt(val), subject);
      setRank(estimated);
    }
  };

  const handleGenerate = () => {
    if (!rank || rank <= 0) {
      alert('请输入有效的位次或分数');
      return;
    }
    onGenerate({
      rank: parseInt(rank),
      subject,
      rushCount,
      stableCount,
      safeCount
    });
  };

  return (
    <div className="volunteer-input-card">
      <h3>志愿填报设置</h3>
      
      <div className="volunteer-input-row">
        <div className="volunteer-input-group">
          <label>高考分数</label>
          <input
            type="number"
            value={score}
            onChange={handleScoreChange}
            placeholder="输入分数自动换算位次"
            className="volunteer-input"
          />
        </div>

        <div className="volunteer-input-group">
          <label>位次（省排名）</label>
          <input
            type="number"
            value={rank}
            onChange={(e) => setRank(e.target.value)}
            className="volunteer-input"
          />
        </div>
      </div>

      <div className="volunteer-input-row">
        <div className="volunteer-input-group">
          <label>科类</label>
          <div className="volunteer-subject-tabs">
            <button
              className={subject === 'physics' ? 'active' : ''}
              onClick={() => setSubject('physics')}
            >
              物理类
            </button>
            <button
              className={subject === 'history' ? 'active' : ''}
              onClick={() => setSubject('history')}
            >
              历史类
            </button>
          </div>
        </div>
      </div>

      <div className="volunteer-sliders">
        <div className="volunteer-slider-row">
          <label>冲刺志愿：{rushCount} 个</label>
          <input
            type="range"
            min="5"
            max="25"
            value={rushCount}
            onChange={(e) => setRushCount(parseInt(e.target.value))}
          />
        </div>
        <div className="volunteer-slider-row">
          <label>稳妥志愿：{stableCount} 个</label>
          <input
            type="range"
            min="5"
            max="25"
            value={stableCount}
            onChange={(e) => setStableCount(parseInt(e.target.value))}
          />
        </div>
        <div className="volunteer-slider-row">
          <label>保底志愿：{safeCount} 个</label>
          <input
            type="range"
            min="5"
            max="25"
            value={safeCount}
            onChange={(e) => setSafeCount(parseInt(e.target.value))}
          />
        </div>
      </div>

      <div className="volunteer-total-hint">
        总计：{rushCount + stableCount + safeCount} 个志愿
        {rushCount + stableCount + safeCount !== 45 && (
          <span className="volunteer-hint-warn">（建议 45 个）</span>
        )}
      </div>

      <button className="volunteer-generate-btn" onClick={handleGenerate}>
        🎯 生成志愿方案
      </button>
    </div>
  );
}
