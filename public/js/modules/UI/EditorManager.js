export class EditorManager {
    constructor(app) {
        this.app = app;
        this.initElements();
        this.bindEvents();
        this.initLineNumbers();
    }

    initElements() {
        this.elements = {
            editor: document.getElementById('markdownEditor'),
            lineNumbers: document.getElementById('lineNumbers'),
            previewContent: document.getElementById('previewContent'),
            originalContent: document.getElementById('originalContent'),
            processedContent: document.getElementById('processedContent'),
            
            // Tabs
            editTab: document.getElementById('editTab'),
            previewTab: document.getElementById('previewTab'),
            compareTab: document.getElementById('compareTab'),
            
            // Panes
            editorPane: document.getElementById('editorPane'),
            previewPane: document.getElementById('previewPane'),
            comparePane: document.getElementById('comparePane')
        };
    }

    bindEvents() {
        this.elements.editTab.addEventListener('click', () => this.switchTab('edit'));
        this.elements.previewTab.addEventListener('click', () => this.switchTab('preview'));
        this.elements.compareTab.addEventListener('click', () => this.switchTab('compare'));
        
        this.elements.editor.addEventListener('input', () => {
            this.app.state.set('currentContent', this.elements.editor.value);
            this.updateLineNumbers();
        });

        // 同步滚动
        this.elements.editor.addEventListener('scroll', () => {
            this.syncScroll();
        });

        // 重置功能已移除，用户可以通过重新加载文件来重置
    }

    /**
     * 初始化行号
     */
    initLineNumbers() {
        this.updateLineNumbers();
    }

    /**
     * 更新行号显示
     */
    updateLineNumbers() {
        const content = this.elements.editor.value;
        const lines = content.split('\n').length;
        
        let lineNumbersHtml = '';
        for (let i = 1; i <= lines; i++) {
            lineNumbersHtml += `<span data-line="${i}">${i}</span>`;
        }
        
        this.elements.lineNumbers.innerHTML = lineNumbersHtml;
    }

    /**
     * 同步行号滚动
     */
    syncScroll() {
        const scrollTop = this.elements.editor.scrollTop;
        this.elements.lineNumbers.scrollTop = scrollTop;
    }

    /**
     * 高亮指定行
     */
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
            const lineHeight = 24; // 与 CSS 中的行高匹配 (15px * 1.6 = 24px)
            const scrollPosition = (lineNumber - 1) * lineHeight - (this.elements.editor.clientHeight / 2);
            this.elements.editor.scrollTop = scrollPosition;
            this.elements.lineNumbers.scrollTop = scrollPosition;

            // 3秒后移除高亮
            setTimeout(() => {
                lineElement.classList.remove('highlighted');
            }, 3000);
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        this.elements.editTab.classList.toggle('active', tabName === 'edit');
        this.elements.previewTab.classList.toggle('active', tabName === 'preview');
        this.elements.compareTab.classList.toggle('active', tabName === 'compare');

        // Update panes
        this.elements.editorPane.classList.toggle('active', tabName === 'edit');
        this.elements.previewPane.style.display = tabName === 'preview' ? 'block' : 'none';
        this.elements.comparePane.style.display = tabName === 'compare' ? 'flex' : 'none';

        if (tabName === 'preview') {
            this.updatePreview();
        }
    }

    updatePreview() {
        const content = this.elements.editor.value;
        if (!content) {
            this.elements.previewContent.innerHTML = `
                <div class="preview-placeholder">
                    <div class="preview-icon">👁️</div>
                    <p>实时预览 Markdown 渲染效果</p>
                </div>`;
            return;
        }
        
        if (window.marked) {
            const rawHtml = window.marked.parse(content);
            // 预览安全：如果存在 DOMPurify，则对渲染结果做净化，避免 XSS
            if (window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
                this.elements.previewContent.innerHTML = window.DOMPurify.sanitize(rawHtml);
            } else {
                // 降级：不注入 HTML，避免潜在脚本执行
                this.elements.previewContent.textContent = content;
            }
        }
    }

    setValue(content) {
        this.elements.editor.value = content;
        this.app.state.set('currentContent', content);
        this.updateLineNumbers();
    }

    getValue() {
        return this.elements.editor.value;
    }

    setCompareContent(original, processed) {
        this.elements.originalContent.textContent = original;
        this.elements.processedContent.textContent = processed;
        this.elements.compareTab.style.display = 'block';
    }
}
