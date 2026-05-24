# 广东省高考志愿填报指南 · 数据结构

## 标准化后的核心字段

```ts
interface AdmissionRecord {
  year: number
  subject: 'physics' | 'history'

  school: string
  school_code?: string

  major_group: string
  major?: string

  min_score: number
  min_rank: number

  plan_count?: number

  city?: string
  province?: string

  school_type?: '公办' | '民办' | '中外合作'

  tuition?: string

  remarks?: string
}
```

---

## 当前已有数据

### 专业录取线

- data/raw/广东_专业分数线_2021.xlsx
- data/raw/广东_专业分数线_2022.xlsx
- data/raw/2023年广东物理类本科批录取分数线.xlsx
- data/raw/2023年广东历史类本科批录取分数线.xlsx
- data/raw/20250608-广东2024专业录取分数线（本科）.xlsx

### 一分一段表

- data/raw/广东2022年的一分一段表.xlsx
- data/raw/广东2023年的一分一段表.xlsx
- data/raw/广东2024年的一分一段表.xlsx

### 科类人数

#### 物理类

| 年份 | 人数 |
| --- | --- |
| 2021 | 337988 |
| 2022 | 399216 |
| 2023 | 409604 |
| 2024 | 450961 |
| 2025 | 440208 |

#### 历史类

| 年份 | 人数 |
| --- | --- |
| 2021 | 269209 |
| 2022 | 272196 |
| 2023 | 289685 |
| 2024 | 269024 |
| 2025 | 292200 |

---

## 第一阶段目标

统一所有 Excel 字段，输出：

```text
/data/normalized/admissions.json
```

供前端直接读取。

---

## 后续补充字段

- 校区
- 招生人数
- 是否服从调剂
- 专业限制
- 选科要求
- 城市标签
- 热度指数
- 就业方向
