# Model Router 路由优化实验报告

**实验日期**: 2026-09-02
**实验框架**: RESEARCH_PAPER_FRAMEWORK.md 第五章实验设计
**数据模式**: 固定随机种子的离线可重复模拟

## 执行摘要

- QCG-Router 平均质量 0.935，质量约束满足率 100.0%，成本节省率 89.3%。
- AMO-Router 平均质量 0.936，质量约束满足率 100.0%，成本节省率 89.3%。
- 协作、预算回退和在线权重更新均在独立实验中验证，并保留原始逐任务数据。

## exp1-single-task: 单任务路由性能

执行耗时：303 ms

| Algorithm | Avg Cost (USD) | Avg Quality | QSR | CSR |
|---|---:|---:|---:|---:|
| Random | 0.008845 | 0.929 | 98.3% | 62.9% |
| Cheapest | 0.000241 | 0.835 | 89.2% | 99.0% |
| Best | 0.023849 | 0.991 | 100.0% | 0.0% |
| Rule-based | 0.009931 | 0.895 | 100.0% | 58.4% |
| QCG-Router | 0.002545 | 0.935 | 100.0% | 89.3% |
| AMO-Router | 0.002541 | 0.936 | 100.0% | 89.3% |

### 图表

- Experiment 1: Cost–Quality frontier: [exp1-cost-quality-scatter.png](../charts/exp1-cost-quality-scatter.png)
- Experiment 1: Average cost by algorithm: [exp1-cost-by-algorithm.png](../charts/exp1-cost-by-algorithm.png)
- Experiment 1 performance table: [exp1-performance-table.md](../charts/exp1-performance-table.md)
- Experiment 1: Average latency: [exp1-latency-by-algorithm.png](../charts/exp1-latency-by-algorithm.png)

### 结果解读

该实验按预注册指标输出成本、质量、延迟和约束满足率，结果保存在原始数据文件中。

## exp2-weight-sensitivity: 权重敏感性分析

执行耗时：261 ms

### 图表

- Experiment 2: Pareto frontier by objective weight: [exp2-pareto-front.png](../charts/exp2-pareto-front.png)
- Experiment 2: Weight sensitivity heatmap: [exp2-weight-heatmap.png](../charts/exp2-weight-heatmap.png)
- Experiment 2: Quality response to weight: [exp2-quality-weight-curve.png](../charts/exp2-quality-weight-curve.png)

### 结果解读

该实验按预注册指标输出成本、质量、延迟和约束满足率，结果保存在原始数据文件中。

## exp3-collaboration: 协作模式效果

执行耗时：178 ms

### 图表

- Experiment 3: Collaboration comparison: [exp3-collaboration-comparison.png](../charts/exp3-collaboration-comparison.png)
- Experiment 3: DAG cost-quality points: [exp3-collaboration-scatter.png](../charts/exp3-collaboration-scatter.png)

### 结果解读

协作模式平均质量 0.989，单模型为 0.940；DAG-Assign 将综合节点和关键路径交给高质量模型。

## exp4-online-learning: 在线学习收敛

执行耗时：170 ms

### 图表

- Experiment 4: AMO weight convergence: [exp4-convergence-curve.png](../charts/exp4-convergence-curve.png)
- Experiment 4: Utility over iterations: [exp4-utility-curve.png](../charts/exp4-utility-curve.png)

### 结果解读

AMO-Router 在 1000 次迭代内持续更新五维权重，最终权重保持归一化，呈现稳定收敛趋势。

## exp5-budget-constraint: 预算约束与回退

执行耗时：230 ms

### 图表

- Experiment 5: Quality under budget constraint: [exp5-quality-budget-curve.png](../charts/exp5-quality-budget-curve.png)
- Experiment 5: Budget satisfaction: [exp5-budget-satisfaction.png](../charts/exp5-budget-satisfaction.png)
- Experiment 5: Mean cost by budget: [exp5-cost-by-budget.png](../charts/exp5-cost-by-budget.png)

### 结果解读

预算逐步放宽时，质量和预算满足率同步提升，验证了预算回退策略的单调性。

## exp6-ablation: 消融实验

执行耗时：176 ms

### 图表

- Experiment 6: Component ablation: [exp6-ablation-bar-chart.png](../charts/exp6-ablation-bar-chart.png)
- Experiment 6: Ablation cost impact: [exp6-ablation-cost.png](../charts/exp6-ablation-cost.png)

### 结果解读

移除质量约束、专长匹配或学习模块后，质量或成本指标出现可观退化，说明各组件具有独立贡献。

## 结论

实验结果支持论文提出的质量约束、成本优化和协作分配假设。所有输出均为结构化 JSON、PNG 图表和 Markdown 表格，可直接作为论文结果章节的底稿；真实 API 评测时应替换模拟执行器并保留相同指标接口。

## 附录：复现配置

```json
{
  "seed": 20260902,
  "models": [
    {
      "id": "gpt-5.6-sol",
      "liveBenchScore": 0.98,
      "pricing": {
        "input": 5,
        "output": 30
      },
      "avgLatency": 0.4,
      "specialties": [
        "reasoning",
        "code",
        "math",
        "vision"
      ],
      "risk": 0.06
    },
    {
      "id": "claude-opus-4-8",
      "liveBenchScore": 0.97,
      "pricing": {
        "input": 5,
        "output": 25
      },
      "avgLatency": 0.39,
      "specialties": [
        "reasoning",
        "writing",
        "code"
      ],
      "risk": 0.07
    },
    {
      "id": "deepseek-v4-pro",
      "liveBenchScore": 0.93,
      "pricing": {
        "input": 1.74,
        "output": 3.48
      },
      "avgLatency": 0.52,
      "specialties": [
        "code",
        "math",
        "reasoning"
      ],
      "risk": 0.1
    },
    {
      "id": "qwen3.7-plus",
      "liveBenchScore": 0.87,
      "pricing": {
        "input": 0.4,
        "output": 1.6
      },
      "avgLatency": 0.72,
      "specialties": [
        "code",
        "math",
        "writing"
      ],
      "risk": 0.12
    },
    {
      "id": "deepseek-v4-flash",
      "liveBenchScore": 0.82,
      "pricing": {
        "input": 0.14,
        "output": 0.28
      },
      "avgLatency": 0.82,
      "specialties": [
        "code",
        "summarization",
        "classification"
      ],
      "risk": 0.14
    },
    {
      "id": "gemini-3-flash",
      "liveBenchScore": 0.88,
      "pricing": {
        "input": 0.5,
        "output": 3
      },
      "avgLatency": 0.73,
      "specialties": [
        "vision",
        "research",
        "summarization"
      ],
      "risk": 0.12
    }
  ],
  "qualityFloors": {
    "simple": 0.75,
    "balanced": 0.78,
    "complex": 0.82
  },
  "experiments": {
    "taskCount": 120,
    "weightGridSize": 5,
    "complexTaskCount": 30,
    "iterations": 1000,
    "budgets": [
      0.001,
      0.005,
      0.01,
      0.02,
      0.05
    ]
  }
}
```
