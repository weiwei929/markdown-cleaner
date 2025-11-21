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
            editor: null,
            uiMode: 'overview',
            isSavingDraft: false
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
            Settings.apply(this);
            this.initEditor();
            const savedMode = localStorage.getItem('mdCleanerUiMode');
            if (savedMode === 'basic' || savedMode === 'expert') this.state.uiMode = savedMode; else this.state.uiMode = 'overview';
            this.updateUIByMode();
            if (window.SectionNav) SectionNav.updateHotkeys(this);
            this.updateHotkeyHint();
            
            
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
            exportBtn: document.getElementById('exportBtn'),
            analyzeBtn: document.getElementById('analyzeBtn'),
            expertRulesBtn: document.getElementById('expertRulesBtn'),
            expertRunBtn: document.getElementById('expertRunBtn'),
            findReplaceBtn: document.getElementById('findReplaceBtn'),
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
        this.elements.issuesPanel = document.getElementById('issuesPanel');
        this.elements.issuesList = document.getElementById('issuesList');
        this.elements.closeIssuesPanel = document.getElementById('closeIssuesPanel');
        this.elements.exportModal = document.getElementById('exportModal');
        this.elements.exportBackdrop = document.getElementById('exportBackdrop');
        this.elements.exportFileName = document.getElementById('exportFileName');
        this.elements.confirmExport = document.getElementById('confirmExport');
        this.elements.cancelExport = document.getElementById('cancelExport');
        this.elements.closeExportModal = document.getElementById('closeExportModal');
        this.elements.planModal = document.getElementById('planModal');
        this.elements.planBackdrop = document.getElementById('planBackdrop');
        this.elements.planContent = document.getElementById('planContent');
        this.elements.closePlanModal = document.getElementById('closePlanModal');
        this.elements.btnApplySafePlan = document.getElementById('btnApplySafePlan');
        this.elements.btnApplySuggestedPlan = document.getElementById('btnApplySuggestedPlan');
        this.elements.btnExportPlanJson = document.getElementById('btnExportPlanJson');
        this.elements.settingsBtn = document.getElementById('settingsBtn');
        this.elements.settingsModal = document.getElementById('settingsModal');
        this.elements.settingsBackdrop = document.getElementById('settingsBackdrop');
        this.elements.closeSettingsModal = document.getElementById('closeSettingsModal');
        this.elements.saveSettingsBtn = document.getElementById('saveSettingsBtn');
        this.elements.cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
        this.elements.settingEnableHotkeys = document.getElementById('settingEnableHotkeys');
        this.elements.editorToolbar = document.querySelector('#editorPane .editor-toolbar');
        this.elements.optionsSection = document.getElementById('optionsSection');
        this.elements.overviewPane = document.getElementById('overviewPane');
        this.elements.mainContent = document.getElementById('mainContent');
        this.elements.modeBar = document.getElementById('modeBar');
        this.elements.modeText = document.getElementById('modeText');
        this.elements.backToOverviewBtn = document.getElementById('backToOverviewBtn');
        this.elements.cardBasic = document.getElementById('cardBasic');
        this.elements.cardExpert = document.getElementById('cardExpert');
        this.elements.returnModal = document.getElementById('returnModal');
        this.elements.returnBackdrop = document.getElementById('returnBackdrop');
        this.elements.closeReturnModal = document.getElementById('closeReturnModal');
        this.elements.btnReturnSave = document.getElementById('btnReturnSave');
        this.elements.btnReturnNoSave = document.getElementById('btnReturnNoSave');
        this.elements.btnReturnCancel = document.getElementById('btnReturnCancel');
        this.elements.returnSavingHint = document.getElementById('returnSavingHint');
        this.elements.expertModal = document.getElementById('expertModal');
        this.elements.expertBackdrop = document.getElementById('expertBackdrop');
        this.elements.closeExpertModal = document.getElementById('closeExpertModal');
        this.elements.saveExpertRules = document.getElementById('saveExpertRules');
        this.elements.cancelExpertRules = document.getElementById('cancelExpertRules');
        this.elements.findReplaceModal = document.getElementById('findReplaceModal');
        this.elements.findReplaceBackdrop = document.getElementById('findReplaceBackdrop');
        this.elements.closeFindReplaceModal = document.getElementById('closeFindReplaceModal');
        this.elements.findText = document.getElementById('findText');
        this.elements.replaceText = document.getElementById('replaceText');
        this.elements.findCaseSensitive = document.getElementById('findCaseSensitive');
        this.elements.findUseRegex = document.getElementById('findUseRegex');
        this.elements.btnReplaceAll = document.getElementById('btnReplaceAll');
        this.elements.btnStartInteractive = document.getElementById('btnStartInteractive');
        this.elements.cancelFindReplace = document.getElementById('cancelFindReplace');
        this.elements.interactivePanel = document.getElementById('interactivePanel');
        this.elements.interactiveBackdrop = document.getElementById('interactiveBackdrop');
        this.elements.closeInteractivePanel = document.getElementById('closeInteractivePanel');
        this.elements.btnReplaceCurrent = document.getElementById('btnReplaceCurrent');
        this.elements.btnSkipCurrent = document.getElementById('btnSkipCurrent');
        this.elements.btnStopInteractive = document.getElementById('btnStopInteractive');
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

        this.elements.exportBtn.addEventListener('click', () => {
            this.openExportModal();
        });

        this.elements.resetBtn.addEventListener('click', () => {
            this.resetToOriginal();
        });

        this.elements.analyzeBtn.addEventListener('click', () => {
            this.analyzeContent();
        });
        if (this.elements.expertRulesBtn) this.elements.expertRulesBtn.addEventListener('click', () => { this.openExpertModal(); });
        if (this.elements.expertRunBtn) this.elements.expertRunBtn.addEventListener('click', () => { this.requestExpertRun(); });
        if (this.elements.findReplaceBtn) this.elements.findReplaceBtn.addEventListener('click', () => { this.openFindReplaceModal(); });
        if (this.elements.closeFindReplaceModal) this.elements.closeFindReplaceModal.addEventListener('click', () => { this.closeFindReplaceModal(); });
        if (this.elements.cancelFindReplace) this.elements.cancelFindReplace.addEventListener('click', () => { this.closeFindReplaceModal(); });
        if (this.elements.btnReplaceAll) this.elements.btnReplaceAll.addEventListener('click', () => { this.handleReplaceAll(); });
        if (this.elements.btnStartInteractive) this.elements.btnStartInteractive.addEventListener('click', () => { this.startInteractiveReplace(); });
        if (this.elements.closeInteractivePanel) this.elements.closeInteractivePanel.addEventListener('click', () => { this.stopInteractiveReplace(); });
        if (this.elements.btnStopInteractive) this.elements.btnStopInteractive.addEventListener('click', () => { this.stopInteractiveReplace(); });
        if (this.elements.btnReplaceCurrent) this.elements.btnReplaceCurrent.addEventListener('click', () => { this.replaceCurrentMatch(); });
        if (this.elements.btnSkipCurrent) this.elements.btnSkipCurrent.addEventListener('click', () => { this.skipCurrentMatch(); });
        if (this.elements.cardBasic) this.elements.cardBasic.addEventListener('click', () => { this.switchToMode('basic'); });
        if (this.elements.cardExpert) this.elements.cardExpert.addEventListener('click', () => { this.switchToMode('expert'); });
        if (this.elements.backToOverviewBtn) this.elements.backToOverviewBtn.addEventListener('click', () => { this.openReturnModal(); });
        if (this.elements.closeReturnModal) this.elements.closeReturnModal.addEventListener('click', () => { this.closeReturnModal(); });
        if (this.elements.btnReturnCancel) this.elements.btnReturnCancel.addEventListener('click', () => { this.closeReturnModal(); });
        if (this.elements.btnReturnSave) this.elements.btnReturnSave.addEventListener('click', () => { this.handleReturn(true); });
        if (this.elements.btnReturnNoSave) this.elements.btnReturnNoSave.addEventListener('click', () => { this.handleReturn(false); });
        this.elements.closeIssuesPanel.addEventListener('click', () => {
            this.closeIssuesPanel();
        });
        this.elements.confirmExport.addEventListener('click', () => {
            this.handleExportConfirm();
        });
        this.elements.cancelExport.addEventListener('click', () => {
            this.closeExportModal();
        });
        this.elements.closeExportModal.addEventListener('click', () => {
            this.closeExportModal();
        });
        this.elements.closePlanModal.addEventListener('click', () => {
            this.closePlanModal();
        });
        if (this.elements.closeExpertModal) this.elements.closeExpertModal.addEventListener('click', () => { this.closeExpertModal(); });
        if (this.elements.cancelExpertRules) this.elements.cancelExpertRules.addEventListener('click', () => { this.closeExpertModal(); });
        if (this.elements.saveExpertRules) this.elements.saveExpertRules.addEventListener('click', () => { this.saveExpertRulesConfig(); });
        this.elements.btnApplySafePlan.addEventListener('click', () => { PlanModal.applySafe(this); });
        this.elements.btnApplySuggestedPlan.addEventListener('click', () => { PlanModal.applySuggested(this); });
        this.elements.btnExportPlanJson.addEventListener('click', () => { PlanModal.exportPlanJson(this); });
        if (this.elements.settingsBtn) this.elements.settingsBtn.addEventListener('click', () => { this.openSettingsModal(); });
        if (this.elements.closeSettingsModal) this.elements.closeSettingsModal.addEventListener('click', () => { this.closeSettingsModal(); });
        if (this.elements.cancelSettingsBtn) this.elements.cancelSettingsBtn.addEventListener('click', () => { this.closeSettingsModal(); });
        if (this.elements.saveSettingsBtn) this.elements.saveSettingsBtn.addEventListener('click', () => { this.saveSettings(); });

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
        await this.analyzeContent();
        this.openIssuesPanel();
            
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
                normalizeQuotes: true, // 始终启用中文全角双引号转换
                convertTraditional: this.elements.convertTraditional.checked,
                fixSpacing: true // 默认启用空格修复
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
        const mode = (this.state.settings && this.state.settings.mode) || 'basic';
        
        // 更新按钮状态
        this.updateControlState(mode, hasFile);

        // 更新按钮文本
        if (this.state.isProcessing) {
            this.elements.processBtn.textContent = '⏳ 处理中...';
        } else {
            this.elements.processBtn.textContent = (mode === 'expert') ? '⚡ 一键修复（基础版已禁用）' : '⚡ 一键修复';
        }

        
    }

    updateUIByMode() {
        const m = this.state.uiMode || 'overview';
        if (this.elements.overviewPane) this.elements.overviewPane.style.display = (m === 'overview') ? 'block' : 'none';
        if (this.elements.mainContent) {
            if (m === 'overview') {
                this.elements.mainContent.style.display = 'none';
            } else {
                try { this.elements.mainContent.removeAttribute('style'); } catch(e) { this.elements.mainContent.style.display = ''; }
            }
        }
        if (this.elements.modeBar) this.elements.modeBar.style.display = (m === 'overview') ? 'none' : 'block';
        if (this.elements.modeText) this.elements.modeText.textContent = '当前模式：' + (m === 'basic' ? '基础版' : 'AI 专家版');
        localStorage.setItem('mdCleanerUiMode', m);
        this.state.settings = Object.assign({}, this.state.settings || {}, { mode: (m === 'basic' ? 'basic' : 'expert') });
        this.updateModeView(m);
        this.updateUI();
    }

    updateModeView(m) {
        const showBasic = (m === 'basic');
        const showExpert = (m === 'expert');
        if (this.elements.optionsSection) this.elements.optionsSection.style.display = showBasic ? 'block' : 'none';
        if (this.elements.settingsBtn) this.elements.settingsBtn.style.display = showBasic ? 'inline-block' : 'none';
        if (this.elements.analyzeBtn) this.elements.analyzeBtn.style.display = showBasic ? 'inline-block' : 'none';
        if (this.elements.processBtn) this.elements.processBtn.style.display = showBasic ? 'inline-block' : 'none';
        if (this.elements.expertRulesBtn) this.elements.expertRulesBtn.style.display = showExpert ? 'inline-block' : 'none';
        if (this.elements.expertRunBtn) this.elements.expertRunBtn.style.display = showExpert ? 'inline-block' : 'none';
        if (this.elements.findReplaceBtn) this.elements.findReplaceBtn.style.display = showExpert ? 'inline-block' : 'none';
        if (this.elements.exportBtn) this.elements.exportBtn.style.display = 'inline-block';
    }

    updateControlState(mode, hasFile) {
        this.elements.processBtn.disabled = !hasFile || this.state.isProcessing || mode === 'expert';
        this.elements.analyzeBtn.disabled = !hasFile || mode === 'expert';
        this.elements.exportBtn.disabled = !hasFile;
        this.elements.resetBtn.disabled = !hasFile;
        if (this.elements.expertRulesBtn) this.elements.expertRulesBtn.disabled = !hasFile || mode !== 'expert';
        if (this.elements.expertRunBtn) this.elements.expertRunBtn.disabled = !hasFile || mode !== 'expert' || !(this.state.expertRules && this.state.expertRules.prompt && this.state.expertRules.prompt.trim());
        if (this.elements.findReplaceBtn) this.elements.findReplaceBtn.disabled = !hasFile || mode !== 'expert';
    }

    switchToMode(m) {
        if (m !== 'basic' && m !== 'expert') return;
        this.state.uiMode = m;
        this.loadDraft(m);
        this.updateUIByMode();
    }

    openReturnModal() {
        if (this.elements.returnModal) this.elements.returnModal.style.display = 'block';
        if (this.elements.returnBackdrop) this.elements.returnBackdrop.style.display = 'block';
        document.body.classList.add('modal-open');
    }
    closeReturnModal() {
        if (this.elements.returnModal) this.elements.returnModal.style.display = 'none';
        if (this.elements.returnBackdrop) this.elements.returnBackdrop.style.display = 'none';
        document.body.classList.remove('modal-open');
        if (this.elements.returnSavingHint) this.elements.returnSavingHint.style.display = 'none';
    }
    handleReturn(save) {
        if (this.state.isSavingDraft) return;
        this.state.isSavingDraft = true;
        if (this.elements.returnSavingHint) this.elements.returnSavingHint.style.display = 'block';
        this.disableAllControls(true);
        try {
            if (save) this.saveDraft(this.state.uiMode);
            this.state.uiMode = 'overview';
            this.updateUIByMode();
            this.updateStatus(save ? '已保存草稿并返回总览' : '已返回总览');
        } catch (e) {
            this.showError('保存草稿失败: ' + e.message);
        } finally {
            this.state.isSavingDraft = false;
            this.disableAllControls(false);
            this.closeReturnModal();
        }
    }
    disableAllControls(disabled) {
        const btns = [this.elements.analyzeBtn, this.elements.processBtn, this.elements.exportBtn, this.elements.settingsBtn, this.elements.expertRulesBtn, this.elements.expertRunBtn, this.elements.findReplaceBtn];
        btns.forEach(b => { if (b) b.disabled = !!disabled; });
    }
    saveDraft(mode) {
        const key = mode === 'expert' ? 'mdCleanerDraft_expert' : 'mdCleanerDraft_basic';
        const fileName = this.state.currentFile ? this.state.currentFile.name : '';
        const payload = { content: this.elements.markdownEditor.value || '', fileName, ts: Date.now() };
        localStorage.setItem(key, JSON.stringify(payload));
    }
    loadDraft(mode) {
        const key = mode === 'expert' ? 'mdCleanerDraft_expert' : 'mdCleanerDraft_basic';
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return;
            const d = JSON.parse(raw);
            if (d && typeof d.content === 'string') {
                this.elements.markdownEditor.value = d.content;
                this.state.processedContent = d.content;
                this.updateCompareView();
            }
        } catch (e) {}
    }

    async requestExpertRun() {
        const content = this.elements.markdownEditor.value || '';
        const rules = this.state.expertRules || { prompt: '' };
        if (!content.trim()) { this.showError('请先输入或导入内容'); return; }
        if (!rules.prompt || !rules.prompt.trim()) { this.showError('请先在专家规则中填写规则'); return; }
        try {
            this.updateStatus('正在提交专家处理...');
            const resp = await fetch('/api/ai/suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, rules }) });
            const result = await resp.json();
            if (!result.success) throw new Error(result.error || '专家处理失败');
            this.renderExpertSuggestions(result.data);
            this.openIssuesPanel();
            this.updateStatus('专家建议已生成');
        } catch (e) {
            this.showError('专家处理失败: ' + e.message);
        }
    }

    renderExpertSuggestions(data) {
        const list = this.elements.issuesList;
        const arr = (data && data.suggestions) || [];
        let html = '';
        html += `<div class="issues-summary">`;
        html += `<div class="summary-line"><strong>专家建议</strong> · 数量：${arr.length}</div>`;
        const prompt = (data && data.rules && data.rules.prompt) || '';
        if (prompt) html += `<div class="summary-line">规则：${prompt.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`;
        html += `</div>`;
        const samples = arr.slice(0, 50).map(it => `<div class="issue-item"><span class="issue-icon">🧠</span><div class="issue-message">第${(it.line||0)+1}行 · ${it.message}</div></div>`).join('');
        html += samples || '<div class="summary-line">暂无建议</div>';
        const aggs = (data && data.aggregations && data.aggregations.terms) || [];
        if (aggs.length) {
            html += `<div class="summary-line" style="margin-top:10px;">批量替代映射：</div>`;
            html += `<ul class="summary-list">` + aggs.map((t,i) => `<li>${t.from} → ${t.to} · 次数 ${t.count} <button class='btn-secondary' id='btnAggApplyGlobal_${i}'>应用到全局</button></li>`).join('') + `</ul>`;
        }
        html += `<div class="issues-actions"><button class="btn-secondary" id="btnBackSummary">返回摘要</button></div>`;
        list.innerHTML = html;
        const backBtn = document.getElementById('btnBackSummary');
        if (backBtn) backBtn.onclick = () => this.renderIssues(this.state.lastAnalyzeData);
        this.bindExpertAggregations(aggs);
    }

    bindExpertAggregations(aggs) {
        (aggs||[]).forEach((t,i) => {
            const btn = document.getElementById(`btnAggApplyGlobal_${i}`);
            if (btn) btn.onclick = () => this.requestApplyAggregation(t);
        });
    }

    async requestApplyAggregation(mapping) {
        try {
            const content = this.elements.markdownEditor.value || '';
            const resp = await fetch('/api/ai/apply-bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, mappings: [mapping] }) });
            const result = await resp.json();
            if (!result.success) throw new Error(result.error || '应用失败');
            this.state.processedContent = result.data.text;
            this.elements.markdownEditor.value = this.state.processedContent;
            this.updateCompareView();
            this.elements.compareTab.style.display = 'block';
            this.switchTab('compare');
            this.updateUI();
            this.updateStatus('已应用批量替代到全局');
        } catch (e) {
            this.showError('应用失败: ' + e.message);
        }
    }

    async analyzeContent() {
        const content = this.elements.markdownEditor.value || '';
        if (!content.trim()) {
            this.showError('请先输入或导入内容');
            return;
        }
        try {
            this.updateStatus('正在检查...');
            const resp = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            const result = await resp.json();
            if (!result.success) throw new Error(result.error || '分析失败');
            this.state.lastAnalyzeData = result.data;
            this.renderIssues(result.data);
            this.openIssuesPanel();
            this.updateStatus('检查完成');
        } catch (e) {
            this.showError('分析失败: ' + e.message);
        }
    }

    renderIssues(data) {
        data = data || this.state.lastAnalyzeData || { grouped: { SAFE: [], SUGGESTED: [], WARNING: [] }, stats: { total: 0, safe: 0, suggested: 0, warning: 0 } };
        const list = this.elements.issuesList;
        const grouped = data.grouped || { SAFE: [], SUGGESTED: [], WARNING: [] };
        const stats = data.stats || {
            total: (grouped.SAFE.length + grouped.SUGGESTED.length + grouped.WARNING.length),
            safe: grouped.SAFE.length,
            suggested: grouped.SUGGESTED.length,
            warning: grouped.WARNING.length
        };

        const hasSafe = stats.safe > 0;
        const hasSuggested = stats.suggested > 0;
        const hasWarning = stats.warning > 0;

        let html = '';
        html += `<div class="issues-summary">`;
        html += `<div class="summary-line">总计问题：<strong>${stats.total}</strong></div>`;
        html += `<div class="summary-line">安全修复：<strong>${stats.safe}</strong> · 建议修复：<strong>${stats.suggested}</strong> · 警告：<strong>${stats.warning}</strong></div>`;
        const st = (this.state.lastAnalyzeData && this.state.lastAnalyzeData.structure) || this.parseOutlineFromContent();
        if (st) {
            const outline = st.outline || [];
            html += `<div class="summary-line">结构大纲（#/## 行首）：</div>`;
            html += `<ul class="summary-list">` + (outline.length ? outline.map(h => `<li>${'#'.repeat(h.level)} ${h.text || '(空)'} · 行 ${h.lineStart + 1}</li>`).join('') : '<li>未检测到标题</li>') + `</ul>`;
            const sections = st.sections || [];
            if (sections.length) {
                html += `<div class="summary-line">分板块统计：</div>`;
                html += `<ul class="summary-list">` + sections.map((sec, i) => `<li>${'#'.repeat(sec.level)} ${sec.heading || '(空)'} · 行 ${sec.range.start + 1}-${sec.range.end + 1} · 安全:${sec.stats?.safe ?? 0} 建议:${sec.stats?.suggested ?? 0} 警告:${sec.stats?.warning ?? 0} <button class='btn-secondary' data-sec='${i}' id='btnViewSection_${i}'>查看该板块建议</button> <button class='btn-secondary' data-sec='${i}' id='btnPlanSection_${i}'>生成修复计划</button></li>`).join('') + `</ul>`;
            }
        }
        html += `<div class="summary-suggest">`;
        html += `<p>建议：</p>`;
        html += `<ul class="summary-list">`;
        html += hasSafe ? `<li>可一键应用安全修复，默认零误伤</li>` : '';
        html += hasSuggested ? `<li>建议修复项请逐条审阅后再应用</li>` : '';
        html += hasWarning ? `<li>警告项不自动修改，可结合 AI 建议处理</li>` : '';
        if (!hasSafe && !hasSuggested && !hasWarning) {
            html += `<li>未发现需要修复的问题</li>`;
        }
        html += `</ul>`;
        html += `</div>`;
        html += `<div class="issues-actions">`;
        html += `<button class="btn-secondary" id="btnViewSafe">查看安全修复建议 (${stats.safe})</button>`;
        html += `<button class="btn-secondary" id="btnViewSuggested">查看建议修复 (${stats.suggested})</button>`;
        html += `<button class="btn-secondary" id="btnViewWarning">查看警告说明 (${stats.warning})</button>`;
        html += `<button class="btn-secondary" id="btnPlanGlobal">生成全局修复计划</button>`;
        html += `<button class="btn-secondary" id="btnPlanGlobalExport">导出全局计划 JSON</button>`;
        html += `</div>`;
        html += `</div>`;

        list.innerHTML = html;
        this.bindIssueSummaryActions(grouped);
        this.bindSectionActions();
    }

    openIssuesPanel() {
        this.elements.issuesPanel.style.display = 'block';
        const backdrop = document.getElementById('issuesBackdrop');
        if (backdrop) backdrop.style.display = 'block';
        document.body.classList.add('modal-open');
    }

    closeIssuesPanel() {
        this.elements.issuesPanel.style.display = 'none';
        const backdrop = document.getElementById('issuesBackdrop');
        if (backdrop) backdrop.style.display = 'none';
        document.body.classList.remove('modal-open');
    }

    bindIssueSummaryActions(grouped) {
        const safeBtn = document.getElementById('btnViewSafe');
        const sugBtn = document.getElementById('btnViewSuggested');
        const warnBtn = document.getElementById('btnViewWarning');
        const planGlobalBtn = document.getElementById('btnPlanGlobal');
        const planGlobalExportBtn = document.getElementById('btnPlanGlobalExport');
        if (safeBtn) safeBtn.onclick = () => this.renderCategoryView('SAFE', grouped);
        if (sugBtn) sugBtn.onclick = () => this.renderCategoryView('SUGGESTED', grouped);
        if (warnBtn) warnBtn.onclick = () => this.renderCategoryView('WARNING', grouped);
        if (planGlobalBtn) planGlobalBtn.onclick = () => this.requestPlanGlobal();
        if (planGlobalExportBtn) planGlobalExportBtn.onclick = () => this.exportGlobalPlanJson();
    }

    bindSectionActions() {
        const st = (this.state.lastAnalyzeData && this.state.lastAnalyzeData.structure) || this.parseOutlineFromContent();
        if (!st) return;
        const sections = st.sections || [];
        sections.forEach((sec, i) => {
            const btnView = document.getElementById(`btnViewSection_${i}`);
            const btnPlan = document.getElementById(`btnPlanSection_${i}`);
            if (btnView) btnView.onclick = () => this.renderSectionView(sec);
            if (btnPlan) btnPlan.onclick = () => this.requestPlanForSection(sec);
        });
    }

    renderSectionView(sec) {
        const grouped = { SAFE: [], SUGGESTED: [], WARNING: [] };
        const issues = sec.sampleIssues || [];
        issues.forEach(it => {
            if (it.code === 'broken-line') grouped.SUGGESTED.push(it);
            else if (it.code === 'missing-space' || it.code === 'indent-style' || it.code === 'mixed-punc') grouped.SAFE.push(it);
            else grouped.WARNING.push(it);
        });
        const list = this.elements.issuesList;
        const title = `${'#'.repeat(sec.level)} ${sec.heading || '(空)'} · 行 ${sec.range.start + 1}-${sec.range.end + 1}`;
        let html = `<div class='issues-summary'><div class='summary-line'><strong>${title}</strong></div>`;
        html += `<div class='summary-line'>安全:${grouped.SAFE.length} 建议:${grouped.SUGGESTED.length} 警告:${grouped.WARNING.length}</div></div>`;
        const samples = issues.slice(0, 20).map(it => `<div class='issue-item ${it.type}'><span class='issue-icon'>${this.getTypeIcon(it.type)}</span><div class='issue-message'>第${it.line + 1}行 · ${it.message}</div></div>`).join('');
        html += samples ? `<div style='margin-top:10px;'>示例（最多显示20条）：</div>${samples}` : '';
        html += `<div class='issues-actions'><button class='btn-secondary' id='btnBackSummary'>返回摘要</button> <button class='btn-secondary' id='btnJumpToSection'>跳转到板块起始</button> <button class='btn-secondary' id='btnJumpToSectionEnd'>跳转到板块末尾</button> <button class='btn-secondary' id='btnJumpPrevSection'>上一板块</button> <button class='btn-secondary' id='btnJumpNextSection'>下一板块</button></div>`;
        html += `<div class='summary-line'>快捷键：<span class='kbd'>Alt + ↑</span> 上一板块 · <span class='kbd'>Alt + ↓</span> 下一板块</div>`;
        list.innerHTML = html;
        const backBtn = document.getElementById('btnBackSummary');
        if (backBtn) backBtn.onclick = () => this.renderIssues(this.state.lastAnalyzeData);
        const jumpBtn = document.getElementById('btnJumpToSection');
        if (jumpBtn) jumpBtn.onclick = () => SectionNav.jumpToLine(this, sec.range.start + 1);
        SectionNav.bindButtons(this, sec);
        const jumpEndBtn = document.getElementById('btnJumpToSectionEnd');
        if (jumpEndBtn) jumpEndBtn.onclick = () => this.jumpToLine(sec.range.end + 1);
    }

    async requestPlanForSection(sec) {
        try {
            const content = this.elements.markdownEditor.value || '';
            const resp = await fetch('/api/plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, selectedPriorities: ['SAFE','SUGGESTED'], sectionRange: sec.range })
            });
            const result = await resp.json();
            if (!result.success) throw new Error(result.error || '计划生成失败');
            PlanModal.open(this, result.data, sec);
        } catch (e) {
            this.showError('计划生成失败: ' + e.message);
        }
    }
    async requestPlanGlobal() {
        try {
            const content = this.elements.markdownEditor.value || '';
            const resp = await fetch('/api/plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, selectedPriorities: ['SAFE','SUGGESTED'] })
            });
            const result = await resp.json();
            if (!result.success) throw new Error(result.error || '计划生成失败');
            const sec = { heading: '全局', level: 1, range: { start: 0, end: (this.elements.markdownEditor.value.split(/\r?\n/).length - 1) } };
            PlanModal.open(this, result.data, sec);
        } catch (e) {
            this.showError('计划生成失败: ' + e.message);
        }
    }

    openPlanModal(data, sec) {
        const el = this.elements.planContent;
        const title = `${'#'.repeat(sec.level)} ${sec.heading || '(空)'} · 行 ${sec.range.start + 1}-${sec.range.end + 1}`;
        let html = `<div class='issues-summary'><div class='summary-line'><strong>修复计划</strong></div>`;
        html += `<div class='summary-line'>范围：${data.scope === 'section' ? title : '全局'}</div>`;
        html += `<div class='summary-line'>选择优先级：${(data.selectedPriorities || []).join(', ') || '无'}</div>`;
        html += `<div class='summary-line'>估算：安全 ${data.estimate.safe} · 建议 ${data.estimate.suggested} · 警告 ${data.estimate.warning}</div>`;
        html += `</div>`;
        html += `<div class='compare-content'>
                    <div class='compare-side original'>
                        <pre id='planPreviewOriginal'></pre>
                    </div>
                    <div class='compare-side processed'>
                        <pre id='planPreviewProcessed'></pre>
                    </div>
                 </div>`;
        el.innerHTML = html;
        // 缓存当前计划
        this.state.lastPlanData = data;
        this.state.lastPlanSection = sec;
        this.elements.planModal.style.display = 'block';
        this.elements.planBackdrop.style.display = 'block';
        document.body.classList.add('modal-open');
        this.requestPreviewForPlan();
    }

    closePlanModal() {
        this.elements.planModal.style.display = 'none';
        this.elements.planBackdrop.style.display = 'none';
        document.body.classList.remove('modal-open');
    }

    async applySafePlan() {
        try {
            const content = this.elements.markdownEditor.value || '';
            const sec = this.state.lastPlanSection;
            if (!sec) {
                this.showError('无可应用的板块范围');
                return;
            }
            const resp = await fetch('/api/apply-fixes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, plan: { selectedPriorities: ['SAFE'], sectionRange: sec.range } })
            });
            const result = await resp.json();
            if (!result.success) throw new Error(result.error || '应用失败');
            // 更新编辑器内容与视图
            this.state.processedContent = result.data.text;
            this.elements.markdownEditor.value = this.state.processedContent;
            this.updateCompareView();
            this.elements.compareTab.style.display = 'block';
            this.switchTab('compare');
            this.updateUI();
            this.updateStatus('已应用 SAFE 到该板块');
        } catch (e) {
            this.showError('应用失败: ' + e.message);
        } finally {
            this.closePlanModal();
        }
    }

    async applySuggestedPlan() {
        try {
            const content = this.elements.markdownEditor.value || '';
            const sec = this.state.lastPlanSection;
            if (!sec) {
                this.showError('无可应用的板块范围');
                return;
            }
            const confirmed = window.confirm('应用建议修复可能影响排版，确认仅对该板块应用吗？');
            if (!confirmed) return;
            const resp = await fetch('/api/apply-fixes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, plan: { selectedPriorities: ['SUGGESTED'], sectionRange: sec.range } })
            });
            const result = await resp.json();
            if (!result.success) throw new Error(result.error || '应用失败');
            this.state.processedContent = result.data.text;
            this.elements.markdownEditor.value = this.state.processedContent;
            this.updateCompareView();
            this.elements.compareTab.style.display = 'block';
            this.switchTab('compare');
            this.updateUI();
            this.updateStatus('已应用 SUGGESTED 到该板块');
        } catch (e) {
            this.showError('应用失败: ' + e.message);
        } finally {
            this.closePlanModal();
        }
    }

    exportPlanJson() {
        try {
            const data = this.state.lastPlanData;
            const sec = this.state.lastPlanSection;
            if (!data || !sec) {
                this.showError('无可导出的计划');
                return;
            }
            const planJson = {
                section: { heading: sec.heading, level: sec.level, range: sec.range },
                selectedPriorities: data.selectedPriorities,
                estimate: data.estimate
            };
            const blob = new Blob([JSON.stringify(planJson, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'fix-plan.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 100);
            this.updateStatus('修复计划 JSON 已导出');
        } catch (e) {
            this.showError('导出失败: ' + e.message);
        }
    }

    renderCategoryView(kind, grouped) {
        const list = this.elements.issuesList;
        const arr = grouped[kind] || [];
        const titleMap = { SAFE: '安全修复', SUGGESTED: '建议修复', WARNING: '警告说明' };
        const title = titleMap[kind] || kind;
        const byCode = {};
        for (const it of arr) {
            const c = it.code || 'unknown';
            byCode[c] = (byCode[c] || 0) + 1;
        }
        const codesHtml = Object.keys(byCode).length
            ? Object.keys(byCode).map(c => `<li>${c}：${byCode[c]}</li>`).join('')
            : '<li>暂无该类别问题</li>';
        const samples = arr.slice(0, 20).map(it => `<div class="issue-item ${it.type}"><span class="issue-icon">${this.getTypeIcon(it.type)}</span><div class="issue-message">第${it.line + 1}行 · ${it.message}</div></div>`).join('');
        let guide = '';
        if (kind === 'SAFE') guide = '此类修复默认安全，可在后续按优先级一键应用。';
        if (kind === 'SUGGESTED') guide = '此类修复可能影响排版，建议逐条审阅后选择应用。';
        if (kind === 'WARNING') guide = '此类为高风险改动，建议结合 AI 建议与人工确认后处理。';
        let html = '';
        html += `<div class="issues-summary">`;
        html += `<div class="summary-line"><strong>${title}</strong> · 数量：${arr.length}</div>`;
        html += `<div class="summary-line">规则分布：</div>`;
        html += `<ul class="summary-list">${codesHtml}</ul>`;
        html += `<div class="summary-line">说明：${guide}</div>`;
        html += `</div>`;
        html += samples ? `<div style="margin-top:10px;">示例（最多显示20条）：</div>${samples}` : '';
        html += `<div class="issues-actions"><button class="btn-secondary" id="btnBackSummary">返回摘要</button></div>`;
        list.innerHTML = html;
        const backBtn = document.getElementById('btnBackSummary');
        if (backBtn) backBtn.onclick = () => this.renderIssues(this.state.lastAnalyzeData);
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

MarkdownCleanerApp.prototype.requestPreviewForPlan = async function() {
    try {
        const content = this.elements.markdownEditor.value || '';
        const sec = this.state.lastPlanSection;
        const plan = { selectedPriorities: (this.state.lastPlanData?.selectedPriorities || ['SAFE','SUGGESTED']) };
        if (sec && sec.heading !== '全局') plan.sectionRange = sec.range;
        const resp = await fetch('/api/preview-fixes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, plan })
        });
        const result = await resp.json();
        if (!result.success) throw new Error(result.error || '预览生成失败');
        const origEl = document.getElementById('planPreviewOriginal');
        const procEl = document.getElementById('planPreviewProcessed');
        const orig = result.data.originalSegment || '';
        const proc = result.data.processedSegment || '';
        origEl.textContent = orig.slice(0, 4000);
        procEl.textContent = proc.slice(0, 4000);
    } catch (e) {
        this.showError('预览生成失败: ' + e.message);
    }
};

// 导出弹窗与保存逻辑
MarkdownCleanerApp.prototype.openExportModal = function() {
    const defaultName = this.state.currentFile ? this.state.currentFile.name.replace(/\.(md|markdown|txt)$/i, '_cleaned.md') : 'document_cleaned.md';
    this.elements.exportFileName.value = defaultName;
    this.elements.exportModal.style.display = 'block';
    this.elements.exportBackdrop.style.display = 'block';
    document.body.classList.add('modal-open');
};

MarkdownCleanerApp.prototype.closeExportModal = function() {
    this.elements.exportModal.style.display = 'none';
    this.elements.exportBackdrop.style.display = 'none';
    document.body.classList.remove('modal-open');
};

MarkdownCleanerApp.prototype.handleExportConfirm = async function() {
    try {
        const fileName = (this.elements.exportFileName.value || 'document_cleaned.md').trim();
        const mode = (document.querySelector('input[name="exportMode"]:checked')?.value) || 'picker';
        const content = this.elements.markdownEditor.value || '';
        if (!content.trim()) {
            this.showError('没有可导出的内容');
            return;
        }
        if (mode === 'picker' && window.showSaveFilePicker) {
            const handle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }]
            });
            const writable = await handle.createWritable();
            await writable.write(new Blob([content], { type: 'text/markdown;charset=utf-8' }));
            await writable.close();
            this.updateStatus(`已导出到：${handle.name}`);
        } else {
            const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 100);
            this.updateStatus(`文件已下载: ${fileName}`);
        }
    } catch (e) {
        this.showError('导出失败: ' + e.message);
    } finally {
        this.closeExportModal();
    }
};

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.markdownApp = new MarkdownCleanerApp();
});

