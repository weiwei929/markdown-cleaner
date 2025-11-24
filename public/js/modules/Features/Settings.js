export class Settings {
    constructor(app) {
        this.app = app;
        this.defaultSettings = { enableHotkeys: false, diffMode: 'token', mode: 'basic' };
        this.initElements();
        this.bindEvents();
        this.load();
    }

    initElements() {
        this.elements = {
            settingsBtn: document.getElementById('settingsBtn'),
            saveSettingsBtn: document.getElementById('saveSettingsBtn'),
            settingEnableHotkeys: document.getElementById('settingEnableHotkeys'),
            settingDiffMode: document.getElementsByName('settingDiffMode')
        };
    }

    bindEvents() {
        this.elements.settingsBtn.addEventListener('click', () => {
            this.loadToUI();
            this.app.modalManager.openModal('settings');
        });

        this.elements.saveSettingsBtn.addEventListener('click', () => {
            this.saveFromUI();
            this.app.modalManager.closeModal('settings');
            this.app.uiManager.updateStatus('设置已保存');
        });
    }

    load() {
        try {
            const s = localStorage.getItem('mdCleanerSettings');
            const settings = s ? { ...this.defaultSettings, ...JSON.parse(s) } : { ...this.defaultSettings };
            this.app.state.set('settings', settings);
            return settings;
        } catch (e) {
            return { ...this.defaultSettings };
        }
    }

    save(settings) {
        try {
            localStorage.setItem('mdCleanerSettings', JSON.stringify(settings || {}));
            this.app.state.set('settings', settings);
        } catch (e) {
            console.error('Failed to save settings', e);
        }
    }

    loadToUI() {
        const settings = this.app.state.get('settings') || this.load();
        if (this.elements.settingEnableHotkeys) {
            this.elements.settingEnableHotkeys.checked = settings.enableHotkeys;
        }
        if (this.elements.settingDiffMode) {
            for (const radio of this.elements.settingDiffMode) {
                if (radio.value === settings.diffMode) radio.checked = true;
            }
        }
    }

    saveFromUI() {
        const settings = { ...this.app.state.get('settings') };
        if (this.elements.settingEnableHotkeys) {
            settings.enableHotkeys = this.elements.settingEnableHotkeys.checked;
        }
        if (this.elements.settingDiffMode) {
            for (const radio of this.elements.settingDiffMode) {
                if (radio.checked) settings.diffMode = radio.value;
            }
        }
        this.save(settings);
        
        // Trigger hotkey update if needed
        if (this.app.navigation) {
            this.app.navigation.updateHotkeys();
        }
    }
}
