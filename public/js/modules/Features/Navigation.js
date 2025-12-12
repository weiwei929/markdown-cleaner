export class Navigation {
    constructor(app) {
        this.app = app;
        this.bindEvents();
    }

    bindEvents() {
        // Hotkeys are bound via updateHotkeys called by Settings or init
        this.updateHotkeys();
        
        // Subscribe to settings changes
        this.app.state.subscribe('settings', () => this.updateHotkeys());
    }

    jumpToLine(line) {
        const editor = this.app.editorManager.elements.editor;
        const content = editor.value || '';
        const lines = content.split(/\r?\n/);
        const clamp = Math.max(1, Math.min(line, lines.length));
        
        let idx = 0;
        for (let i = 0; i < clamp - 1; i++) {
            idx += lines[i].length + 1; // +1 for newline
        }
        
        editor.focus();
        editor.setSelectionRange(idx, idx);
        editor.scrollTop = editor.scrollHeight * (clamp / lines.length);
    }

    getCurrentLineIndex() {
        const editor = this.app.editorManager.elements.editor;
        const pos = editor.selectionStart || 0;
        const text = editor.value || '';
        let count = 0;
        for (let i = 0; i < pos; i++) {
            if (text.charAt(i) === '\n') count++;
        }
        return count;
    }

    /**
     * 跳转到上一个问题（基于分析结果）
     * 当前实现：暂时禁用，等待分析数据支持
     */
    jumpPrev() {
        // 功能暂未实现：需要从 state 获取分析结果
        // 未来实现：从 this.app.state.get('lastAnalysis') 获取问题列表，跳转到上一个问题
        this.app.uiManager.updateStatus('跳转功能暂未实现，请使用"检查与建议"功能查看问题');
    }

    /**
     * 跳转到下一个问题（基于分析结果）
     * 当前实现：暂时禁用，等待分析数据支持
     */
    jumpNext() {
        // 功能暂未实现：需要从 state 获取分析结果
        // 未来实现：从 this.app.state.get('lastAnalysis') 获取问题列表，跳转到下一个问题
        this.app.uiManager.updateStatus('跳转功能暂未实现，请使用"检查与建议"功能查看问题');
    }

    updateHotkeys() {
        const settings = this.app.state.get('settings');
        const enabled = !settings || settings.enableHotkeys;
        
        if (enabled && !this._navKeysBound) {
            this._navKeyHandler = (e) => {
                if (e.altKey && e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.jumpPrev();
                }
                if (e.altKey && e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.jumpNext();
                }
            };
            document.addEventListener('keydown', this._navKeyHandler);
            this._navKeysBound = true;
        } else if (!enabled && this._navKeysBound) {
            document.removeEventListener('keydown', this._navKeyHandler);
            this._navKeysBound = false;
            this._navKeyHandler = null;
        }
    }
}
