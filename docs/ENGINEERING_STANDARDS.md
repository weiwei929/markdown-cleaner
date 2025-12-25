# 技术参数与代码规范（上线基线）

> 目的：给“可上线”定义一个可执行的工程基线（配置、限制、错误契约、日志、测试、编码风格）。
> 
> 本文档的规范将用于后续修复实施（但在你批准前不改代码）。

## 1) 运行与环境参数（Runtime Parameters）

### 1.1 Node / NPM 版本
- Node.js：建议 **18 LTS+**（至少 16+，与部署文档一致）
- 说明：当前依赖以 CommonJS 为主（`require`），与 [`scripts.start`](package.json:7) 一致。

### 1.2 环境变量（.env）
| 变量 | 必需 | 默认 | 说明 |
|---|---:|---:|---|
| `PORT` | 否 | 3000 | 服务端口，见 [`PORT`](server.js:15) |
| `NODE_ENV` | 否 | development | 区分安全策略/日志级别（建议引入） |
| `GEMINI_API_KEY` | 否 | - | AI 能力开关，见 [`AI.initialize()`](src/domain/ai.js:9) |
| `CORS_ORIGINS` | 生产建议必需 | - | 允许的 Origin 白名单（建议新增） |
| `RATE_LIMIT_*` | 生产建议必需 | - | API 限流参数（建议新增） |

### 1.3 请求体与文件大小限制
- JSON body：当前限制 10MB：[`express.json({ limit: '10mb' })`](server.js:19)
- 文件上传：当前 10MB：[`limits.fileSize`](server.js:33)

**上线建议基线**（可调，但必须配置化）：
- `process-text` / `analyze` / `apply-fixes`：建议默认 2MB~5MB（避免 CPU/内存被滥用）
- 上传文件：维持 10MB 可接受，但必须配套限流与超时。

---

## 2) API 契约与错误规范（Contract & Errors）

### 2.1 成功响应
统一结构：
```json
{ "success": true, "data": { } }
```
当前后端基本符合该模式（示例）：[`/api/analyze`](server.js:142)

### 2.2 失败响应（强制统一）
建议统一为：
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR|RATE_LIMITED|INTERNAL_ERROR|...",
    "message": "给用户看的短消息",
    "requestId": "xxxxxxxx"
  }
}
```

原因：目前大量直接返回 `error: error.message`（例如 [`/api/process-text`](server.js:133)），线上会造成不可控的报错呈现与安全泄露风险。

---

## 3) 安全基线（Security Baseline）

### 3.1 Markdown 预览安全（前端）
现状：直接 `innerHTML = marked.parse(content)`：[`updatePreview()`](public/js/modules/UI/EditorManager.js:62)

上线基线（必须二选一或同时使用）：
1) **禁用 HTML**（最稳）：marked 配置不允许原始 HTML（实现细节待实施阶段确定）
2) **DOMPurify 净化**：`marked.parse` 输出先净化再写入 DOM

### 3.2 CORS
现状：`cors()` 全开放：[`app.use(cors())`](server.js:18)

上线基线：
- `NODE_ENV=production` 时只允许白名单 Origin（例如来自你的域名）
- 禁止 `*` 搭配凭据

### 3.3 Rate Limit / Abuse Control
上线基线：
- 对 `/api/*` 做 IP 限流（按分钟/按突发）
- 对 CPU 密集端点（如分析/修复）单独更严格

### 3.4 依赖与供应链
- 锁定依赖：使用 [`package-lock.json`](package-lock.json:1)
- 上线前跑 `npm audit`（实施阶段执行）

---

## 4) 可观测性与日志规范（Observability）

### 4.1 Request ID
上线基线：
- 每次请求生成 `requestId`，写入响应与日志
- 错误处理中间件必须包含 `requestId`

### 4.2 日志输出
上线基线：
- 生产环境禁止打印大段用户文本
- AI 调用日志不得包含密钥（当前未直接打印，但需保持约束）：[`AI.initialize()`](src/domain/ai.js:9)

---

## 5) 测试与质量门禁（Testing & Quality Gates）

### 5.1 单元测试范围（最低）
- 文本处理核心：
  - [`mergeBrokenLines()`](utils/textProcessor.js:82)
  - [`normalizePunctuation()`](utils/textProcessor.js:656)
  - [`normalizeQuotes()`](utils/textProcessor.js:314)
- Analyzer 输出契约：[`analyze()`](src/domain/analyzer.js:174)
- Fixer 应用行为：[`applyFixes()`](src/domain/fixer.js:3)

### 5.2 契约测试（API）
- `/api/analyze`、`/api/preview-fixes`、`/api/apply-fixes`
- 成功与失败结构都要测（尤其是统一错误响应）

### 5.3 当前测试的处理原则
现状测试脚本存在不存在的方法调用：[`test/quote-fix-test.js`](test/quote-fix-test.js:1)

上线基线：
- “不能跑的测试”不允许留在主分支（要么修、要么删/隔离）。

---

## 6) 代码规范（Coding Standards）

### 6.1 目录职责
- `server.js`：只做路由装配与中间件，不堆业务逻辑（现状已包含大量逻辑，建议收敛）：[`server.js`](server.js:1)
- `src/domain/*`：领域逻辑（Analyzer/Fixer/Pipeline/AI Provider）
- `utils/*`：纯工具/无副作用优先（`TextProcessor` 目前有状态与外部依赖初始化，需明确）
- `public/js/modules/*`：前端模块化入口（保持 UI 与 API 解耦）：[`App`](public/js/modules/Core/App.js:11)

### 6.2 异步规则
- 禁止“构造函数内启动异步初始化但不等待”的隐式行为（现状存在）：[`TextProcessor.constructor()`](utils/textProcessor.js:6)
- 推荐：显式 `await ready()` 或惰性初始化。

### 6.3 数据契约优先
- Analyzer/Fixer 输出是**后端唯一真相**，前端必须按契约渲染。
- 禁止同时维护两套规则实现（现状：前端 linter + 后端 analyzer）：[`class MarkdownLinter`](public/js/linter.js:51)、[`analyze()`](src/domain/analyzer.js:174)

### 6.4 命名与结构
- JS：
  - 类名 PascalCase
  - 函数/变量 camelCase
  - 常量 UPPER_SNAKE_CASE
- 每个模块只负责一件事（UI、API、Domain 分层）。

### 6.5 安全编码
- 所有写入 `innerHTML` 的点必须经过净化或严格控制来源：[`updatePreview()`](public/js/modules/UI/EditorManager.js:62)
- 禁止把用户输入直接拼接到 HTML 模板而不 escape（AI 建议渲染也要注意）：[`renderExpertSuggestions()`](public/js/modules/Features/ExpertSystem.js:101)

---

## 7) 上线配置建议（Caddy/PM2）

### 7.1 反代
- 反代配置文件：[`Caddyfile`](Caddyfile:1)
- 建议补充：访问日志、限速（如按路径）、上传大小与超时策略（实施阶段细化）。

### 7.2 进程管理
- PM2 配置：[`ecosystem.config.js`](ecosystem.config.js:1)
- 上线基线：
  - `NODE_ENV=production`
  - 启用 log rotate（PM2 插件或外部工具）

