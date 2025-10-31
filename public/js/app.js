/**
 * MarkDown 文档整理工具 - 前端应用
 * 功能：文件上传、实时编辑、预览对比、手动微调
 */

class MarkdownCleanerApp {
    constructor() {
        // 应用状态
        this.state = {
            currentFile: null,
            originalContent: '',
            processedContent: '',
            isProcessing: false,
            activeTab: 'edit',
            editor: null
        };

        // DOM 元素引用
        this.elements = {};
        
        // 初始化应用
        this.init();
    }

    /**
     * 初始化应用
     */
    async init() {
        try {
            this.initElements();
            this.initEventListeners();
            this.initEditor();
            this.updateUI();
            
            console.log('📝 MarkDown 清理工具已初始化');
        } catch (error) {
            console.error('应用初始化失败:', error);
            this.showError('应用初始化失败，请刷新页面重试');
        }
    }

    /**
     * 获取 DOM 元素引用
     */
    initElements() {
        // 文件相关元素
        this.elements = {
            // 文件上传
            uploadArea: document.getElementById('uploadArea'),
            fileInput: document.getElementById('fileInput'),
            fileInfo: document.getElementById('fileInfo'),
            fileName: document.getElementById('fileName'),
            clearFile: document.getElementById('clearFile'),
            
            // 处理选项
            fixFormat: document.getElementById('fixFormat'),
            fixPunctuation: document.getElementById('fixPunctuation'),
            convertTraditional: document.getElementById('convertTraditional'),
            
            // 操作按钮
            processBtn: document.getElementById('processBtn'),
            previewBtn: document.getElementById('previewBtn'),
            downloadBtn: document.getElementById('downloadBtn'),
            resetBtn: document.getElementById('resetBtn'),
            
            // 状态显示
            statusSection: document.getElementById('statusSection'),
            statusText: document.getElementById('statusText'),
            
            // 标签页
            editTab: document.getElementById('editTab'),
            previewTab: document.getElementById('previewTab'),
            compareTab: document.getElementById('compareTab'),
            
            // 内容区域
            editorPane: document.getElementById('editorPane'),
            previewPane: document.getElementById('previewPane'),
            comparePane: document.getElementById('comparePane'),
            
            // 编辑器和预览
            markdownEditor: document.getElementById('markdownEditor'),
            previewContent: document.getElementById('previewContent'),
            originalContent: document.getElementById('originalContent'),
            processedContent: document.getElementById('processedContent')
        };
    }