MarkdownCleanerApp.prototype.parseOutlineFromContent = function() {
    const content = this.elements.markdownEditor.value || '';
    const lines = content.split(/\r?\n/);
    const outline = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const m = line.match(/^(#{1,2})(.*)$/);
        if (m) {
            outline.push({ level: m[1].length, text: (m[2] || '').trim(), lineStart: i });
        }
    }
    const sections = [];
    for (let idx = 0; idx < outline.length; idx++) {
        const start = outline[idx].lineStart;
        const end = (idx < outline.length - 1) ? outline[idx + 1].lineStart - 1 : lines.length - 1;
        sections.push({ heading: outline[idx].text, level: outline[idx].level, range: { start, end }, stats: {} });
    }
    return { outline, sections };
};

MarkdownCleanerApp.prototype.jumpToLine = function(lineNumber) {
    const content = this.elements.markdownEditor.value || '';
    const lines = content.split(/\r?\n/);
    const clamp = Math.max(1, Math.min(lineNumber, lines.length));
    let index = 0;
    for (let i = 0; i < clamp - 1; i++) {
        index += lines[i].length + 1; // + newline
    }
    this.elements.markdownEditor.focus();
    this.elements.markdownEditor.setSelectionRange(index, index);
    // 粗略滚动到可视区域
    this.elements.markdownEditor.scrollTop = this.elements.markdownEditor.scrollHeight * (clamp / lines.length);
};

MarkdownCleanerApp.prototype.getTypeIcon = function(type) {
    if (type === 'error') return '❌';
    if (type === 'warning') return '⚠️';
    return '✅';
};

MarkdownCleanerApp.prototype.openSettingsModal = function() {
    const s = this.state.settings || Settings.load();
    if (this.elements.settingEnableHotkeys) this.elements.settingEnableHotkeys.checked = !!(s && s.enableHotkeys);
    const mode = (s && s.diffMode) || 'token';
    const radios = document.querySelectorAll('input[name="settingDiffMode"]');
    radios.forEach(r => { r.checked = (r.value === mode); });
    if (this.elements.settingsModal) this.elements.settingsModal.style.display = 'block';
    if (this.elements.settingsBackdrop) this.elements.settingsBackdrop.style.display = 'block';
    document.body.classList.add('modal-open');
};

MarkdownCleanerApp.prototype.closeSettingsModal = function() {
    if (this.elements.settingsModal) this.elements.settingsModal.style.display = 'none';
    if (this.elements.settingsBackdrop) this.elements.settingsBackdrop.style.display = 'none';
    document.body.classList.remove('modal-open');
};

MarkdownCleanerApp.prototype.saveSettings = function() {
    const enableHotkeys = !!(this.elements.settingEnableHotkeys && this.elements.settingEnableHotkeys.checked);
    const checked = document.querySelector('input[name="settingDiffMode"]:checked');
    const diffMode = (checked && checked.value) || 'token';
    this.state.settings = Object.assign({}, this.state.settings || {}, { enableHotkeys, diffMode });
    Settings.save(this.state.settings);
    if (window.SectionNav) SectionNav.updateHotkeys(this);
    this.updateUI();
    this.updateHotkeyHint();
    this.updateStatus('设置已保存');
    this.closeSettingsModal();
};

MarkdownCleanerApp.prototype.updateHotkeyHint = function() {
    const enabled = !this.state.settings || this.state.settings.enableHotkeys;
    const tb = this.elements.editorToolbar;
    if (!tb) return;
    let el = tb.querySelector('.hotkey-hint');
    if (enabled) {
        if (!el) {
            el = document.createElement('span');
            el.className = 'hotkey-hint';
            el.textContent = 'Alt+↑/↓ 跳转板块';
            el.style.marginLeft = 'auto';
            el.style.opacity = '0.7';
            el.style.fontSize = '12px';
            tb.appendChild(el);
        }
    } else {
        if (el) el.remove();
    }
};

MarkdownCleanerApp.prototype.openExpertModal = function() {
    if (this.elements.expertModal) this.elements.expertModal.style.display = 'block';
    if (this.elements.expertBackdrop) this.elements.expertBackdrop.style.display = 'block';
    document.body.classList.add('modal-open');
};

MarkdownCleanerApp.prototype.closeExpertModal = function() {
    if (this.elements.expertModal) this.elements.expertModal.style.display = 'none';
    if (this.elements.expertBackdrop) this.elements.expertBackdrop.style.display = 'none';
    document.body.classList.remove('modal-open');
};

MarkdownCleanerApp.prototype.saveExpertRulesConfig = function() {
    try {
        const promptEl = document.getElementById('expertPrompt');
        const prompt = (promptEl && promptEl.value || '').trim();
        this.state.expertRules = { prompt };
        this.updateStatus('专家规则已保存');
    } catch (e) {
        this.showError('保存失败: ' + e.message);
    } finally {
        this.closeExpertModal();
    }
};
    MarkdownCleanerApp.prototype.openFindReplaceModal = function() {
        if (this.elements.findReplaceModal) this.elements.findReplaceModal.style.display = 'block';
        if (this.elements.findReplaceBackdrop) this.elements.findReplaceBackdrop.style.display = 'block';
        document.body.classList.add('modal-open');
    };

    MarkdownCleanerApp.prototype.closeFindReplaceModal = function() {
        if (this.elements.findReplaceModal) this.elements.findReplaceModal.style.display = 'none';
        if (this.elements.findReplaceBackdrop) this.elements.findReplaceBackdrop.style.display = 'none';
        document.body.classList.remove('modal-open');
    };

    MarkdownCleanerApp.prototype.handleReplaceAll = function() {
        const find = (this.elements.findText?.value || '').trim();
        const replace = this.elements.replaceText?.value || '';
        const cs = !!(this.elements.findCaseSensitive && this.elements.findCaseSensitive.checked);
        const useRegex = !!(this.elements.findUseRegex && this.elements.findUseRegex.checked);
        if (!find) { this.showError('请输入查找内容'); return; }
        try {
            const content = this.elements.markdownEditor.value || '';
            let out = content;
            if (useRegex) {
                const flags = cs ? 'g' : 'gi';
                const re = new RegExp(find, flags);
                out = out.replace(re, replace);
            } else {
                const src = cs ? content : content.toLowerCase();
                const needle = cs ? find : find.toLowerCase();
                if (cs) {
                    out = out.split(find).join(replace);
                } else {
                    // 大小写不敏感替换：逐次查找替换
                    let idx = 0; let buf = '';
                    while (true) {
                        const pos = src.indexOf(needle, idx);
                        if (pos === -1) { buf += content.slice(idx); break; }
                        buf += content.slice(idx, pos) + replace;
                        idx = pos + needle.length;
                    }
                    out = buf;
                }
            }
            this.state.processedContent = out;
            this.elements.markdownEditor.value = out;
            this.updateCompareView();
            this.elements.compareTab.style.display = 'block';
            this.switchTab('compare');
            this.updateUI();
            this.updateStatus('已完成替换全部');
        } catch (e) {
            this.showError('替换失败: ' + e.message);
        } finally {
            this.closeFindReplaceModal();
        }
    };

    MarkdownCleanerApp.prototype.startInteractiveReplace = function() {
        const find = (this.elements.findText?.value || '').trim();
        const replace = this.elements.replaceText?.value || '';
        const cs = !!(this.elements.findCaseSensitive && this.elements.findCaseSensitive.checked);
        const useRegex = !!(this.elements.findUseRegex && this.elements.findUseRegex.checked);
        if (!find) { this.showError('请输入查找内容'); return; }
        this.state.findReplaceSession = { find, replace, cs, useRegex, index: 0 };
        this.closeFindReplaceModal();
        this.showNextMatch();
    };

    MarkdownCleanerApp.prototype.stopInteractiveReplace = function() {
        this.state.findReplaceSession = null;
        if (this.elements.interactivePanel) this.elements.interactivePanel.style.display = 'none';
        if (this.elements.interactiveBackdrop) this.elements.interactiveBackdrop.style.display = 'none';
        document.body.classList.remove('modal-open');
        this.updateStatus('已停止逐个替换');
    };

    MarkdownCleanerApp.prototype.findNextMatch = function(start) {
        const s = this.state.findReplaceSession;
        const content = this.elements.markdownEditor.value || '';
        if (!s) return null;
        if (s.useRegex) {
            const flags = s.cs ? 'g' : 'gi';
            const re = new RegExp(s.find, flags);
            re.lastIndex = start || 0;
            const m = re.exec(content);
            if (!m) return null;
            return { start: m.index, end: m.index + m[0].length };
        } else {
            const src = s.cs ? content : content.toLowerCase();
            const needle = s.cs ? s.find : s.find.toLowerCase();
            const pos = src.indexOf(needle, start || 0);
            if (pos === -1) return null;
            return { start: pos, end: pos + needle.length };
        }
    };

    MarkdownCleanerApp.prototype.showNextMatch = function() {
        const session = this.state.findReplaceSession;
        if (!session) return;
        const content = this.elements.markdownEditor.value || '';
        const match = this.findNextMatch(session.index || 0);
        if (!match) {
            this.stopInteractiveReplace();
            this.updateStatus('未找到更多匹配');
            return;
        }
        this.elements.markdownEditor.focus();
        this.elements.markdownEditor.setSelectionRange(match.start, match.end);
        // 滚动到可视区域
        const lines = content.slice(0, match.start).split(/\r?\n/);
        const currentLine = lines.length;
        this.elements.markdownEditor.scrollTop = this.elements.markdownEditor.scrollHeight * (currentLine / content.split(/\r?\n/).length);
        // 打开面板
        if (this.elements.interactivePanel) this.elements.interactivePanel.style.display = 'block';
        if (this.elements.interactiveBackdrop) this.elements.interactiveBackdrop.style.display = 'block';
        document.body.classList.add('modal-open');
    };

    MarkdownCleanerApp.prototype.replaceCurrentMatch = function() {
        const s = this.state.findReplaceSession;
        if (!s) return;
        const content = this.elements.markdownEditor.value || '';
        const match = this.findNextMatch(s.index || 0);
        if (!match) { this.stopInteractiveReplace(); return; }
        const out = content.slice(0, match.start) + s.replace + content.slice(match.end);
        this.elements.markdownEditor.value = out;
        this.state.processedContent = out;
        // 更新起点到替换后位置
        const nextStart = match.start + s.replace.length;
        this.state.findReplaceSession.index = nextStart;
        this.showNextMatch();
    };

    MarkdownCleanerApp.prototype.skipCurrentMatch = function() {
        const s = this.state.findReplaceSession;
        if (!s) return;
        const match = this.findNextMatch(s.index || 0);
        if (!match) { this.stopInteractiveReplace(); return; }
        this.state.findReplaceSession.index = match.end;
        this.showNextMatch();
    };