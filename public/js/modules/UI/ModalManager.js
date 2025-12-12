export class ModalManager {
    constructor(app) {
        this.app = app;
        this.modals = {
            export: document.getElementById('exportModal'),
            settings: document.getElementById('settingsModal'),
            expert: document.getElementById('expertModal'),
            findReplace: document.getElementById('findReplaceModal'),
            return: document.getElementById('returnModal'),
            issues: document.getElementById('issuesPanel'),
            interactive: document.getElementById('interactivePanel'),
            plan: document.getElementById('planModal'),
            options: document.getElementById('optionsModal')
        };
        
        this.backdrops = {
            export: document.getElementById('exportBackdrop'),
            settings: document.getElementById('settingsBackdrop'),
            expert: document.getElementById('expertBackdrop'),
            findReplace: document.getElementById('findReplaceBackdrop'),
            return: document.getElementById('returnBackdrop'),
            issues: document.getElementById('issuesBackdrop'),
            interactive: document.getElementById('interactiveBackdrop'),
            plan: document.getElementById('planBackdrop'),
            options: document.getElementById('optionsBackdrop')
        };

        this.bindEvents();
    }

    bindEvents() {
        // Close buttons
        document.querySelectorAll('.btn-close-panel').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.target.closest('.modal-panel, .issues-panel').id;
                this.closeModalById(modalId);
            });
        });

        // Cancel buttons
        const cancelMap = {
            'cancelExport': 'exportModal',
            'cancelSettingsBtn': 'settingsModal',
            'cancelExpertRules': 'expertModal',
            'cancelFindReplace': 'findReplaceModal',
            'btnReturnCancel': 'returnModal',
            'cancelOptions': 'optionsModal'
        };

        for (const [btnId, modalId] of Object.entries(cancelMap)) {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', () => this.closeModalById(modalId));
            }
        }
    }

    openModal(name) {
        if (this.modals[name]) {
            this.modals[name].style.display = 'block';
        }
        if (this.backdrops[name]) {
            this.backdrops[name].style.display = 'block';
        }
    }

    closeModal(name) {
        if (this.modals[name]) {
            this.modals[name].style.display = 'none';
        }
        if (this.backdrops[name]) {
            this.backdrops[name].style.display = 'none';
        }
    }

    closeModalById(modalId) {
        // Map ID to name
        for (const [name, element] of Object.entries(this.modals)) {
            if (element.id === modalId) {
                this.closeModal(name);
                return;
            }
        }
    }
}