    /**
     * 初始化事件监听器
     */
    initEventListeners() {
        // 文件上传相关事件
        this.elements.uploadArea.addEventListener('click', () => {
            this.elements.fileInput.click();
        });

        this.elements.fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files[0]);
        });

        this.elements.clearFile.addEventListener('click', () => {
            this.clearFile();
        });

        // 拖拽上传
        this.elements.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.elements.uploadArea.classList.add('dragover');
        });

        this.elements.uploadArea.addEventListener('dragleave', () => {
            this.elements.uploadArea.classList.remove('dragover');
        });

        this.elements.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.elements.uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });

        // 按钮事件
        this.elements.processBtn.addEventListener('click', () => {
            this.processFile();
        });

        this.elements.previewBtn.addEventListener('click', () => {
            this.togglePreview();
        });

        this.elements.downloadBtn.addEventListener('click', () => {
            this.downloadFile();
        });

        this.elements.resetBtn.addEventListener('click', () => {
            this.resetToOriginal();
        });

        // 标签页切换
        this.elements.editTab.addEventListener('click', () => {
            this.switchTab('edit');
        });

        this.elements.previewTab.addEventListener('click', () => {
            this.switchTab('preview');
        });

        this.elements.compareTab.addEventListener('click', () => {
            this.switchTab('compare');
        });

        // 编辑器内容变化（手动微调）
        this.elements.markdownEditor.addEventListener('input', () => {
            this.handleManualEdit();
        });
    }

    /**
     * 初始化编辑器
     */
    initEditor() {
        // 使用简单的 textarea，保持轻量级
        // 可以后续升级为 CodeMirror 或其他富文本编辑器
        this.elements.markdownEditor.style.fontFamily = '"Consolas", "Monaco", "Courier New", monospace';
        this.elements.markdownEditor.style.fontSize = '14px';
        this.elements.markdownEditor.style.lineHeight = '1.6';
        
        // 全局配置 marked.js 以保护中文引号
        if (typeof marked !== 'undefined') {
            marked.setOptions({
                smartypants: false,  // 关键：禁用智能标点符号转换
                smartLists: true,
                breaks: false,
                gfm: true,
                pedantic: false,
                sanitize: false,
                silent: false
            });
        }
        
        console.log('编辑器已初始化');
    }

    /**
     * 处理文件选择
     */
    async handleFileSelect(file) {
        if (!file) return;

        // 验证文件类型
        const allowedTypes = ['.md', '.markdown', '.txt'];
        const fileExt = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!allowedTypes.includes(fileExt)) {
            this.showError('只支持 .md, .markdown, .txt 格式的文件');
            return;
        }

        // 验证文件大小 (10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showError('文件大小不能超过 10MB');
            return;
        }

        try {
            this.updateStatus('正在读取文件...');
            
            // 读取文件内容
            const content = await this.readFileContent(file);
            
            // 更新状态
            this.state.currentFile = file;
            this.state.originalContent = content;
            this.state.processedContent = content;
            
            // 更新UI
            this.elements.fileName.textContent = file.name;
            this.elements.fileInfo.style.display = 'flex';
            this.elements.markdownEditor.value = content;
            
            this.updateUI();
            this.updateStatus('文件已加载，可以开始处理');
            
        } catch (error) {
            console.error('文件读取失败:', error);
            this.showError('文件读取失败: ' + error.message);
        }
    }

    /**
     * 读取文件内容
     */
    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                resolve(e.target.result);
            };
            
            reader.onerror = () => {
                reject(new Error('文件读取失败'));
            };
            
            reader.readAsText(file, 'UTF-8');
        });
    }

    /**
     * 清除文件
     */
    clearFile() {
        this.state.currentFile = null;
        this.state.originalContent = '';
        this.state.processedContent = '';
        
        this.elements.fileInput.value = '';
        this.elements.fileInfo.style.display = 'none';
        this.elements.markdownEditor.value = '';
        this.elements.previewContent.innerHTML = this.getPreviewPlaceholder();
        
        this.updateUI();
        this.updateStatus('准备就绪');
    }

    /**
     * 处理文件
     */
    async processFile() {
        if (!this.state.currentFile) {
            this.showError('请先选择文件');
            return;
        }

        try {
            this.state.isProcessing = true;
            this.updateUI();
            this.updateStatus('正在处理文件...');

            // 获取处理选项
            const options = {
                fixFormat: this.elements.fixFormat.checked,
                fixPunctuation: this.elements.fixPunctuation.checked,
                convertTraditional: this.elements.convertTraditional.checked
            };

            // 发送请求到服务器
            const response = await fetch('/api/process-text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: this.state.originalContent,
                    options: options
                })
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || '处理失败');
            }

            // 更新处理结果
            this.state.processedContent = result.data.processedContent;
            this.elements.markdownEditor.value = this.state.processedContent;
            
            // 显示对比标签
            this.elements.compareTab.style.display = 'block';
            
            // 更新对比视图
            this.updateCompareView();
            
            // 切换到对比视图
            this.switchTab('compare');
            
            this.updateUI();
            this.updateStatus(`处理完成 - 修改了 ${result.data.report.changes.modifiedLines} 行`);
            
            console.log('处理报告:', result.data.report);
            
        } catch (error) {
            console.error('文件处理失败:', error);
            this.showError('文件处理失败: ' + error.message);
        } finally {
            this.state.isProcessing = false;
            this.updateUI();
        }
    }

    /**
     * 切换预览
     */
    togglePreview() {
        if (this.state.activeTab === 'preview') {
            this.switchTab('edit');
        } else {
            this.switchTab('preview');
            this.updatePreview();
        }
    }

    /**
     * 更新预览内容
     */
    updatePreview() {
        const content = this.elements.markdownEditor.value;
        
        if (!content.trim()) {
            this.elements.previewContent.innerHTML = this.getPreviewPlaceholder();
            return;
        }

        try {
            // 方法：临时替换中文引号，渲染后再替换回来
            const leftQuote = String.fromCharCode(8220);  // "
            const rightQuote = String.fromCharCode(8221); // "
            
            // 步骤1：将中文引号替换为临时标记
            let processContent = content;
            processContent = processContent.replace(new RegExp(leftQuote, 'g'), '###LEFT_QUOTE###');
            processContent = processContent.replace(new RegExp(rightQuote, 'g'), '###RIGHT_QUOTE###');
            
            // 步骤2：配置 marked.js
            marked.setOptions({
                smartypants: false,  // 禁用智能标点符号转换
                smartLists: true,
                breaks: false,
                gfm: true,
                pedantic: false,
                sanitize: false,
                silent: false
            });
            
            // 步骤3：渲染 Markdown
            let html = marked.parse(processContent);
            
            // 步骤4：将临时标记替换回中文引号
            html = html.replace(/###LEFT_QUOTE###/g, leftQuote);
            html = html.replace(/###RIGHT_QUOTE###/g, rightQuote);
            
            this.elements.previewContent.innerHTML = html;
        } catch (error) {
            console.error('Markdown 渲染失败:', error);
            this.elements.previewContent.innerHTML = '<p style="color: red;">预览渲染失败</p>';
        }
    }

    /**
     * 获取预览占位符
     */
    getPreviewPlaceholder() {
        return `
            <div class="preview-placeholder">
                <div class="preview-icon">👁️</div>
                <p>实时预览 Markdown 渲染效果</p>
            </div>
        `;
    }

    /**
     * 更新对比视图
     */
    updateCompareView() {
        this.elements.originalContent.textContent = this.state.originalContent;
        this.elements.processedContent.textContent = this.state.processedContent;
    }

    /**
     * 切换标签页
     */
    switchTab(tabName) {
        this.state.activeTab = tabName;

        // 更新标签按钮状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // 隐藏所有面板
        document.querySelectorAll('.editor-pane, .preview-pane, .compare-pane').forEach(pane => {
            pane.classList.remove('active');
        });

        // 显示对应面板和标签
        switch (tabName) {
            case 'edit':
                this.elements.editTab.classList.add('active');
                this.elements.editorPane.classList.add('active');
                break;
            case 'preview':
                this.elements.previewTab.classList.add('active');
                this.elements.previewPane.classList.add('active');
                this.updatePreview();
                break;
            case 'compare':
                this.elements.compareTab.classList.add('active');
                this.elements.comparePane.classList.add('active');
                break;
        }
    }

    /**
     * 处理手动编辑
     */
    handleManualEdit() {
        // 用户手动编辑了内容，实时更新预览
        if (this.state.activeTab === 'preview') {
            this.updatePreview();
        }

        // 更新处理后的内容
        this.state.processedContent = this.elements.markdownEditor.value;
        
        // 启用下载按钮
        this.updateUI();
    }

    /**
     * 重置到原始内容
     */
    resetToOriginal() {
        if (!this.state.originalContent) return;

        this.elements.markdownEditor.value = this.state.originalContent;
        this.state.processedContent = this.state.originalContent;
        
        if (this.state.activeTab === 'preview') {
            this.updatePreview();
        }
        
        this.updateCompareView();
        this.updateStatus('已重置到原始内容');
    }

    /**
     * 下载处理后的文件
     */
    downloadFile() {
        if (!this.state.processedContent) {
            this.showError('没有可下载的内容');
            return;
        }

        try {
            // 获取当前编辑器内容（支持手动微调后的内容）
            const content = this.elements.markdownEditor.value;
            
            // 创建下载链接
            const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            // 生成文件名
            const originalName = this.state.currentFile ? this.state.currentFile.name : 'document.md';
            const fileName = originalName.replace(/\.(md|markdown|txt)$/i, '_cleaned.md');
            
            // 创建下载链接
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // 清理 URL
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            this.updateStatus(`文件已下载: ${fileName}`);
            
        } catch (error) {
            console.error('文件下载失败:', error);
            this.showError('文件下载失败');
        }
    }

    /**
     * 更新UI状态
     */
    updateUI() {
        const hasFile = !!this.state.currentFile;
        const hasProcessed = !!this.state.processedContent && this.state.processedContent !== this.state.originalContent;
        
        // 更新按钮状态
        this.elements.processBtn.disabled = !hasFile || this.state.isProcessing;
        this.elements.previewBtn.disabled = !hasFile;
        this.elements.downloadBtn.style.display = hasFile ? 'block' : 'none';
        this.elements.resetBtn.disabled = !hasFile;

        // 更新按钮文本
        if (this.state.isProcessing) {
            this.elements.processBtn.textContent = '⏳ 处理中...';
        } else {
            this.elements.processBtn.textContent = '⚡ 一键修复';
        }

        // 更新预览按钮文本
        if (this.state.activeTab === 'preview') {
            this.elements.previewBtn.textContent = '📝 返回编辑';
        } else {
            this.elements.previewBtn.textContent = '👁️ 预览效果';
        }
    }

    /**
     * 更新状态显示
     */
    updateStatus(message) {
        this.elements.statusText.textContent = message;
        this.elements.statusSection.style.display = 'block';
        
        // 自动隐藏状态（除了错误信息）
        if (!message.includes('错误') && !message.includes('失败')) {
            setTimeout(() => {
                if (this.elements.statusText.textContent === message) {
                    this.elements.statusSection.style.display = 'none';
                }
            }, 3000);
        }
    }

    /**
     * 显示错误信息
     */
    showError(message) {
        this.updateStatus(`❌ 错误: ${message}`);
        console.error('应用错误:', message);
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.markdownApp = new MarkdownCleanerApp();
});