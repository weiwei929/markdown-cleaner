# 更新日志 (Changelog)

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
