import { State } from './State.js';
import { UIManager } from '../UI/UIManager.js';
import { ModalManager } from '../UI/ModalManager.js';
import { EditorManager } from '../UI/EditorManager.js';
import { FileHandler } from '../Features/FileHandler.js';
import { BasicCleaner } from '../Features/BasicCleaner.js';
import { ExpertSystem } from '../Features/ExpertSystem.js';
import { Navigation } from '../Features/Navigation.js';
import { PlanManager } from '../Features/PlanManager.js';

export class App {
    constructor() {
        this.state = new State({
            currentFile: null,
            originalContent: '',
            currentContent: '',
            processedContent: '',
            isProcessing: false,
            uiMode: 'overview',
            expertRules: { prompt: '' },
            settings: {},
            lastPlanData: null,
            lastPlanSection: null
        });

        // Initialize modules
        this.uiManager = new UIManager(this);
        this.modalManager = new ModalManager(this);
        this.editorManager = new EditorManager(this);
        this.fileHandler = new FileHandler(this);
        this.basicCleaner = new BasicCleaner(this);
        this.expertSystem = new ExpertSystem(this);
        this.navigation = new Navigation(this);
        this.planManager = new PlanManager(this);
    }

    init() {
        console.log('App initialized');
        // Clear any cached data on fresh start
        this.clearCacheIfNeeded();
        // Start in overview
        this.switchToMode('overview');
    }

    /**
     * Clear cached data if this is a fresh start
     */
    clearCacheIfNeeded() {
        // Only clear transfer-related cache to ensure clean state
        // Keep user settings and preferences
        try {
            // Clear expert draft cache that might be left from previous sessions
            localStorage.removeItem('mdCleanerDraft_expert');
            console.log('Cleared transfer cache for clean start');
        } catch (e) {
            console.warn('Failed to clear transfer cache:', e);
        }
    }

    switchToMode(mode) {
        this.state.set('uiMode', mode);
        this.uiManager.updateMode(mode);
    }

    resetContent() {
        const original = this.state.get('originalContent');
        this.editorManager.setValue(original);
        this.uiManager.updateStatus('已重置到原始内容');
    }
}
