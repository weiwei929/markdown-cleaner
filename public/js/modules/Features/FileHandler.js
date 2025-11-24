export class FileHandler {
    constructor(app) {
        this.app = app;
        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.elements = {
            fileInput: document.getElementById('fileInput'),
            uploadArea: document.getElementById('uploadArea'),
            fileInfo: document.getElementById('fileInfo'),
            fileName: document.getElementById('fileName'),
            clearFileBtn: document.getElementById('clearFile'),
            exportBtn: document.getElementById('exportBtn'),
            confirmExportBtn: document.getElementById('confirmExport'),
            exportFileName: document.getElementById('exportFileName')
        };
    }

    bindEvents() {
        // Upload Area
        this.elements.uploadArea.addEventListener('click', () => this.elements.fileInput.click());
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
            const file = e.dataTransfer.files[0];
            if (file) this.handleFileSelect(file);
        });

        // File Input
        this.elements.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleFileSelect(file);
        });

        // Clear File
        this.elements.clearFileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.clearFile();
        });

        // Export
        this.elements.exportBtn.addEventListener('click', () => {
            this.app.modalManager.openModal('export');
            // Set default filename
            const currentFile = this.app.state.get('currentFile');
            if (currentFile) {
                const name = currentFile.name.replace(/\.(md|markdown|txt)$/i, '_cleaned.md');
                this.elements.exportFileName.value = name;
            } else {
                this.elements.exportFileName.value = 'document_cleaned.md';
            }
        });

        this.elements.confirmExportBtn.addEventListener('click', () => this.exportFile());
    }

    handleFileSelect(file) {
        if (!file.name.match(/\.(md|markdown|txt)$/i)) {
            this.app.uiManager.showError('请选择 Markdown 或文本文件 (.md, .markdown, .txt)');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            this.app.state.set('currentFile', file);
            this.app.state.set('originalContent', content);
            this.app.state.set('currentContent', content);
            
            // Update UI
            this.elements.fileName.textContent = file.name;
            this.elements.uploadArea.style.display = 'none';
            this.elements.fileInfo.style.display = 'flex';
            
            // Update Editor
            this.app.editorManager.setValue(content);
            this.app.editorManager.switchTab('edit');
            
            // Enable buttons
            this.app.uiManager.elements.processBtn.disabled = false;
            this.app.uiManager.elements.analyzeBtn.disabled = false;
            this.app.uiManager.elements.expertRulesBtn.disabled = false;
            this.app.uiManager.elements.expertRunBtn.disabled = false;
            this.app.uiManager.elements.findReplaceBtn.disabled = false;
            this.app.uiManager.elements.exportBtn.disabled = false;

            this.app.uiManager.updateStatus('文件已加载');
        };
        reader.readAsText(file);
    }

    clearFile() {
        this.elements.fileInput.value = '';
        this.app.state.set('currentFile', null);
        this.app.state.set('originalContent', '');
        this.app.state.set('currentContent', '');
        
        this.elements.uploadArea.style.display = 'flex';
        this.elements.fileInfo.style.display = 'none';
        
        this.app.editorManager.setValue('');
        
        // Disable buttons
        this.app.uiManager.elements.processBtn.disabled = true;
        this.app.uiManager.elements.analyzeBtn.disabled = true;
        this.app.uiManager.elements.expertRulesBtn.disabled = true;
        this.app.uiManager.elements.expertRunBtn.disabled = true;
        this.app.uiManager.elements.findReplaceBtn.disabled = true;
        this.app.uiManager.elements.exportBtn.disabled = true;

        this.app.uiManager.updateStatus('准备就绪');
    }

    exportFile() {
        const content = this.app.editorManager.getValue();
        const filename = this.elements.exportFileName.value || 'document.md';
        const mode = document.querySelector('input[name="exportMode"]:checked').value;

        if (mode === 'picker' && window.showSaveFilePicker) {
            this.saveWithPicker(content, filename);
        } else {
            this.downloadFile(content, filename);
        }
        
        this.app.modalManager.closeModal('export');
    }

    async saveWithPicker(content, filename) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: 'Markdown File',
                    accept: { 'text/markdown': ['.md'] },
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();
            this.app.uiManager.updateStatus('文件已保存');
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error(err);
                this.downloadFile(content, filename); // Fallback
            }
        }
    }

    downloadFile(content, filename) {
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.app.uiManager.updateStatus('文件已下载');
    }
}
