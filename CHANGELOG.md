# 更新日志 (Changelog)

## [Unreleased]

## [1.2.0] - 2025-12-12 00:42

### ✨ UI/UX 优化

#### 界面布局优化
- **修复选项改为弹出式设置**：修复选项从固定显示改为模态框，平时隐藏，需要时点击"修复选项"按钮打开
- **合并断行默认选中**：修复选项中的"合并断行"现在默认选中，提升用户体验
- **统一按钮样式**：所有操作按钮统一大小和样式，使用不同渐变色区分功能
  - 🔎 检查与建议：蓝色渐变
  - ⚡ 一键修复：绿色渐变
  - 🚀 转入 AI 专家版：紫色渐变
  - 💾 导出文件：橙色渐变
  - 🔧 修复选项：青色渐变
  - 🧠 专家规则：深蓝色渐变
  - 🚀 提交专家处理：深紫色渐变
  - 🔍 查找替换：深灰色渐变
- **移除编辑器工具栏**：移除了编辑器上方的"源码编辑 (支持手动微调)"标题和"重置"按钮，界面更简洁

#### 智能按钮状态管理
- **处理完成后按钮状态优化**：基础版处理完成后，自动禁用"检查与建议"、"一键修复"、"修复选项"按钮，避免误操作
- **突出下一步操作**：处理完成后只保留"转入 AI 专家处理"和"导出文件"可用，引导用户进行下一步操作
- **新文件加载时恢复状态**：加载新文件或清空文件时，自动恢复所有按钮状态

### 🔒 安全加固（已完成）

#### Phase 1：安全加固（P0）
- ✅ **CORS 配置修复**：支持环境变量配置，生产环境限制域名白名单
- ✅ **API 限流**：通用限流 100次/15分钟，CPU 密集型接口 10次/分钟
- ✅ **统一错误响应格式**：统一错误结构，生产环境隐藏详细错误信息
- ✅ **Request ID 中间件**：每个请求生成唯一 UUID，提升可观测性
- ✅ **输入验证和内容长度限制**：验证内容类型，限制最大 5MB

#### Phase 2：稳定性改进（P1）
- ✅ **OpenCC 初始化时序修复**：改为惰性初始化，消除繁简转换失败风险
- ✅ **Fixer.js 性能优化**：使用共享 TextProcessor 实例，提升性能
- ✅ **AI parseResponse 错误处理改进**：解析失败时返回友好错误结构
- ✅ **版本号统一**：从 package.json 动态读取版本号

#### Phase 3：工程化改进（P2）
- ✅ **创建 .env.example 文件**：提供环境变量配置模板
- ✅ **Navigation 未实现功能处理**：添加友好提示信息
- ✅ **前端 linter 退役标记**：明确代码方向，避免维护双套规则

### 📊 稳定性评估

**基础版稳定性：** ⭐⭐⭐⭐ (4/5) - **稳定可靠，可用于生产**

**已验证功能：**
- ✅ 文件上传和处理
- ✅ 检查与建议（后端 Analyzer）
- ✅ 一键修复
- ✅ 实时预览（XSS 防护已实现）
- ✅ 对比视图
- ✅ 导出文件

**关键问题已修复：**
- ✅ OpenCC 初始化时序问题
- ✅ 错误信息泄露
- ✅ XSS 风险
- ✅ 输入验证缺失
- ✅ 性能问题

### 🔧 技术改进

- **代码质量**：错误处理完善，输入验证健全，安全防护到位
- **可观测性**：Request ID、统一错误格式、日志记录
- **性能优化**：共享实例、惰性初始化
- **用户体验**：界面优化、智能按钮状态管理

### 📝 配置变更

**新增环境变量**（参考 `.env.example`）：
```env
NODE_ENV=production
CORS_ORIGINS=https://your-domain.com
PORT=3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
STRICT_RATE_LIMIT_WINDOW_MS=60000
STRICT_RATE_LIMIT_MAX_REQUESTS=10
GEMINI_API_KEY=your_key_here
```

### 🎯 使用建议

