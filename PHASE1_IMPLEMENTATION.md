# Phase 1 实施指南：核心功能集成

## 已完成 ✅

### 1. Linter.js 增强
- ✅ 添加了 `FIX_PRIORITY` 常量定义
- ✅ 添加了 `getPriorityByCode()` 辅助函数
- ✅ 修改了 `lint()` 方法，返回包含优先级信息的对象
- ✅ 添加了 `groupByPriority()` 方法
- ✅ 导出了 `FIX_PRIORITY` 供全局使用

### 2. 返回数据结构
```javascript
{
    issues: [
        {
            line: 3,
            startCol: 0,
            endCol: 5,
            type: 'error',
            code: 'header-space',
            message: '标题 # 后缺少空格',
            fix: { type: 'replace', text: '# Title' },
            priority: {
                level: 1,
                name: '安全修复',
                icon: '✅',
                color: '#2ecc71',
                autoFix: true,
                description: '不改变文字内容，只调整格式',
                codes: [...],
                key: 'SAFE'
            }
        },
        ...
    ],
    grouped: {
        SAFE: [...],
        SUGGESTED: [...],
        WARNING: [...]
    },
    stats: {
        total: 15,
        safe: 10,
        suggested: 5,
        warning: 0
    }
}
```

## 待实施 ⏳

### 3. App.js 集成（需要手动添加）

由于当前 app.js 版本较旧，需要添加以下功能：

#### 3.1 初始化 Linter
```javascript
constructor() {
    // ... 现有代码
    
    // 初始化 Linter
    this.linter = new MarkdownLinter();
    this.lintResult = null; // 存储检查结果
}
```

#### 3.2 自动检查触发
```javascript
async handleFileSelect(file) {
    // ... 现有的文件读取代码
    
    // 自动触发检查
    setTimeout(() => {
        this.runLinter();
        this.showCheckReport();
    }, 500);
}
```

#### 3.3 runLinter 方法
```javascript
runLinter() {
    if (!this.cm) return;
    
    const content = this.cm.getValue();
    this.lintResult = this.linter.lint(content);
    
    console.log('检查完成:', this.lintResult.stats);
    
    // 显示问题
    this.showIssues(this.lintResult);
    
    // 更新状态
    this.updateStatus(`检查完成，发现 ${this.lintResult.stats.total} 个问题`);
}
```

