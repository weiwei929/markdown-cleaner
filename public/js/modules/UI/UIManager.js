export class UIManager {
    constructor(app) {
        this.app = app;
        this.initElements();
        this.bindEvents();
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
            exportBtn: document.getElementById('exportBtn'),
            expertRulesBtn: document.getElementById('expertRulesBtn'),
            expertRunBtn: document.getElementById('expertRunBtn'),
            findReplaceBtn: document.getElementById('findReplaceBtn'),
            settingsBtn: document.getElementById('settingsBtn'),

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
        }
    }

    updateControls(mode) {
        // Show/Hide buttons based on mode
        const isBasic = mode === 'basic';
        
        // Basic mode buttons
        this.elements.processBtn.style.display = isBasic ? 'block' : 'none';
        
        // Expert mode buttons
        this.elements.analyzeBtn.style.display = !isBasic ? 'block' : 'none';
        this.elements.expertRulesBtn.style.display = !isBasic ? 'block' : 'none';
        this.elements.expertRunBtn.style.display = !isBasic ? 'block' : 'none';
        this.elements.findReplaceBtn.style.display = !isBasic ? 'block' : 'none';
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
