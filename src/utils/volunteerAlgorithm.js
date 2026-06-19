/**
 * 志愿填报推荐算法
 */

// 计算录取概率 (0-100)
export function calculateAdmitProbability(userRank, majorRank) {
  if (!userRank || !majorRank) return 0;
  
  const diff = (majorRank - userRank) / userRank;
  
  if (diff > 0.3) return 98;      // 远超位次，基本稳录
  if (diff > 0.2) return 95;      // 保底
  if (diff > 0.1) return 85;      // 较稳
  if (diff > 0.05) return 75;     // 稳妥
  if (diff > 0) return 60;        // 略稳
  if (diff > -0.03) return 50;    // 五五开
  if (diff > -0.05) return 40;    // 可冲
  if (diff > -0.08) return 30;    // 冲刺
  if (diff > -0.12) return 20;    // 小冲
  return 10;                       // 碰碰运气
}

// 获取概率等级
export function getProbabilityLevel(prob) {
  if (prob >= 90) return { level: '保', color: '#2d7a3e', bg: 'rgba(45, 122, 62, 0.1)' };
  if (prob >= 70) return { level: '稳', color: '#537d96', bg: 'rgba(83, 125, 150, 0.1)' };
  if (prob >= 40) return { level: '可', color: '#b8860b', bg: 'rgba(184, 134, 11, 0.1)' };
  return { level: '冲', color: '#8b2c1f', bg: 'rgba(139, 44, 31, 0.1)' };
}

// 生成志愿推荐
export function generateVolunteerRecommendations(records, userRank, subject = 'physics', options = {}) {
  const { 
    rushCount = 15, 
    stableCount = 15, 
    safeCount = 15,
    preferredRegions = [],
    preferredMajors = []
  } = options;

  // 筛选有效数据
  const validRecords = records.filter(r => 
    r.subject === subject && 
    r.ranks && 
    r.ranks['2024'] && 
    r.ranks['2024'] > 0
  );

  // 计算每个专业组的平均位次
  const majorGroups = {};
  validRecords.forEach(r => {
    const key = `${r.school}-${r.group}`;
    if (!majorGroups[key]) {
      majorGroups[key] = {
        school: r.school,
        group: r.group,
        majors: [],
        ranks: r.ranks,
        avgRank: 0
      };
    }
    majorGroups[key].majors.push(r.major);
  });

  // 计算平均位次
  Object.values(majorGroups).forEach(g => {
    const ranks = validRecords
      .filter(r => r.school === g.school && r.group === g.group)
      .map(r => r.ranks['2024']);
    g.avgRank = Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length);
    g.minRank = Math.min(...ranks);
    g.maxRank = Math.max(...ranks);
    g.probability = calculateAdmitProbability(userRank, g.avgRank);
  });

  const groups = Object.values(majorGroups);

  // 分类：冲、稳、保
  const rush = groups
    .filter(g => g.probability >= 10 && g.probability < 50)
    .sort((a, b) => b.avgRank - a.avgRank)
    .slice(0, rushCount);

  const stable = groups
    .filter(g => g.probability >= 50 && g.probability < 85)
    .sort((a, b) => b.avgRank - a.avgRank)
    .slice(0, stableCount);

  const safe = groups
    .filter(g => g.probability >= 85)
    .sort((a, b) => b.avgRank - a.avgRank)
    .slice(0, safeCount);

  return { rush, stable, safe };
}

// 生成完整志愿表
export function generateFullVolunteerList(records, userRank, subject, options = {}) {
  const { rush, stable, safe } = generateVolunteerRecommendations(records, userRank, subject, options);
  
  const volunteers = [
    ...rush.map((g, i) => ({ ...g, type: 'rush', index: i + 1 })),
    ...stable.map((g, i) => ({ ...g, type: 'stable', index: rush.length + i + 1 })),
    ...safe.map((g, i) => ({ ...g, type: 'safe', index: rush.length + stable.length + i + 1 }))
  ];

  return volunteers;
}

// 志愿梯度检测
export function analyzeVolunteerGradient(volunteers) {
  const issues = [];
  const warnings = [];
  const suggestions = [];

  if (volunteers.length === 0) {
    issues.push('志愿表为空');
    return { issues, warnings, suggestions, score: 0 };
  }

  // 检查数量
  if (volunteers.length < 45) {
    warnings.push(`志愿数量不足，当前 ${volunteers.length} 个，建议填满 45 个`);
  }

  // 计算各档位数量
  const rushCount = volunteers.filter(v => v.probability < 50).length;
  const stableCount = volunteers.filter(v => v.probability >= 50 && v.probability < 85).length;
  const safeCount = volunteers.filter(v => v.probability >= 85).length;

  // 检查梯度
  if (rushCount === 0) {
    issues.push('没有冲刺志愿，可能浪费分数');
  }
  if (safeCount === 0) {
    issues.push('没有保底志愿，存在滑档风险');
  }
  if (rushCount > 30) {
    warnings.push('冲刺志愿过多，风险较大');
  }
  if (safeCount < 5) {
    warnings.push('保底志愿过少，建议增加');
  }

  // 检查位次梯度是否合理
  for (let i = 1; i < volunteers.length; i++) {
    const prev = volunteers[i - 1];
    const curr = volunteers[i];
    if (prev.avgRank && curr.avgRank) {
      const diff = (curr.avgRank - prev.avgRank) / prev.avgRank;
      if (diff < -0.02) {
        warnings.push(`第 ${i} 到 ${i + 1} 志愿位梯度不足，可能无效`);
        break;
      }
    }
  }

  // 整体评分
  let score = 100;
  score -= issues.length * 20;
  score -= warnings.length * 5;
  score = Math.max(0, Math.min(100, score));

  // 建议
  if (rushCount < 10) suggestions.push('可以适当增加冲刺志愿');
  if (safeCount < 10) suggestions.push('建议增加保底志愿数量');
  if (volunteers.length < 45) suggestions.push('尽量填满 45 个志愿，增加录取机会');

  return {
    issues,
    warnings,
    suggestions,
    score,
    stats: { rushCount, stableCount, safeCount, total: volunteers.length }
  };
}

// 分数转位次（简化版，实际应使用一分一段表）
export function estimateRank(score, subject = 'physics', year = 2024) {
  // 简化估算：物理类 600分≈2万位，550分≈7万位，500分≈15万位
  // 历史类 600分≈1500位，550分≈1万位，500分≈4万位
  if (subject === 'physics') {
    if (score >= 680) return Math.round(100 - (score - 680) * 50);
    if (score >= 650) return Math.round(1000 - (score - 650) * 30);
    if (score >= 600) return Math.round(20000 - (score - 600) * 400);
    if (score >= 550) return Math.round(70000 - (score - 550) * 1000);
    if (score >= 500) return Math.round(150000 - (score - 500) * 1600);
    if (score >= 450) return Math.round(250000 - (score - 450) * 2000);
    return Math.round(350000 - (score - 400) * 2500);
  } else {
    if (score >= 650) return Math.round(100 - (score - 650) * 10);
    if (score >= 600) return Math.round(1500 - (score - 600) * 30);
    if (score >= 550) return Math.round(10000 - (score - 550) * 170);
    if (score >= 500) return Math.round(40000 - (score - 500) * 600);
    if (score >= 450) return Math.round(90000 - (score - 450) * 1000);
    return Math.round(150000 - (score - 400) * 1200);
  }
}

// 格式化位次
export function formatRank(rank) {
  if (!rank) return '-';
  if (rank >= 10000) {
    return (rank / 10000).toFixed(1) + '万';
  }
  return rank.toLocaleString();
}
