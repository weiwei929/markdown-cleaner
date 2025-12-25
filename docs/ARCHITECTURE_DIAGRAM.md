# 项目架构图（Mermaid）

> 说明：该图描述当前实现（As-Is）与建议演进（To-Be）两个视角，便于你审阅上线改造范围。

## 1) As-Is（当前代码结构）

```mermaid
flowchart TB
  %% =========================
  %% Clients
  %% =========================
  subgraph Client[Browser / 用户浏览器]
    UI["UI 页面<br/>public/index.html"]
    App["JS App<br/>public/js/main.js → App"]
    Marked["Marked.js 渲染器<br/>/lib/marked"]
    Storage["localStorage<br/>草稿/设置"]
  end

  %% =========================
  %% Server
  %% =========================
  subgraph Server[Node.js / Express]
    Routes["API 路由<br/>server.js"]
    TP["TextProcessor<br/>utils/textProcessor.js"]
    Analyzer["Analyzer<br/>src/domain/analyzer.js"]
    Fixer["Fixer<br/>src/domain/fixer.js"]
    AI["AI Adapter (Gemini)<br/>src/domain/ai.js"]
  end

  %% =========================
  %% External
  %% =========================
  subgraph External[外部依赖]
    Gemini["Gemini API<br/>@google/generative-ai"]
    OpenCC["opencc-js<br/>繁简转换"]
  end

  %% UI flow
  UI --> App
  App --> Marked
  App --> Storage

  %% API flow
  App -->|"POST /api/process-text"| Routes
  App -->|"POST /api/analyze"| Routes
  App -->|"POST /api/plan"| Routes
  App -->|"POST /api/preview-fixes"| Routes
  App -->|"POST /api/apply-fixes"| Routes
  App -->|"POST /api/ai/suggest"| Routes

  Routes --> TP
  Routes --> Analyzer
  Routes --> Fixer
  Routes --> AI

  %% External integrations
  TP --> OpenCC
  AI --> Gemini
```

对应入口与关键模块：[`server.js`](server.js:1)、[`TextProcessor.processText()`](utils/textProcessor.js:32)、[`analyze()`](src/domain/analyzer.js:174)、[`applyFixes()`](src/domain/fixer.js:3)、[`AI.suggest()`](src/domain/ai.js:23)、[`public/js/main.js`](public/js/main.js:1)

---

## 2) To-Be（建议上线后架构：契约统一 + 安全加固）

```mermaid
flowchart TB
  subgraph Client[Browser]
    UI["UI 页面"]
    App["App 模块层<br/>Core/UI/Features"]
    Preview["Preview Renderer<br/>Marked + DOMPurify 或禁用 HTML"]
  end

  subgraph Server[Express API]
    MW["Middlewares<br/>requestId / rate-limit / body-limit / cors"]
    API["API Controllers<br/>/api/*"]
    Domain["Domain Layer"]
    Analyzer2["Analyzer<br/>唯一规则真相"]
    Fixer2["Fixer<br/>按计划应用"]
    Pipeline["Pipeline<br/>Analyze → Plan → Preview → Apply"]
    AI2["AI Provider Adapter<br/>可插拔"]
  end

  subgraph Obs[Observability]
    Logs["结构化日志<br/>含 requestId"]
    Health["GET /api/health"]
  end

  subgraph External[External Services]
    Gemini["Gemini"]
    Other["Future: OpenAI/Claude..."]
  end

  UI --> App
  App --> Preview
  App -->|"JSON API"| MW --> API --> Domain
  Domain --> Analyzer2
  Domain --> Fixer2
  Domain --> Pipeline
  Domain --> AI2
  AI2 --> Gemini
  AI2 -. "optional" .-> Other
  API --> Logs
  MW --> Logs
  API --> Health
```

该 To-Be 的具体落地计划参见：[`docs/PRODUCTION_READINESS_PLAN.md`](docs/PRODUCTION_READINESS_PLAN.md:1)

