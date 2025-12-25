import { API } from '../Utils/API.js';

export class BasicCleaner {
    constructor(app) {
        this.app = app;
        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.elements = {
            processBtn: document.getElementById('processBtn'),
            optionsBtn: document.getElementById('optionsBtn'),
            fixFormat: document.getElementById('fixFormat'),
            fixPunctuation: document.getElementById('fixPunctuation'),
            convertTraditional: document.getElementById('convertTraditional'),
            mergeBrokenLines: document.getElementById('mergeBrokenLines')
        };
    }

    bindEvents() {
        this.elements.processBtn.addEventListener('click', () => this.processFile());
        // 修复选项按钮
        if (this.elements.optionsBtn) {
            this.elements.optionsBtn.addEventListener('click', () => {
                this.app.modalManager.openModal('options');
            });
        }
        // 保存修复选项
        const saveOptionsBtn = document.getElementById('saveOptions');
        if (saveOptionsBtn) {
            saveOptionsBtn.addEventListener('click', () => {
                this.app.modalManager.closeModal('options');
            });
        }
        // 注意：analyzeBtn 由 ExpertSystem 统一处理，基础版和专家版都可用
    }

    async processFile() {
        const content = this.app.editorManager.getValue();
        if (!content.trim()) {
            this.app.uiManager.showError('请先输入或导入内容');
            return;
        }

        try {
            this.app.uiManager.updateStatus('正在处理文件...');
            
            const options = {
                fixFormat: this.elements.fixFormat.checked,
                fixPunctuation: this.elements.fixPunctuation.checked,
                normalizeQuotes: true,
                convertTraditional: this.elements.convertTraditional.checked,
                mergeBrokenLines: this.elements.mergeBrokenLines.checked,
                fixSpacing: true
            };

            const result = await API.processText(content, options);

            // Update state
            this.app.state.set('processedContent', result.processedContent);
            this.app.editorManager.setValue(result.processedContent);
            
            // Show compare
            this.app.editorManager.setCompareContent(content, result.processedContent);
            
            // 显示转入专家版按钮
            this.showTransferToExpertButton();

            // 显示详细的处理结果
            this.showProcessingResults(result);

        } catch (error) {
            this.app.uiManager.showError('处理失败: ' + error.message);
        }
    }

    /**
     * 显示转入专家版按钮，并禁用其他操作按钮
     */
    showTransferToExpertButton() {
        const btn = document.getElementById('transferToExpertBtn');
        if (btn) {
            btn.style.display = 'block';
            btn.disabled = false;

            // 移除之前的事件监听器（如果存在）
            btn.removeEventListener('click', this.transferToExpertHandler);

            // 添加新的事件监听器
            this.transferToExpertHandler = () => this.transferToExpert();
            btn.addEventListener('click', this.transferToExpertHandler);
        }

        // 处理完成后，禁用其他操作按钮，只保留"转入 AI 专家处理"和"导出文件"可用
        // 禁用：检查与建议、一键修复、修复选项
        if (this.app.uiManager.elements.analyzeBtn) {
            this.app.uiManager.elements.analyzeBtn.disabled = true;
        }
        if (this.app.uiManager.elements.processBtn) {
            this.app.uiManager.elements.processBtn.disabled = true;
        }
        const optionsBtn = document.getElementById('optionsBtn');
        if (optionsBtn) {
            optionsBtn.disabled = true;
        }
        // 保留导出文件可用（用户可能需要导出处理后的内容）
        // 导出按钮已经在 updateControlState 中根据内容自动启用，这里不需要额外处理
    }

    /**
     * 转入专家版处理
     */
    transferToExpert() {
        try {
            // 获取当前处理后的内容
            const processedContent = this.app.state.get('processedContent');
            const originalContent = this.app.state.get('originalContent');

            if (!processedContent) {
                this.app.uiManager.showError('没有找到处理后的内容');
                return;
            }

            // 保存到专家版草稿
            const expertDraft = {
                content: processedContent,
                originalContent: originalContent,
                fromBasicMode: true,
                timestamp: new Date().toISOString(),
                basicFixesApplied: ['format', 'punctuation', 'quotes', 'spacing', 'traditional']
            };

            localStorage.setItem('mdCleanerDraft_expert', JSON.stringify(expertDraft));

            // 显示确认提示
            const confirmed = confirm(
                '🚀 转入 AI 专家版\n\n' +
                '专家版将对基础版处理后的内容进行更高级的智能优化，包括：\n' +
                '• 错别字自动纠错\n' +
                '• 语法和风格建议\n' +
                '• 重复词/标点检测\n' +
                '• 术语统一\n' +
                '• 人物关系一致性检查\n\n' +
                '确定要继续吗？'
            );

            if (confirmed) {
                // 切换到专家版
                this.app.switchToMode('expert');
                this.app.uiManager.updateStatus('已转入专家版，可进行高级智能优化');
            }

        } catch (error) {
            console.error('转入专家版失败:', error);
            this.app.uiManager.showError('转入专家版失败: ' + error.message);
        }
    }

    /**
     * 显示处理结果详情
     */
    showProcessingResults(result) {
        const report = result.report;
        const changes = report.changes;

        let statusMessage = `处理完成 - 修改了 ${changes.modifiedLines} 行`;

        // 如果有详细变更，显示类型统计
        if (changes.detailedChanges && changes.detailedChanges.length > 0) {
            const changeTypes = {};
            changes.detailedChanges.forEach(change => {
                changeTypes[change.type] = (changeTypes[change.type] || 0) + 1;
            });

            const typeSummary = Object.entries(changeTypes)
                .map(([type, count]) => `${type}:${count}`)
                .join(', ');

            statusMessage += ` (${typeSummary})`;
        }

        this.app.uiManager.updateStatus(statusMessage);

        // 在控制台显示详细变更信息
        if (changes.detailedChanges && changes.detailedChanges.length > 0) {
            console.log('📋 详细修改记录 (前5个):');
            changes.detailedChanges.slice(0, 5).forEach(change => {
                console.log(`第${change.lineNumber}行 [${change.type}]:`);
                console.log(`  原始: "${change.original}"`);
                console.log(`  修改: "${change.processed}"`);
            });

            if (changes.detailedChanges.length > 5) {
                console.log(`... 还有 ${changes.detailedChanges.length - 5} 个变更`);
            }
        }
    }
}
