export class EditorManager {
    constructor(app) {
        this.app = app;
        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.elements = {
            editor: document.getElementById('markdownEditor'),
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
            comparePane: document.getElementById('comparePane'),
            
            resetBtn: document.getElementById('resetBtn')
        };
    }

    bindEvents() {
        this.elements.editTab.addEventListener('click', () => this.switchTab('edit'));
        this.elements.previewTab.addEventListener('click', () => this.switchTab('preview'));
        this.elements.compareTab.addEventListener('click', () => this.switchTab('compare'));
        
        this.elements.editor.addEventListener('input', () => {
            // Debounce preview update could go here
            this.app.state.set('currentContent', this.elements.editor.value);
        });

        this.elements.resetBtn.addEventListener('click', () => {
            if (confirm('确定要重置到原始内容吗？所有修改将丢失。')) {
                this.app.resetContent();
            }
        });
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
            this.elements.previewContent.innerHTML = window.marked.parse(content);
        }
    }

    setValue(content) {
        this.elements.editor.value = content;
        this.app.state.set('currentContent', content);
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
