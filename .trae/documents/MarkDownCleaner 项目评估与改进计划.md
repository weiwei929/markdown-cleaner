# 技术指引（建议文件路径：docs/TECHNICAL_GUIDE.md）

## 概述与目标
- 将现有“导入后直接修复”的流程升级为“导入→自动检查→结果与建议→按优先级修复→导出”的可控管线。
- 原则：模块化、可测试、可扩展、默认安全；优先增量演进，不另起新项目；为 AI 辅助预留标准接口并实现无缝接入。

## 当前架构与评估
- 后端入口与路由：
  - 上传处理：d:\Projects\MarkDownCleaner\server.js:49-106
  - 文本处理：d:\Projects\MarkDownCleaner\server.js:111-145
  - 引号修复：d:\Projects\MarkDownCleaner\server.js:150-182
  - 应用信息/健康检查：d:\Projects\MarkDownCleaner\server.js:187-205, 210-217
- 文本处理核心：
  - 主流程：d:\Projects\MarkDownCleaner\utils\textProcessor.js:32-71
  - 断行合并（累加器）：d:\Projects\MarkDownCleaner\utils\textProcessor.js:137-176
  - 格式修复（标题/列表/代码块）：d:\Projects\MarkDownCleaner\utils\textProcessor.js:184-207, 212-233, 238-253, 258-269
  - 引号统一与替换：d:\Projects\MarkDownCleaner\utils\textProcessor.js:274-312, 335-349
  - 空格修复：d:\Projects\MarkDownCleaner\utils\textProcessor.js:354-369
  - 繁简转换（OpenCC）：d:\Projects\MarkDownCleaner\utils\textProcessor.js:376-388
- 前端应用与预览：
  - 一键处理与对比：d:\Projects\MarkDownCleaner\public\js\app.js:272-335, 410-413
  - 预览中文引号保护（临时标记）：d:\Projects\MarkDownCleaner\public\js\app.js:360-387
  - marked 配置：d:\Projects\MarkDownCleaner\public\js\app.js:171-182
- 前端 Linter 与优先级：
  - 规则集合与优先级：d:\Projects\MarkDownCleaner\public\js\linter.js:9-37, 51-60
  - 断行检查（多行规则）：d:\Projects\MarkDownCleaner\public\js\linter.js:270-320
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
- 表现层（Front-End）：交互、预览、问题展示与分组、修复选择、对比与导出。
- API 层（Express）：分析/计划/应用端点，参数校验与错误映射；与 AI 适配层通信。
- 领域层（Domain）：
  - Analyzer：规则引擎，产出标准化 Issue 列表（code、priority、message、location、fixHint）。
  - Fixer：基于 Issue 与策略应用修复，返回新文本与变更报告。
  - Pipeline Orchestrator：编排“分析→计划→应用”，确保顺序、幂等与可回滚。
  - Rules Registry：规则与优先级元数据注册，统一 SAFE/SUGGESTED/WARNING。
  - Converters/Formatters：繁简转换、格式修复、间距与引号等。
- 共享模块：日志、配置、统计、错误码、报告生成。

## 数据契约（核心模型）
- Issue：`code, priority, message, location:{line,startCol,endCol}, fix:{type,text|params}, previewDiff`。
- FixPlan：`selectedPriorities, includedIssues, exclusions`。
- ApplyResult：`text, report:{modifiedLines, charactersDiff, stats}, appliedIssues, skippedIssues`。

## 后端 API 设计（新增/调整）
- `POST /api/analyze`：输入文本 → 返回分组的 Issue 列表与统计。
- `POST /api/plan`：输入文本与优先级/选择 → 返回将应用的计划（干跑）。
- `POST /api/apply-fixes`：输入文本与计划 → 返回应用后的文本与报告。
- `POST /api/ai-assist`：对高风险/不确定项调用 AI，返回建议与风险评级、可能影响与替代方案。
- 兼容层：保留 `/api/process-text` 一段时间，内部转调新管线，降低迁移风险。

## 规则映射与优先级策略
- SAFE（自动修复）：
  - `header-space` → 标题 `#` 后补空格（现有 `fixHeadings`）。
  - 列表规范化（现有 `fixLists`）。
  - 中英文间距（现有 `fixSpacing`）。
- SUGGESTED（默认提示，可选择应用）：
  - 段落断行合并（现有 `mergeBrokenLines`，多行规则）。
  - 引号统一（现有 `normalizeQuotes`）。
- WARNING（仅提示）：
  - 中英文标点混用（`mixed-punc`），需用户确认；默认不自动。

