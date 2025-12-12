export class UIManager {
    constructor(app) {
        this.app = app;
        this.initElements();
        this.bindEvents();

        // React to content changes so users can paste text without uploading a file
        this.app.state.subscribe('currentContent', () => this.updateControlState());
        this.app.state.subscribe('uiMode', () => this.updateControlState());
    }

    initElements() {
        this.elements = {
            overviewPane: document.getElementById('overviewPane'),
            mainContent: document.getElementById('mainContent'),
            modeBar: document.getElementById('modeBar'),
            modeText: document.getElementById('modeText'),
            backToOverviewBtn: document.getElementById('backToOverviewBtn'),
            cardBasic: document.getElementById('cardBasic'),
            cardExpert: document.getElementById('cardExpert'),
            
            // Control Panel Buttons
            analyzeBtn: document.getElementById('analyzeBtn'),
            processBtn: document.getElementById('processBtn'),
            transferToExpertBtn: document.getElementById('transferToExpertBtn'),
            exportBtn: document.getElementById('exportBtn'),
            expertRulesBtn: document.getElementById('expertRulesBtn'),
            expertRunBtn: document.getElementById('expertRunBtn'),
            findReplaceBtn: document.getElementById('findReplaceBtn'),

            // Status
            statusSection: document.getElementById('statusSection'),
            statusText: document.getElementById('statusText'),
        };
    }

    bindEvents() {
        if (this.elements.cardBasic) {
            this.elements.cardBasic.addEventListener('click', () => this.app.switchToMode('basic'));
        }
        if (this.elements.cardExpert) {
            this.elements.cardExpert.addEventListener('click', () => this.app.switchToMode('expert'));
        }
        if (this.elements.backToOverviewBtn) {
            this.elements.backToOverviewBtn.addEventListener('click', () => this.app.switchToMode('overview'));
        }
    }

    updateMode(mode) {
        // Apply theme classes to body
        document.body.classList.remove('mode-basic', 'mode-expert', 'mode-overview');
        document.body.classList.add('mode-' + mode);

        if (mode === 'overview') {
            this.elements.overviewPane.style.display = 'block';
            this.elements.mainContent.style.display = 'none';
            this.elements.modeBar.style.display = 'none';
        } else {
            this.elements.overviewPane.style.display = 'none';
            this.elements.mainContent.style.display = 'flex';
            this.elements.modeBar.style.display = 'flex';
            
            const modeName = mode === 'basic' ? '基础版' : 'AI 专家版';
            this.elements.modeText.textContent = `当前模式：${modeName}`;
            
            this.updateControls(mode);
            this.updateControlState();
        }
    }

    updateControls(mode) {
        // Show/Hide buttons based on mode
        const isBasic = mode === 'basic';
        
        // Basic mode buttons
        this.elements.processBtn.style.display = isBasic ? 'block' : 'none';
        this.elements.transferToExpertBtn.style.display = (isBasic && this.elements.transferToExpertBtn.style.display !== 'none') ? 'block' : 'none';
        // 检查与建议按钮在基础版和专家版都显示
        this.elements.analyzeBtn.style.display = 'block';
        // 修复选项按钮在基础版显示
        const optionsBtn = document.getElementById('optionsBtn');
        if (optionsBtn) {
            optionsBtn.style.display = isBasic ? 'block' : 'none';
        }
        
        // Expert mode buttons (only shown in expert mode)
        this.elements.expertRulesBtn.style.display = !isBasic ? 'block' : 'none';
        this.elements.expertRunBtn.style.display = !isBasic ? 'block' : 'none';
        this.elements.findReplaceBtn.style.display = !isBasic ? 'block' : 'none';
    }

    /**
     * Enable/disable controls based on whether there's content.
     * This allows "paste and run" workflows without file upload.
     */
    updateControlState() {
        const mode = this.app.state.get('uiMode');
        if (!mode || mode === 'overview') return;

        const content = (this.app.state.get('currentContent') || '').trim();
        const hasContent = content.length > 0;

        // Basic
        if (this.elements.processBtn) this.elements.processBtn.disabled = !hasContent;

        // Expert
        if (this.elements.analyzeBtn) this.elements.analyzeBtn.disabled = !hasContent;
        if (this.elements.expertRulesBtn) this.elements.expertRulesBtn.disabled = !hasContent;
        if (this.elements.expertRunBtn) this.elements.expertRunBtn.disabled = !hasContent;
        if (this.elements.findReplaceBtn) this.elements.findReplaceBtn.disabled = !hasContent;

        // Export is allowed if there is any content in editor
        if (this.elements.exportBtn) this.elements.exportBtn.disabled = !hasContent;
    }

    updateStatus(message) {
        if (this.elements.statusSection) {
            this.elements.statusSection.style.display = 'block';
            this.elements.statusText.textContent = message;
        }
    }

    showError(message) {
        alert(message); // Simple alert for now, can be improved
    }
}
