# 异体字转换功能

## 功能概述

异体字转换功能用于处理不遵循标准简繁体转换规则的异体字。这些异体字在传统的繁简转换工具中可能无法正确转换，因此需要单独处理。

## 支持的异体字列表

| 异体字 | 标准简体 | 说明 | 示例 |
|--------|----------|------|------|
| 勐 | 猛 | 猛烈 | 勐烈 → 猛烈 |
| 幺 | 么 | 助词 | 什麽 → 什么 |
| 麽 | 么 | 助词 | 什麽 → 什么 |
| 豔 | 艳 | 艳丽 | 鲜豔 → 鲜艳 |
| 洩 | 泄 | 泄漏 | 洩漏 → 泄漏 |
| 週 | 周 | 周期 | 週末 → 周末 |
| 裡 | 里 | 里面 | 裡面 → 里面 |
| 髮 | 发 | 头发 | 頭髮 → 头发 |
| 乾 | 干 | 干燥 | 乾淨 → 干净 |
| 為 | 为 | 因为 | 因為 → 因为 |
| 擡 | 抬 | 抬起 | 擡起 → 抬起 |

## 使用方法

### 1. 通过 Web 界面

1. 访问 http://localhost:3000
2. 上传或粘贴包含异体字的 Markdown 文档
3. 勾选"繁简转换"选项
4. 点击"执行清理"按钮
5. 异体字将自动转换为标准简体字

### 2. 通过 API

```javascript
const response = await fetch('/api/process-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        text: '你的文本内容',
        options: {
            convertTraditional: true  // 启用繁简转换（包含异体字转换）
        }
    })
});
```

### 3. 通过 Node.js 代码

```javascript
const TextProcessor = require('./utils/textProcessor');

const tp = new TextProcessor();
const result = await tp.processText('你的文本内容', {
    convertTraditional: true  // 启用繁简转换（包含异体字转换）
});
```

## 处理流程

异体字转换在繁简转换之后执行，处理顺序如下：

1. **修复断行**（可选）
2. **格式修复**（标题、列表等）
3. **标点符号规范化**
4. **繁简转换**（使用 OpenCC）
5. **异体字转换**（使用自定义映射表）✨ 新增
6. **引号格式统一**
7. **空格修复**

## 技术实现

### 核心代码

```javascript
/**
 * 转换异体字为标准简体字
 */
convertVariantCharacters(text) {
    const variantMap = {
        '勐': '猛',
        '幺': '么',
        '麽': '么',
        '豔': '艳',
        '洩': '泄',
        '週': '周',
        '裡': '里',
        '髮': '发',
        '乾': '干',
        '為': '为',
        '擡': '抬'
    };

    let result = text;
    for (const [variant, standard] of Object.entries(variantMap)) {
        result = result.split(variant).join(standard);
    }

    return result;
}
```

### 性能优化

- 使用 `split().join()` 代替 `replace()` 以获得更好的性能
- 在繁简转换之后执行，避免重复处理
- 使用共享的 TextProcessor 实例，避免重复初始化

## 测试

运行测试脚本验证异体字转换功能：

```bash
node test-variant-chars.js
```

测试覆盖：
- ✓ 勐 → 猛
- ✓ 幺 → 么
- ✓ 麽 → 么
- ✓ 豔 → 艳
- ✓ 洩 → 泄
- ✓ 週 → 周
- ✓ 裡 → 里
- ✓ 髮 → 发
- ✓ 乾 → 干
- ✓ 為 → 为
- ✓ 擡 → 抬

## 扩展异体字列表

如需添加更多异体字，请编辑 [utils/textProcessor.js](../utils/textProcessor.js) 文件中的 `variantMap` 对象：

```javascript
const variantMap = {
    // 现有映射...
    '新异体字': '标准简体',
    // 添加更多...
};
```

## 注意事项

1. **上下文相关**：某些异体字在不同上下文中可能有不同含义（如"乾"在"乾隆"中不转换为"干"），当前实现不处理这些特殊情况。

2. **性能考虑**：异体字转换会遍历整个文本，对于超大文件可能需要一定时间。

3. **与繁简转换的关系**：异体字转换在繁简转换之后执行，确保先处理标准繁体字，再处理特殊异体字。

4. **不可逆操作**：转换后的文本无法自动还原，建议在转换前备份原始文件。

## 示例

### 转换前

```markdown
# 週末計劃

這個週末，我計劃去圖書館學習。圖書館裡很安靜，適合閱讀。

我會閱讀一些關於歷史的書籍，了解古代的髮型和服飾。

下午，我會和朋友一起去喝咖啡，聊聊最近的生活。

晚上，我會回家整理房間，讓房間變得乾淨整潔。
```

### 转换后

```markdown
# 周末计划

这个周末，我计划去图书馆学习。图书馆里很安静，适合阅读。

我会阅读一些关于历史的书籍，了解古代的发型和服饰。

下午，我会和朋友一起去喝咖啡，聊聊最近的生活。

晚上，我会回家整理房间，让房间变得干净整洁。
```

## 相关文件

- [utils/textProcessor.js](../utils/textProcessor.js) - 核心处理逻辑
- [test-variant-chars.js](../test-variant-chars.js) - 测试脚本
- [src/domain/fixer.js](../src/domain/fixer.js) - 修复功能集成

## 更新日志

- **2025-12-25**: 初始版本，支持 10 个常见异体字转换
- **2025-12-25**: 新增"擡 → 抬"转换规则，现支持 11 个异体字