- **个人使用**：可以直接使用，无需担心
- **小团队使用**：可以直接使用，建议监控日志
- **生产环境**：可以使用，但需要正确配置环境变量（特别是 `CORS_ORIGINS`）

---

## [Unreleased]

### Added
- **Merge Broken Lines**: Added a new "合并断行" (Merge Broken Lines) checkbox option that intelligently merges broken lines in paragraphs while preserving Markdown block elements (headers, lists, blockquotes, code blocks).
  - Automatically detects and merges lines that belong to the same paragraph
  - Preserves proper spacing between Chinese and English text
  - Maintains Markdown structure integrity
- **Search Functionality**: Integrated CodeMirror search and find/replace addons. Users can now use `Ctrl+F` (or `Cmd+F`) to search within the editor.
- **Quote Fix Button**: Added a dedicated "修复引号错位" (Fix Quote Dislocation) button to the control panel for targeted quote normalization.
- **Toolbar Hints**: Added a visual hint for the search shortcut in the editor toolbar.

### Fixed
- **HTML Structure**: Removed duplicate `<!DOCTYPE html>` declaration in `index.html`.
- **UI/UX**: Improved styles for the issues panel and toolbar actions.

### Changed
- **App Logic**: Refactored `app.js` to support standalone quote fixing and better search integration.

## [1.1.0] - 2025-11-24

### 🏗️ 重构 (Refactor)

#### 前端架构模块化
- **问题描述**: 原有的 `app.js` 单体文件过于庞大（1500+ 行），难以维护和扩展
- **解决方案**: 采用 ES Modules 进行模块化重构
- **模块划分**:
  - `Core`: `App.js` (入口), `State.js` (状态管理)
  - `UI`: `UIManager.js`, `ModalManager.js`, `EditorManager.js`
  - `Features`: `FileHandler.js`, `ExpertSystem.js`, `BasicCleaner.js`, `Settings.js`, `Navigation.js`, `PlanManager.js`
  - `Utils`: `API.js`, `DOM.js`
- **影响范围**: 前端所有功能
- **验证结果**: 功能与旧版完全一致，代码结构更清晰

## [1.0.1] - 2025-11-20

### 🔧 修复 (Fixed)

#### 中文全角双引号功能修复
- **问题描述**: 引号规范化功能未生效，各种引号（英文引号、繁体引号、书名号等）无法转换为中文全角双引号
- **根本原因**: 前端 `public/js/app.js` 中缺少 `normalizeQuotes` 选项，导致后端引号处理功能未被触发
- **解决方案**: 
  - 在 `public/js/app.js` 第 287 行添加 `normalizeQuotes: true` 选项
  - 在第 289 行添加 `fixSpacing: true` 选项（空格修复）
- **Unicode 编码**: 
  - 左引号: `"` (U+201C, 十进制 8220)
  - 右引号: `"` (U+201D, 十进制 8221)
- **影响范围**: 所有文档处理功能
- **测试验证**: ✅ 已通过完整测试，所有引号类型均可正确转换

```

### ✨ 功能验证

支持的引号类型转换：
- ✅ 英文半角引号 `"` → 中文全角双引号 `"` `"`
- ✅ 英文全角引号 `"` `"` → 中文全角双引号 `"` `"`
- ✅ 繁体引号 `「` `」` → 中文全角双引号 `"` `"`
- ✅ 书名号 `『` `』` → 中文全角双引号 `"` `"`
- ✅ 德文引号 `‚` `„` → 中文全角双引号 `"` `"`
- ✅ 法文引号 `«` `»` → 中文全角双引号 `"` `"`

### 🎯 测试结果

```
左引号 " (U+201C, 8220): 6 个
右引号 " (U+201D, 8221): 6 个
半角引号 " (U+0022, 34): 0 个
✅ 成功！所有引号都是中文全角双引号
```

---

## [1.0.0] - 2025-11-20

### 🎉 初始发布

- ✅ Markdown 格式修复
- ✅ 标点符号规范化
- ✅ 繁简转换
- ✅ 文件上传和下载
- ✅ 实时编辑器
- ✅ 对比视图
- ✅ VPS 部署支持（Nginx/Caddy）