## AI 接入设计
- 能力目标：
  - 对高风险修复提供建议与解释，标注风险评级与潜在影响。
  - 检查错别字、语法/语义不顺、术语不一致、风格统一，比规则更智能。
  - 提供智能修复方案与替代建议，支持“审阅后应用”。
- 架构与适配：
  - Provider 抽象：`OpenAIProvider/ClaudeProvider/LocalLLMProvider`；通过环境变量选择 `AI_VENDOR` 与 `API_KEY`。
  - Prompt 策略：提供上下文片段（问题所在行/段）、规则提示与修复约束；要求结构化返回（建议、理由、风险、替代方案）。
  - 风险控制：AI 修复默认不直接落地；进入“审阅后应用”并支持局部回滚。
  - 版本与模式：`AI_MODE=basic|expert`，basic 不使用 AI 或仅为说明；expert 启用全面 AI 建议与更智能检查。
- 配置：`.env` 中配置（Windows 下使用 `dotenv`），示例键：`AI_VENDOR`、`AI_API_KEY`、`AI_MODEL`、`AI_ENABLE`、`AI_MODE`。

## 技术栈与工具评估
- 后端：保留 Node.js + Express；建议对规则与契约逐步引入 TypeScript，提升维护性与测试质量。
- 文本处理：逐步引入 AST（`unified` + `remark-parse` + `remark-gfm`）用于结构性修复（标题、列表、代码块），降低正则边界风险；非结构问题可保留正则实现先上线。
- 前端：短期维持原生 JS，先上线新管线与面板；如交互复杂度升高，再评估迁移到 React + Vite。
- 安全：预览生产环境启用 DOMPurify 或 `marked` 安全模式；服务端参数校验与速率限制；日志与错误码统一。
- 测试与 CI：Jest（单测/快照）+ Supertest（API）+ GitHub Actions（Node 版本矩阵）。

## 渐进式迁移策略（不新开项目）
- 阶段A：统一 Linter 到后端（复用 `public/js/linter.js` 规则思想，转为后端模块与数据契约）。
- 阶段B：新增 API（`/api/analyze`、`/api/apply-fixes`），前端改为“默认分析+选择应用”。
- 阶段C：将 `utils/textProcessor.js` 拆分为 Analyzer/Fixer/Pipeline，报告增强并与 Issue 对齐。
- 阶段D：OpenCC 初始化在服务启动完成；首个请求就绪；增加就绪标志与健康检查扩展。
- 阶段E：测试与 CI 补齐；预览安全策略按环境开关；错误码与提示规范化。
- 阶段F（可选）：引入 AST 管线，逐步替换结构性规则，降低边界风险。

## 风险与权衡
- 新开项目重构：开发成本高、复用率低、交付时间长，不建议；现有代码可承接目标。
- AST 引入复杂度：建议“先可用、后精进”，在高风险模块逐步替换。
- 前端框架迁移：非必要不动；优先跑通新流程再评估。

## 验收标准
- 用户路径：导入→自动检查→结果与建议→按优先级修复→导出，与旧逻辑并存一段时间以平滑过渡。
- 报告与对比：提供修改行数、字符差异、统计；SAFE 修复零误伤；SUGGESTED 支持回滚。
- 测试与 CI：核心规则与端到端流程覆盖；Actions 全绿；Windows 环境可运行。

## 近期实施清单（交付物）
- 后端新增模块：Analyzer、Fixer、Pipeline（TS/JS 均可，优先 TS）。
- 新端点：`/api/analyze`、`/api/apply-fixes`、`/api/ai-assist`；前端“分析结果面板”与“按优先级修复”按钮。
- OpenCC 就绪控制、预览安全开关；Jest + Actions 基础流水线；`.env` 管理端口与 AI Key。

## 文件命名与路径建议
- 新增文档：`docs/TECHNICAL_GUIDE.md`（本指引）。
- 后端模块建议：
  - `src/domain/analyzer.js`（或 `.ts`）
  - `src/domain/fixer.js`
  - `src/domain/pipeline.js`
  - `src/domain/rules/index.js`
  - `src/services/ai/provider.js`
  - `src/services/ai/adapters/*.js`
- 配置与环境：`config/default.json`、`.env`（Windows 下使用 `dotenv` 加载）。

## 备注
- 以上为落地执行的技术指引，覆盖现状评估、目标流程、架构分层、API 与数据契约、AI 接入、技术选型与迁移路线、风险与验收标准。确认后据此实施，所有改动将按文件路径与行号标注，并保持中文输出与 Windows 兼容。