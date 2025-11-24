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

    // Simplified jump logic for now, as we might not have structure analysis yet
    // Ideally this should use the analysis result
    jumpPrev() {
        // TODO: Implement using analysis data
        console.log('Jump Prev not fully implemented');
    }

    jumpNext() {
        // TODO: Implement using analysis data
        console.log('Jump Next not fully implemented');
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
