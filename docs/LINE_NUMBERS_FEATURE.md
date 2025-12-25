# 行号显示和智能定位功能说明

## ✅ 已实现的功能

### 1. 行号显示
- ✅ 在编辑器左侧显示行号
- ✅ 行号与编辑器内容同步滚动
- ✅ 行号自动更新（编辑时）
- ✅ 行号样式美观（灰色背景，右对齐）

### 2. 智能定位
- ✅ 点击问题列表项，自动跳转到对应行
- ✅ 跳转时高亮目标行（黄色背景，持续3秒）
- ✅ 自动滚动到目标行（居中显示）
- ✅ 光标定位到目标行

## 📝 修改的文件

### 1. HTML 结构
**文件**: [public/index.html](public/index.html#L108)

**变更**：
```html
<!-- 之前 -->
<div class="editor-pane active" id="editorPane">
    <textarea id="markdownEditor"></textarea>
</div>

<!-- 之后 -->
<div class="editor-pane active" id="editorPane">
    <div class="editor-wrapper">
        <div class="line-numbers" id="lineNumbers">1</div>
        <textarea id="markdownEditor" spellcheck="false"></textarea>
    </div>
</div>
```

### 2. CSS 样式
**文件**: [public/css/style-new.css](public/css/style-new.css#L598)

**新增样式**：
```css
/* 编辑器包装器 */
.editor-wrapper {
    display: flex;
    position: relative;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    overflow: hidden;
}

/* 行号样式 */
.line-numbers {
    background: #f8f9fa;
    border-right: 1px solid var(--border-color);
    color: #6c757d;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 14px;
    line-height: 1.6;
    padding: 16px 8px;
    text-align: right;
    user-select: none;
    min-width: 40px;
    overflow: hidden;
}

.line-numbers span {
    display: block;
    height: 22.4px;
    line-height: 22.4px;
}

/* 高亮样式 */
.line-numbers .highlighted {
    background: #fff3cd;
    color: #856404;
    font-weight: bold;
}
```

### 3. JavaScript 逻辑

#### EditorManager.js
**文件**: [public/js/modules/UI/EditorManager.js](public/js/modules/UI/EditorManager.js)

**新增方法**：

1. **initLineNumbers()** - 初始化行号
```javascript
initLineNumbers() {
    this.updateLineNumbers();
}
```

2. **updateLineNumbers()** - 更新行号显示
```javascript
updateLineNumbers() {
    const content = this.elements.editor.value;
    const lines = content.split('\n').length;
    
    let lineNumbersHtml = '';
    for (let i = 1; i <= lines; i++) {
        lineNumbersHtml += `<span data-line="${i}">${i}</span>`;
    }
    
    this.elements.lineNumbers.innerHTML = lineNumbersHtml;
}
```

3. **syncScroll()** - 同步行号滚动
```javascript
syncScroll() {
    const scrollTop = this.elements.editor.scrollTop;
    this.elements.lineNumbers.scrollTop = scrollTop;
}
```

4. **highlightLine(lineNumber)** - 高亮指定行
```javascript
highlightLine(lineNumber) {
    // 移除之前的高亮
    const prevHighlighted = this.elements.lineNumbers.querySelector('.highlighted');
    if (prevHighlighted) {
        prevHighlighted.classList.remove('highlighted');
    }

    // 添加新的高亮
    const lineElement = this.elements.lineNumbers.querySelector(`[data-line="${lineNumber}"]`);
    if (lineElement) {
        lineElement.classList.add('highlighted');
        
        // 滚动到该行
        const lineHeight = 22.4;
        const scrollPosition = (lineNumber - 1) * lineHeight - (this.elements.editor.clientHeight / 2);
        this.elements.editor.scrollTop = scrollPosition;
        this.elements.lineNumbers.scrollTop = scrollPosition;

        // 3秒后移除高亮
        setTimeout(() => {
            lineElement.classList.remove('highlighted');
        }, 3000);
    }
}
```

#### Navigation.js
**文件**: [public/js/modules/Features/Navigation.js](public/js/modules/Features/Navigation.js#L15)

**修改方法**：
```javascript
jumpToLine(line) {
    // ... 原有逻辑 ...
    
    // 使用 EditorManager 的高亮功能
    this.app.editorManager.highlightLine(clamp);
}
```

## 🎯 使用方法

### 查看行号
1. 打开编辑器
2. 左侧自动显示行号
3. 行号与内容同步滚动

### 跳转到问题行
1. 点击"🔎 检查与建议"
2. 在问题列表中点击任意问题
3. 编辑器自动跳转到对应行
4. 目标行高亮显示（黄色背景，3秒后消失）

### 手动编辑
- 编辑时行号自动更新
- 行号始终与内容同步

## 🎨 视觉效果

### 行号样式
- **背景色**: #f8f9fa（浅灰色）
- **文字色**: #6c757d（中灰色）
- **字体**: Consolas, Monaco（等宽字体）
- **对齐**: 右对齐
- **宽度**: 40px（最小）

### 高亮样式
- **背景色**: #fff3cd（浅黄色）
- **文字色**: #856404（深棕色）
- **字体**: 加粗
- **持续时间**: 3秒

## 🔧 技术细节

### 行高计算
```javascript
const lineHeight = 22.4; // 14px (font-size) * 1.6 (line-height)
```

### 滚动定位
```javascript
const scrollPosition = (lineNumber - 1) * lineHeight - (editorHeight / 2);
```
这样可以将目标行显示在编辑器中央。

### 性能优化
- 使用 `requestAnimationFrame` 优化滚动（可选）
- 防抖处理输入事件（可选）
- 虚拟滚动（对于超大文件，可选）

## 📊 测试场景

### 测试1：基本行号显示
1. 打开编辑器
2. 输入多行文本
3. ✅ 验证行号正确显示

### 测试2：同步滚动
1. 滚动编辑器
2. ✅ 验证行号同步滚动

### 测试3：问题跳转
1. 上传测试文件
2. 点击"检查与建议"
3. 点击问题列表中的项
4. ✅ 验证编辑器跳转到对应行
5. ✅ 验证目标行高亮显示

### 测试4：编辑更新
1. 在编辑器中添加/删除行
2. ✅ 验证行号自动更新

## 🚀 未来改进

### 可选增强功能
1. **代码折叠** - 点击行号折叠/展开代码块
2. **断点标记** - 在行号上标记断点
3. **行搜索** - 快速跳转到指定行号
4. **差异高亮** - 在对比视图中高亮修改的行
5. **多光标编辑** - 按住 Ctrl 点击多个行号

### 性能优化
1. **虚拟滚动** - 对于超大文件（>10000行）
2. **懒加载** - 只渲染可见区域的行号
3. **Web Worker** - 在后台线程中计算行号

## 📚 相关文档

- [EditorManager.js](public/js/modules/UI/EditorManager.js) - 编辑器管理器
- [Navigation.js](public/js/modules/Features/Navigation.js) - 导航功能
- [ExpertSystem.js](public/js/modules/Features/ExpertSystem.js) - 问题列表渲染