#### 3.4 showCheckReport 方法（新增）
```javascript
showCheckReport() {
    if (!this.lintResult) return;
    
    const { stats, grouped } = this.lintResult;
    
    // 创建检查报告面板
    const reportHTML = `
        <div class="check-report">
            <h3>📊 文档检查报告</h3>
            <div class="stats">
                <p>总问题：<strong>${stats.total}</strong> 个</p>
            </div>
            <div class="priority-groups">
                <div class="priority-group safe">
                    <div class="group-header">
                        <span>✅ 安全修复 (${stats.safe})</span>
                        ${stats.safe > 0 ? '<button class="btn-batch-fix" data-priority="SAFE">自动修复全部</button>' : ''}
                    </div>
                </div>
                <div class="priority-group suggested">
                    <div class="group-header">
                        <span>⚠️ 建议修复 (${stats.suggested})</span>
                        ${stats.suggested > 0 ? '<button class="btn-batch-fix" data-priority="SUGGESTED">批量修复</button>' : ''}
                    </div>
                </div>
                <div class="priority-group warning">
                    <div class="group-header">
                        <span>❌ 警告修复 (${stats.warning})</span>
                        ${stats.warning > 0 ? '<button class="btn-batch-fix" data-priority="WARNING">逐个修复</button>' : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 显示报告（可以插入到问题面板顶部）
    const issuesPanel = document.getElementById('issuesPanel');
    if (issuesPanel) {
        const reportDiv = document.createElement('div');
        reportDiv.innerHTML = reportHTML;
        issuesPanel.insertBefore(reportDiv.firstElementChild, issuesPanel.firstElementChild);
        
        // 绑定批量修复按钮事件
        document.querySelectorAll('.btn-batch-fix').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const priority = e.target.dataset.priority;
                this.batchFix(priority);
            });
        });
    }
}
```

#### 3.5 batchFix 方法（新增）
```javascript
async batchFix(priorityKey) {
    if (!this.lintResult) return;
    
    const issues = this.lintResult.grouped[priorityKey];
    const priority = FIX_PRIORITY[priorityKey];
    
    if (priority.autoFix) {
        // 安全修复：直接应用
        issues.forEach(issue => this.applyFix(issue));
        this.updateStatus(`已自动修复 ${issues.length} 个问题`);
        
        // 重新检查
        this.runLinter();
    } else {
        // 建议修复：显示确认对话框
        const confirmed = confirm(
            `即将修复 ${issues.length} 个${priority.name}问题。\n\n` +
            `${priority.description}\n\n` +
            `是否继续？`
        );
        
        if (confirmed) {
            issues.forEach(issue => this.applyFix(issue));
            this.updateStatus(`已修复 ${issues.length} 个问题`);
            
            // 重新检查
            this.runLinter();
        }
    }
}
```

#### 3.6 修改 showIssues 方法
```javascript
showIssues(lintResult) {
    const list = this.elements.issuesList;
    const count = this.elements.issueCount;
    const panel = this.elements.issuesPanel;
    
    const { issues, stats } = lintResult;
    
    list.innerHTML = '';
    count.textContent = stats.total;
    
    if (stats.total === 0) {
        list.innerHTML = '<div style="padding: 20px; text-align: center; color: #2ecc71;">🎉 太棒了！未发现明显格式问题。</div>';
    } else {
        // 按优先级分组显示
        ['SAFE', 'SUGGESTED', 'WARNING'].forEach(priorityKey => {
            const priorityIssues = lintResult.grouped[priorityKey];
            if (priorityIssues.length === 0) return;
            
            const priority = FIX_PRIORITY[priorityKey];
            
            // 添加分组标题
            const groupTitle = document.createElement('div');
            groupTitle.className = 'issue-group-title';
            groupTitle.innerHTML = `
                <span style="color: ${priority.color}">${priority.icon} ${priority.name} (${priorityIssues.length})</span>
                <small>${priority.description}</small>
            `;
            list.appendChild(groupTitle);
            
            // 添加问题列表
            priorityIssues.forEach(issue => {
                const item = document.createElement('div');
                item.className = `issue-item ${issue.type}`;
                item.style.borderLeftColor = priority.color;
                
                item.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                        <div class="issue-icon">${priority.icon}</div>
                        <div class="issue-content">
                            <div class="issue-message">${issue.message}</div>
                            <div class="issue-location">第 ${issue.line + 1} 行</div>
                        </div>
                    </div>
                `;
                
                // 添加修复按钮
                if (issue.fix) {
                    const fixBtn = document.createElement('button');
                    fixBtn.className = 'btn-fix-issue';
                    fixBtn.textContent = '修复';
                    fixBtn.onclick = (e) => {
                        e.stopPropagation();
                        this.applyFix(issue);
                    };
                    item.appendChild(fixBtn);
                }
                
                // 点击跳转
                item.addEventListener('click', () => {
                    this.cm.setCursor(issue.line, issue.startCol);
                    this.cm.focus();
                });
                
                list.appendChild(item);
            });
        });
    }
    
    // 显示面板
    panel.style.display = 'flex';
}
```

### 4. CSS 样式（需要添加到 style.css）

```css
/* 检查报告面板 */
.check-report {
    padding: 15px;
    background: #f8f9fa;
    border-radius: 8px;
    margin-bottom: 15px;
}

.check-report h3 {
    margin: 0 0 10px 0;
    font-size: 16px;
}

.check-report .stats {
    margin-bottom: 15px;
}

.priority-groups {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.priority-group {
    padding: 10px;
    border-radius: 6px;
    background: white;
}

.priority-group.safe {
    border-left: 4px solid #2ecc71;
}

.priority-group.suggested {
    border-left: 4px solid #f39c12;
}

.priority-group.warning {
    border-left: 4px solid #e74c3c;
}

.group-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.btn-batch-fix {
    padding: 5px 12px;
    border: none;
    border-radius: 4px;
    background: #3498db;
    color: white;
    cursor: pointer;
    font-size: 12px;
}

.btn-batch-fix:hover {
    background: #2980b9;
}

.issue-group-title {
    padding: 10px;
    background: #f8f9fa;
    border-radius: 6px;
    margin-bottom: 8px;
}

.issue-group-title small {
    display: block;
    color: #7f8c8d;
    margin-top: 4px;
}

.issue-item {
    border-left: 3px solid #ddd;
}
```

## 测试步骤

1. 刷新浏览器页面
2. 上传一个 Markdown 文件
3. 应该自动触发检查并显示报告
4. 点击"自动修复全部"测试安全修复
5. 点击"批量修复"测试建议修复
6. 验证问题是否被正确修复

## 下一步

完成 Phase 1 后，可以继续实施：
- Phase 2: UI 美化和交互优化
- Phase 3: 添加修复预览、历史记录等高级功能
