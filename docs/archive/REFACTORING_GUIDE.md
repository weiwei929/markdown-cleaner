# MarkDownCleaner 前端重构指南 (安全并行策略)

本文档旨在指导将 `MarkDownCleaner` 项目从单体架构重构为模块化架构。为了确保现有功能的稳定性，我们将采用**“安全并行策略”**，即在不修改现有代码的前提下，构建并验证新系统。

## 1. 重构目标

将庞大的单体文件 `public/js/app.js` (1500+ 行) 拆分为易于维护的 ES Modules。
- **解耦**：将 UI、逻辑、状态管理分离。
- **扩展性**：消除对“补丁文件”的依赖，使功能扩展更规范。
- **零风险**：通过并行开发，确保重构期间现有服务不受任何影响。

## 2. 拟议架构 (ES Modules)

新系统将位于 `public/js/modules/` 目录下，采用以下分层结构：

### 目录结构
```text
public/js/modules/
├── Core/
│   ├── App.js          # 主程序入口，协调各模块
│   └── State.js        # 集中式状态管理 (Observer模式)
├── UI/
│   ├── UIManager.js    # 界面渲染、主题切换、布局管理
│   ├── ModalManager.js # 弹窗管理 (专家版、设置等)
│   └── EditorManager.js# 编辑器与预览逻辑
├── Features/
│   ├── FileHandler.js  # 文件上传、读取、导出
│   ├── ExpertSystem.js # 专家模式逻辑、API调用
│   └── BasicCleaner.js # 基础清理规则逻辑
└── Utils/
    ├── DOM.js          # DOM 操作辅助函数
    └── API.js          # API 请求封装
```

## 3. 实施步骤

### 第一阶段：基础设施搭建 (无风险)
在此阶段，我们只创建新文件，不触碰任何现有代码。

1.  **创建目录**：建立上述 `public/js/modules/` 及其子目录结构。
2.  **创建新入口页面**：
    - 复制 `public/index.html` 为 `public/index-v2.html`。
    - 修改 `index-v2.html` 的脚本引用：
      ```html
      <!-- 移除旧的 app.js 和补丁 -->
      <!-- <script src="js/app.js"></script> -->
      
      <!-- 引入新的模块化入口 -->
      <script type="module" src="js/main.js"></script>
      ```
3.  **创建主脚本**：新建 `public/js/main.js`，用于导入并初始化 `Core/App.js`。

### 第二阶段：逻辑迁移 (并行开发)
在此阶段，我们将逐步把功能从 `app.js` 搬运并重写到新模块中。

1.  **核心迁移**：
    - 将 `MarkdownCleanerApp` 的初始化逻辑迁移到 `Core/App.js`。
    - 建立 `Core/State.js` 接管 `this.state`。
2.  **UI 迁移 (重点)**：
    - 将 `updateUIByMode` 等逻辑迁移到 `UI/UIManager.js`。
    - **彻底解决 UI 补丁问题**：在新架构中原生实现“基础版/专家版”的布局和样式切换，不再需要 `app-ui-patch.js`。
3.  **功能迁移**：
    - 迁移文件处理 (`FileHandler`)。
    - 迁移专家模式 (`ExpertSystem`)。
    - 迁移基础清理 (`BasicCleaner`)。

### 第三阶段：验证与切换
只有在验证完全通过后，才替换旧系统。

1.  **双轨验证**：
    - 同时访问 `http://localhost:3000/` (旧版) 和 `http://localhost:3000/index-v2.html` (新版)。
    - 对比各项功能（上传、修复、导出、UI切换）是否一致。
2.  **正式切换**：
    - 确认 `index-v2.html` 无误后，将其内容覆盖到 `index.html`。
    - 将旧的 `app.js` 重命名为 `app.old.js` 进行归档备份。

## 4. 风险控制

- **始终可回滚**：在正式切换前，任何时候都可以直接删除新文件，回到原点。
- **互不干扰**：新旧代码运行在不同的 HTML 入口中，互不影响。

---
*生成时间: 2025-11-24*
