# 技术指引

## 概述与目标
- 将现有“导入后直接修复”的流程升级为“导入→自动检查→结果与建议→按优先级修复→导出”的可控管线。
- 原则：模块化、可测试、可扩展、默认安全；增量演进，不另起新项目；为 AI 辅助预留标准接口并实现无缝接入。

## 当前架构与评估
- 后端入口与路由：
  - 上传处理：d:\Projects\MarkDownCleaner\server.js:49-106
  - 文本处理：d:\Projects\MarkDownCleaner\server.js:111-145
  - 引号修复：d:\Projects\MarkDownCleaner\server.js:150-182
  - 应用信息/健康检查：d:\Projects\MarkDownCleaner\server.js:187-205, 210-217
- 文本处理核心：
  - 主流程：d:\Projects\MarkDownCleaner\utils\textProcessor.js:32-71
  - 断行合并：d:\Projects\MarkDownCleaner\utils\textProcessor.js:137-176
  - 格式修复：d:\Projects\MarkDownCleaner\utils\textProcessor.js:184-207, 212-233, 238-253, 258-269
  - 引号统一与替换：d:\Projects\MarkDownCleaner\utils\textProcessor.js:274-312, 335-349
  - 空格修复：d:\Projects\MarkDownCleaner\utils\textProcessor.js:354-369
  - 繁简转换：d:\Projects\MarkDownCleaner\utils\textProcessor.js:376-388
- 前端应用与预览：
  - 一键处理与对比：d:\Projects\MarkDownCleaner\public\js\app.js:272-335, 410-413
  - 预览中文引号保护：d:\Projects\MarkDownCleaner\public\js\app.js:360-387
  - marked 配置：d:\Projects\MarkDownCleaner\public\js\app.js:171-182
- 前端 Linter 与优先级：
  - 规则集合与优先级：d:\Projects\MarkDownCleaner\public\js\linter.js:9-37, 51-60
  - 断行检查：d:\Projects\MarkDownCleaner\public\js\linter.js:270-320
- 依赖与运行：
  - 依赖与脚本：d:\Projects\MarkDownCleaner\package.json:6-9, 21-30
  - PM2/Caddy 部署文件存在；`.env` 未使用但已忽略。
- 主要问题与风险：预览引号一致性、OpenCC 初始化时机、自动化测试不足、安全预览在生产需收紧、流程与目标不一致。

## 新执行管线（用户视角）
- 导入文档：支持拖拽/选择，展示基本信息。
- 自动检查：调用后端 Analyzer，生成问题清单（位置、问题码、说明、修复建议）。
- 结果与建议：按优先级分组（SAFE/SUGGESTED/WARNING），可查看每条修复预览。
- 按优先级修复：支持“一键应用 SAFE”；SUGGESTED 可选择应用；WARNING 默认仅提示。
- 导出：确认后下载最终 Markdown；提供变更报告与对比视图。

## 分层架构与职责
- 表现层：交互、预览、问题展示与分组、修复选择、对比与导出。
- API 层：分析/计划/应用端点，参数校验与错误映射；与 AI 适配层通信。
- 领域层：
  - Analyzer：规则引擎，产出标准化 Issue 列表（code、priority、message、location、fixHint）。
  - Fixer：基于 Issue 与策略应用修复，返回新文本与变更报告。
  - Pipeline：编排“分析→计划→应用”，确保顺序、幂等与可回滚。
  - Rules Registry：规则与优先级元数据注册，统一 SAFE/SUGGESTED/WARNING。
  - Converters/Formatters：繁简转换、格式修复、间距与引号等。
- 共享模块：日志、配置、统计、错误码、报告生成。

## 数据契约
- Issue：`code, priority, message, location:{line,startCol,endCol}, fix:{type,text|params}, previewDiff`。
- FixPlan：`selectedPriorities, includedIssues, exclusions`。
- ApplyResult：`text, report:{modifiedLines, charactersDiff, stats}, appliedIssues, skippedIssues`。

## 后端 API 设计
- `POST /api/analyze`：输入文本 → 返回分组的 Issue 列表与统计。
- `POST /api/plan`：输入文本与优先级/选择 → 返回将应用的计划（干跑）。
- `POST /api/apply-fixes`：输入文本与计划 → 返回应用后的文本与报告。
- `POST /api/ai-assist`：对高风险/不确定项调用 AI，返回建议与风险评级、可能影响与替代方案。
- 兼容层：保留 `/api/process-text` 一段时间，内部转调新管线，降低迁移风险。

## 规则与优先级策略
- SAFE：标题空格、列表规范化、中英文间距。
- SUGGESTED：段落断行合并、引号统一。
- WARNING：中英文标点混用等高风险改动。

## AI 接入设计
- 能力目标：高风险修复建议、错别字/语法/语义检查、更智能修复方案。
- Provider 抽象：多厂商适配，通过环境变量选择与配置。
- 风险控制：AI 修复默认不直接落地，进入审阅后应用。
- 模式：`AI_MODE=basic|expert`，basic 为规则版，expert 启用 AI 建议与更智能检查。
- 配置：`.env` 中管理密钥与开关。

## 技术栈与工具评估
- 后端：Node.js + Express 保留；规则与契约建议渐进引入 TypeScript。
- 文本处理：逐步引入 AST（unified/remark）用于结构性修复；非结构问题先用正则实现。
- 前端：短期维持原生 JS，先上线新管线与面板；复杂后再评估框架迁移。
- 安全：预览生产启用 DOMPurify 或安全模式；服务端参数校验与速率限制。
- 测试与 CI：Jest + Supertest + GitHub Actions。

## 渐进式迁移策略
- 阶段A：统一 Linter 到后端，形成 Analyzer 与统一数据契约。
- 阶段B：新增 `/api/analyze`、`/api/apply-fixes`，前端改为“分析后选择应用”。
- 阶段C：拆分 `utils/textProcessor.js` 为 Analyzer/Fixer/Pipeline，并增强报告。
- 阶段D：OpenCC 启动就绪控制与健康检查扩展。
- 阶段E：测试与 CI 补齐；预览安全策略按环境开关；错误码与提示规范化。
- 阶段F：引入 AST 管线，逐步替换结构性规则。

## 风险与权衡
- 新开项目重构不建议；现有代码可承接目标。
- AST 引入需分步；前端框架迁移非必要不动。

## 验收标准
- 用户路径：导入→自动检查→结果与建议→按优先级修复→导出。
- 报告与对比：修改行数、字符差异、统计；SAFE 零误伤；SUGGESTED 可回滚。
- 测试与 CI：核心规则与端到端流程覆盖；Windows 环境可运行。

## 近期实施清单
- 新增模块：`src/domain/analyzer.js`、`src/domain/fixer.js`、后续 `src/domain/pipeline.js`。
- 新端点：`/api/analyze`、`/api/apply-fixes`、后续 `/api/ai-assist`。
- OpenCC 就绪控制、预览安全开关；Jest + Actions；`.env` 管理端口与 AI Key。