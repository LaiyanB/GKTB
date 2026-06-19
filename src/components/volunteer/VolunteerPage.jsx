import { useState, useMemo } from 'react';
import { VolunteerInput } from './VolunteerInput';
import { VolunteerCard } from './VolunteerCard';
import { VolunteerReport } from './VolunteerReport';
import { 
  generateFullVolunteerList, 
  analyzeVolunteerGradient 
} from '../../utils/volunteerAlgorithm';

export function VolunteerPage({ records }) {
  const [volunteers, setVolunteers] = useState([]);
  const [hasGenerated, setHasGenerated] = useState(false);

  const analysis = useMemo(() => {
    return analyzeVolunteerGradient(volunteers);
  }, [volunteers]);

  const handleGenerate = (params) => {
    const { rank, subject, rushCount, stableCount, safeCount } = params;
    const list = generateFullVolunteerList(records, rank, subject, {
      rushCount, stableCount, safeCount
    });
    setVolunteers(list);
    setHasGenerated(true);
  };

  const handleRemove = (index) => {
    const newList = volunteers.filter((_, i) => i !== index);
    setVolunteers(newList);
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newList = [...volunteers];
    [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
    setVolunteers(newList);
  };

  const handleMoveDown = (index) => {
    if (index === volunteers.length - 1) return;
    const newList = [...volunteers];
    [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
    setVolunteers(newList);
  };

  const handleExport = () => {
    const text = [
      '广东高考志愿填报方案',
      '='.repeat(40),
      '',
      ...volunteers.map((v, i) => 
        `${String(i + 1).padStart(2, '0')}. ${v.school}\n    ${v.group}\n    录取概率：${v.probability}% | 位次：${v.avgRank?.toLocaleString()}`
      ),
      '',
      '='.repeat(40),
      `方案评分：${analysis.score}分`,
      `冲刺：${analysis.stats.rushCount} | 稳妥：${analysis.stats.stableCount} | 保底：${analysis.stats.safeCount}`,
    ].join('\n');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '志愿填报方案.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 按类型分组
  const rushVolunteers = volunteers.filter(v => v.probability < 50);
  const stableVolunteers = volunteers.filter(v => v.probability >= 50 && v.probability < 85);
  const safeVolunteers = volunteers.filter(v => v.probability >= 85);

  return (
    <div className="volunteer-page">
      <div className="volunteer-page-header">
        <h2>志愿填报模拟器</h2>
        <p className="volunteer-subtitle">智能生成冲稳保志愿方案，梯度分析一键导出</p>
      </div>

      <VolunteerInput onGenerate={handleGenerate} />

      {hasGenerated && volunteers.length > 0 && (
        <>
          <div className="volunteer-result-layout">
            <div className="volunteer-lists">
              {rushVolunteers.length > 0 && (
                <div className="volunteer-section">
                  <h3 className="section-title rush">
                    冲刺志愿 <span className="section-count">{rushVolunteers.length}</span>
                  </h3>
                  <div className="volunteer-grid">
                    {rushVolunteers.map((v, i) => (
                      <VolunteerCard
                        key={`${v.school}-${v.group}`}
                        volunteer={v}
                        index={volunteers.indexOf(v) + 1}
                        onRemove={() => handleRemove(volunteers.indexOf(v))}
                        onMoveUp={() => handleMoveUp(volunteers.indexOf(v))}
                        onMoveDown={() => handleMoveDown(volunteers.indexOf(v))}
                      />
                    ))}
                  </div>
                </div>
              )}

              {stableVolunteers.length > 0 && (
                <div className="volunteer-section">
                  <h3 className="section-title stable">
                    稳妥志愿 <span className="section-count">{stableVolunteers.length}</span>
                  </h3>
                  <div className="volunteer-grid">
                    {stableVolunteers.map((v, i) => (
                      <VolunteerCard
                        key={`${v.school}-${v.group}`}
                        volunteer={v}
                        index={volunteers.indexOf(v) + 1}
                        onRemove={() => handleRemove(volunteers.indexOf(v))}
                        onMoveUp={() => handleMoveUp(volunteers.indexOf(v))}
                        onMoveDown={() => handleMoveDown(volunteers.indexOf(v))}
                      />
                    ))}
                  </div>
                </div>
              )}

              {safeVolunteers.length > 0 && (
                <div className="volunteer-section">
                  <h3 className="section-title safe">
                    保底志愿 <span className="section-count">{safeVolunteers.length}</span>
                  </h3>
                  <div className="volunteer-grid">
                    {safeVolunteers.map((v, i) => (
                      <VolunteerCard
                        key={`${v.school}-${v.group}`}
                        volunteer={v}
                        index={volunteers.indexOf(v) + 1}
                        onRemove={() => handleRemove(volunteers.indexOf(v))}
                        onMoveUp={() => handleMoveUp(volunteers.indexOf(v))}
                        onMoveDown={() => handleMoveDown(volunteers.indexOf(v))}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="volunteer-sidebar">
              <VolunteerReport 
                analysis={analysis} 
                volunteers={volunteers}
                onExport={handleExport}
              />
            </div>
          </div>
        </>
      )}

      {!hasGenerated && (
        <div className="volunteer-empty">
          <div className="empty-icon">🎯</div>
          <h3>输入你的分数或位次</h3>
          <p>一键生成科学的志愿填报方案</p>
        </div>
      )}
    </div>
  );
}
