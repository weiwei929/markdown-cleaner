import { API } from '../Utils/API.js';

export class ExpertSystem {
    constructor(app) {
        this.app = app;
        this.initElements();
        this.bindEvents();
        this.loadExpertDraft();
    }

    initElements() {
        this.elements = {
            analyzeBtn: document.getElementById('analyzeBtn'),
            expertRulesBtn: document.getElementById('expertRulesBtn'),
            expertRunBtn: document.getElementById('expertRunBtn'),
            saveExpertRulesBtn: document.getElementById('saveExpertRules'),
            expertPrompt: document.getElementById('expertPrompt'),
            issuesList: document.getElementById('issuesList')
        };
    }

    bindEvents() {
        // analyzeBtn 在基础版和专家版都可用，统一由 ExpertSystem 处理
        if (this.elements.analyzeBtn) {
            this.elements.analyzeBtn.addEventListener('click', () => this.analyzeContent());
        }
        this.elements.expertRulesBtn.addEventListener('click', () => this.app.modalManager.openModal('expert'));
        this.elements.expertRunBtn.addEventListener('click', () => this.requestExpertRun());
        
        this.elements.saveExpertRulesBtn.addEventListener('click', () => {
            const prompt = this.elements.expertPrompt.value;
            this.app.state.set('expertRules', { prompt });
            this.app.modalManager.closeModal('expert');
            this.app.uiManager.updateStatus('专家规则已保存');
        });
    }

    async analyzeContent() {
        const content = this.app.editorManager.getValue();
        if (!content.trim()) {
            this.app.uiManager.showError('请先输入或导入内容');
            return;
        }

        try {
            this.app.uiManager.updateStatus('正在检查...');
            const result = await API.analyzeContent(content);
            this.renderIssues(result);
            this.app.modalManager.openModal('issues');
            this.app.uiManager.updateStatus('检查完成');
        } catch (error) {
            this.app.uiManager.showError('分析失败: ' + error.message);
        }
    }

    async requestExpertRun() {
        const content = this.app.editorManager.getValue();
        const rules = this.app.state.get('expertRules') || { prompt: '' };
        
        if (!content.trim()) {
            this.app.uiManager.showError('请先输入或导入内容');
            return;
        }
        if (!rules.prompt || !rules.prompt.trim()) {
            this.app.uiManager.showError('请先在专家规则中填写规则');
            this.app.modalManager.openModal('expert');
            return;
        }

        try {
            this.app.uiManager.updateStatus('正在提交专家处理...');
            const result = await API.getExpertSuggestions(content, rules);
            this.renderExpertSuggestions(result);
            this.app.modalManager.openModal('issues');
            this.app.uiManager.updateStatus('专家建议已生成');
        } catch (error) {
            this.app.uiManager.showError('专家处理失败: ' + error.message);
        }
    }

    renderIssues(data) {
        // 兼容后端 Analyzer 输出：issue.message / issue.code / issue.priority / issue.line
        const container = this.elements.issuesList;
        container.innerHTML = '';

        const issues = (data && Array.isArray(data.issues)) ? data.issues : [];

        if (issues.length > 0) {
            issues.forEach(issue => {
                const div = document.createElement('div');
                div.className = 'issue-item';

                const priorityKey = (issue.priority && issue.priority.key) ? issue.priority.key : 'WARNING';
                const code = issue.code || '';
                const lineNumber = Number.isInteger(issue.line) ? (issue.line + 1) : null;
                const message = issue.message || '未提供问题描述';

                div.innerHTML = `
                    <div class="issue-header">
                        <span class="issue-type">[${this.escapeHtml(priorityKey)}]</span>
                        <span class="issue-desc">${this.escapeHtml(message)}</span>
                    </div>
                    <div class="issue-details">
                        <div class="issue-context">代码：<code>${this.escapeHtml(code)}</code>${lineNumber ? ` · 行：<code>${lineNumber}</code>` : ''}</div>
                        <div class="issue-suggestion">操作：<strong>点击跳转定位</strong></div>
                    </div>
                `;

                if (lineNumber && this.app.navigation && typeof this.app.navigation.jumpToLine === 'function') {
                    div.style.cursor = 'pointer';
                    div.addEventListener('click', () => {
                        this.app.navigation.jumpToLine(lineNumber);
                        this.app.modalManager.closeModal('issues');
                    });
                }

                container.appendChild(div);
            });
        } else {
            container.innerHTML = '<div class="issue-item">未发现问题</div>';
        }
    }

    renderExpertSuggestions(data) {
        const container = this.elements.issuesList;
        container.innerHTML = '';
        
        // Render Summary
        if (data.summary) {
            const summaryDiv = document.createElement('div');
            summaryDiv.className = 'expert-summary';
            summaryDiv.innerHTML = `<strong>🤖 专家分析摘要：</strong><p>${data.summary}</p>`;
            container.appendChild(summaryDiv);
        }

        // Render Issues
        if (data.issues && data.issues.length > 0) {
            const list = document.createElement('div');
            list.className = 'issues-list';
            
            data.issues.forEach(issue => {
                const item = document.createElement('div');
                item.className = `issue-item issue-${issue.severity || 'medium'}`;
                item.innerHTML = `
                    <div class="issue-header">
                        <span class="issue-type">[${issue.type}]</span>
                        <span class="issue-desc">${issue.description}</span>
                    </div>
                    <div class="issue-details">
                        <div class="issue-context">原文：<code>${this.escapeHtml(issue.originalText)}</code></div>
                        <div class="issue-suggestion">建议：<strong>${this.escapeHtml(issue.suggestion)}</strong></div>
                    </div>
                `;
                list.appendChild(item);
            });
            container.appendChild(list);
        } else {
            const empty = document.createElement('div');
            empty.className = 'no-issues';
            empty.textContent = '🎉 专家未发现明显问题';
            container.appendChild(empty);
        }
    }

    /**
     * 加载专家版草稿（包括从基础版转入的内容）
     */
    loadExpertDraft() {
        try {
            const draftData = localStorage.getItem('mdCleanerDraft_expert');
            if (draftData) {
                const draft = JSON.parse(draftData);

                // 设置内容到编辑器
                this.app.editorManager.setValue(draft.content);

                // 如果是从基础版转入的，设置原始内容用于对比
                if (draft.fromBasicMode && draft.originalContent) {
                    this.app.state.set('originalContent', draft.originalContent);
                    this.app.state.set('currentContent', draft.content);
                    this.app.editorManager.setCompareContent(draft.originalContent, draft.content);
                }

                // 显示提示信息
                let message = '已加载专家版草稿';
                if (draft.fromBasicMode) {
                    message += ' (来自基础版处理结果)';
                }
                this.app.uiManager.updateStatus(message);

                // 设置默认专家规则（如果没有设置）
                if (!this.app.state.get('expertRules')?.prompt) {
                    const defaultPrompt = '请纠正错别字，优化语法和表达，避免重复词和标点，统一术语使用。保持 Markdown 格式和段落结构不变。';
                    this.app.state.set('expertRules', { prompt: defaultPrompt });
                    this.elements.expertPrompt.value = defaultPrompt;
                }

                console.log('专家版草稿已加载:', draft);
            }
        } catch (error) {
            console.error('加载专家版草稿失败:', error);
            this.app.uiManager.showError('加载草稿失败: ' + error.message);
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}
