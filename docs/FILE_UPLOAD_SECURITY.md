# 文件上传安全增强说明

## 📋 更新内容

### 1. 文件大小限制
- **默认限制**：5MB
- **可配置**：通过环境变量 `MAX_FILE_SIZE` 设置
- **验证位置**：
  - ✅ 客户端验证（文件选择时）
  - ✅ 服务端验证（上传接口中）

### 2. 文件格式限制
- **支持的格式**：`.md`, `.markdown`, `.txt`
- **验证方式**：
  - 文件扩展名检查
  - MIME 类型检查
  - 双重验证确保安全

### 3. 错误提示优化

#### 文件过大错误
```
❌ 错误：文件过大 (6.5 MB)，最大支持 5MB。
💡 建议：请压缩文件或分割成多个小文件。
```

#### 格式不支持错误
```
❌ 错误：不支持的文件格式: .docx
💡 支持：只支持以下格式: .md, .markdown, .txt
```

## 🔧 配置方法

### 环境变量配置

在 `.env` 文件中添加：

```env
# 文件上传大小限制（字节）
# 5MB = 5242880
# 10MB = 10485760
MAX_FILE_SIZE=5242880
```

### 修改限制大小

#### 修改为 10MB：
```env
MAX_FILE_SIZE=10485760
```

#### 修改为 2MB：
```env
MAX_FILE_SIZE=2097152
```

## 🧪 测试方法

### 1. 测试小文件（< 5MB）
```bash
# 创建一个 1MB 的测试文件
node -e "const fs = require('fs'); const content = '# 测试\n' + 'x'.repeat(1024*1024); fs.writeFileSync('test-small.md', content);"
```

**预期结果**：✅ 文件成功上传

### 2. 测试大文件（> 5MB）
```bash
# 创建一个 6MB 的测试文件
node -e "const fs = require('fs'); const content = '# 测试\n' + 'x'.repeat(6*1024*1024); fs.writeFileSync('test-large.md', content);"
```

**预期结果**：❌ 显示错误提示

### 3. 测试不支持的格式
创建一个 `.docx` 或 `.pdf` 文件并尝试上传。

**预期结果**：❌ 显示格式不支持错误

## 📝 代码变更

### 后端变更 ([server.js](server.js))

1. **添加文件大小常量**：
```javascript
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024;
```

2. **更新 multer 配置**：
```javascript
const upload = multer({
    storage: storage,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1 // 每次只允许上传一个文件
    },
    fileFilter: (req, file, cb) => {
        // 文件扩展名和 MIME 类型双重验证
    }
});
```

3. **改进错误处理**：
```javascript
if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
        success: false,
        error: {
            code: 'FILE_TOO_LARGE',
            message: `文件大小不能超过 ${MAX_FILE_SIZE / 1024 / 1024}MB。请压缩文件或分割成多个小文件后重试。`,
            requestId: req.requestId
        }
    });
}
```

### 前端变更 ([FileHandler.js](public/js/modules/Features/FileHandler.js))

1. **添加客户端验证**：
```javascript
handleFileSelect(file) {
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    
    // 检查文件大小
    if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(2);
        this.app.uiManager.showError(
            `文件过大 (${sizeMB}MB)，最大支持 ${MAX_FILE_SIZE / 1024 / 1024}MB。请压缩文件或分割成多个小文件。`
        );
        return;
    }
    
    // 检查文件格式
    const allowedExtensions = ['.md', '.markdown', '.txt'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!allowedExtensions.includes(fileExt)) {
        this.app.uiManager.showError(
            `不支持的文件格式: ${fileExt || '未知格式'}。<br>只支持以下格式: ${allowedExtensions.join(', ')}`
        );
        return;
    }
    
    // 继续处理...
}
```

2. **更新 UI 提示**：
```html
<small>支持 .md, .markdown, .txt 格式（最大 5MB）</small>
```

## 🔒 安全特性

### 多层验证
1. **客户端验证**：快速反馈，提升用户体验
2. **服务端验证**：最终防线，防止绕过

### 错误信息
- ✅ 清晰说明问题
- ✅ 提供解决建议
- ✅ 不泄露敏感信息

### 限流保护
- API 限流防止滥用
- CPU 密集型接口额外限流

## 📊 性能影响

### 内存使用
- 5MB 文件约占用 5MB 内存
- 处理完成后立即释放
- 多个文件不会同时处理（限流保护）

### 磁盘使用
- 使用内存存储，不写入磁盘
- 处理完成后自动清理

## 🎯 最佳实践

1. **生产环境配置**：
   ```env
   NODE_ENV=production
   MAX_FILE_SIZE=5242880
   CORS_ORIGINS=https://your-domain.com
   ```

2. **监控文件大小**：
   - 定期检查上传日志
   - 根据实际需求调整限制

3. **用户教育**：
   - 在 UI 中明确说明限制
   - 提供文件分割工具推荐

## 📚 相关文档

- [环境变量配置](.env.example)
- [测试指南](TESTING_GUIDE.md)
- [API 文档](docs/API.md)
