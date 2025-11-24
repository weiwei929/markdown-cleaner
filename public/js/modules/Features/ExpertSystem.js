import { API } from '../Utils/API.js';

export class ExpertSystem {
    constructor(app) {
        this.app = app;
        this.initElements();
        this.bindEvents();
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
        this.elements.analyzeBtn.addEventListener('click', () => this.analyzeContent());
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
        // This logic was in renderIssues in app.js
        // For now, I'll just dump the JSON or simple list
        // Ideally I should port the full rendering logic
        
        const container = this.elements.issuesList;
        container.innerHTML = '';

        if (data.issues && data.issues.length > 0) {
            data.issues.forEach(issue => {
                const div = document.createElement('div');
                div.className = 'issue-item';
                div.innerHTML = `
                    <div class="issue-title">${issue.type}</div>
                    <div class="issue-desc">${issue.description}</div>
                `;
                container.appendChild(div);
            });
        } else {
            container.innerHTML = '<div class="issue-item">未发现问题</div>';
        }
    }

    renderExpertSuggestions(data) {
        // Similar to renderIssues but for expert suggestions
        const container = this.elements.issuesList;
        container.innerHTML = '';
        
        // Simplified rendering for now
        const div = document.createElement('div');
        div.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
        container.appendChild(div);
    }
}
