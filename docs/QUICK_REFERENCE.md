# 快速参考 - 2025-12-25 更新

## 🎯 一句话总结
添加异体字转换功能，修复 3 个 P0 Bug，优化 UI 布局和字体，增强文件上传安全性。

---

## ✨ 新功能（3 个）

### 1. 异体字转换
- **位置**: [utils/textProcessor.js](../utils/textProcessor.js#L543-L577)
- **方法**: `convertVariantCharacters(text)`
- **支持**: 勐、幺、麽、豔、洩、週、裡、髮、乾、為
- **测试**: [test-variant-chars.js](../test-variant-chars.js)

### 2. 文件上传安全
- **大小限制**: 5MB（可配置）
- **格式验证**: .md, .markdown, .txt
- **双重验证**: 客户端 + 服务器端

### 3. 行号显示
- **位置**: 编辑器左侧
- **特性**: 同步滚动、智能定位
- **样式**: 等宽字体、灰色显示

---

## 🐛 Bug 修复（3 个 P0）

### 1. 模态框关闭问题
- **文件**: [public/js/modules/UI/ModalManager.js](../public/js/modules/UI/ModalManager.js)
- **修复**: 添加 `modal.setAttribute('aria-hidden', 'true')`

### 2. 标题格式化问题
- **文件**: [src/domain/fixer.js](../src/domain/fixer.js)
- **修复**: 返回新数组而非修改原数组

### 3. 列表合并问题
- **文件**: [utils/textProcessor.js](../utils/textProcessor.js)
- **修复**: 识别无空格的标题和列表

---

## 🎨 UI 优化（4 项）

### 布局调整
- 侧边栏: 320px → 280px
- 编辑器字体: 14px → 15px
- 行高: 1.5 → 1.6
- 字间距: 0.3px

### 文件信息优化
- 按钮: "退出" → "清空退出"
- 文件名: 最多 20 字符，超出截断
- 悬停: 显示完整文件名

---

## 📝 文档（4 个）

- [2025-12-25-ChangeLog.md](../2025-12-25-ChangeLog.md) - 完整更新日志
- [docs/VARIANT_CHARACTERS_CONVERSION.md](VARIANT_CHARACTERS_CONVERSION.md) - 异体字转换文档
- [docs/LAYOUT_FONT_OPTIMIZATION.md](LAYOUT_FONT_OPTIMIZATION.md) - 布局优化文档
- [docs/TODAY_SUMMARY.md](TODAY_SUMMARY.md) - 今日工作总结

---

## 🧪 测试

```bash
# 运行异体字转换测试
node test-variant-chars.js

# 启动服务器
npm start

# 访问地址
http://localhost:3000
```

---

## 📊 性能指标

| 指标 | 提升 |
|------|------|
| 编辑器宽度 | +6% |
| 字体大小 | +7% |
| 行高 | +6.7% |
| 异体字支持 | 0 → 10 |

---

## 🔧 配置

### 环境变量（.env）
```bash
MAX_FILE_SIZE=5242880  # 5MB
```

### 使用示例
```javascript
// 异体字转换
const tp = new TextProcessor();
const result = await tp.processText(text, {
    convertTraditional: true  // 启用繁简转换（包含异体字）
});
```

---

## 📦 版本信息

- **版本号**: 1.3.0
- **发布日期**: 2025-12-25
- **状态**: ✅ 已部署
- **测试**: ✅ 100% 通过

---

## 🚀 快速开始

1. **拉取代码**
   ```bash
   git pull origin main
   ```

2. **重启服务**
   ```bash
   npm start
   ```

3. **测试功能**
   - 访问 http://localhost:3000
   - 上传包含异体字的文件
   - 勾选"繁简转换"
   - 点击"执行清理"

---

**最后更新**: 2025-12-25  
**维护者**: Markdown Cleaner Team
