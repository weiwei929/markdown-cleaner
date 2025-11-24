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
            fixFormat: document.getElementById('fixFormat'),
            fixPunctuation: document.getElementById('fixPunctuation'),
            convertTraditional: document.getElementById('convertTraditional'),
            mergeBrokenLines: document.getElementById('mergeBrokenLines')
        };
    }

    bindEvents() {
        this.elements.processBtn.addEventListener('click', () => this.processFile());
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
            
            this.app.uiManager.updateStatus(`处理完成 - 修改了 ${result.report.changes.modifiedLines} 行`);
            
        } catch (error) {
            this.app.uiManager.showError('处理失败: ' + error.message);
        }
    }
}
