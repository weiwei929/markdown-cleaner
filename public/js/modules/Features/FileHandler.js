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
        // 文件大小限制（5MB）
        const MAX_FILE_SIZE = 5 * 1024 * 1024;
        
        // 检查文件大小
        if (file.size > MAX_FILE_SIZE) {
            const sizeMB = (file.size / 1024 / 1024).toFixed(2);
            this.app.uiManager.showError(`文件过大 (${sizeMB}MB)，最大支持 ${MAX_FILE_SIZE / 1024 / 1024}MB。请压缩文件或分割成多个小文件。`);
            return;
        }
        
        // 检查文件格式
        const allowedExtensions = ['.md', '.markdown', '.txt'];
        const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        
        if (!allowedExtensions.includes(fileExt)) {
            this.app.uiManager.showError(`不支持的文件格式: ${fileExt || '未知格式'}。<br>只支持以下格式: ${allowedExtensions.join(', ')}`);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            this.app.state.set('currentFile', file);
            this.app.state.set('originalContent', content);
            this.app.state.set('currentContent', content);
            this.app.state.set('processedContent', ''); // 清除之前的处理结果
            
            // Update UI
            const displayName = this.truncateFileName(file.name, 20);
            this.elements.fileName.textContent = displayName;
            this.elements.fileName.title = file.name; // 鼠标悬停显示完整文件名
            this.elements.uploadArea.style.display = 'none';
            this.elements.fileInfo.style.display = 'flex';
            
            // 隐藏转入专家版按钮（新文件加载时）
            const transferBtn = document.getElementById('transferToExpertBtn');
            if (transferBtn) {
                transferBtn.style.display = 'none';
            }
            
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
            
            // 恢复修复选项按钮状态
            const optionsBtn = document.getElementById('optionsBtn');
            if (optionsBtn) {
                optionsBtn.disabled = false;
            }

            this.app.uiManager.updateStatus('文件已加载');
        };
        reader.readAsText(file);
    }

    clearFile() {
        this.elements.fileInput.value = '';
        this.app.state.set('currentFile', null);
        this.app.state.set('originalContent', '');
        this.app.state.set('currentContent', '');
        this.app.state.set('processedContent', ''); // 清除处理后的内容
        
        // 重置文件名显示和title
        this.elements.fileName.textContent = '未选择文件';
        this.elements.fileName.title = '';
        
        this.elements.uploadArea.style.display = 'flex';
        this.elements.fileInfo.style.display = 'none';
        
        this.app.editorManager.setValue('');
        
        // 隐藏转入专家版按钮
        const transferBtn = document.getElementById('transferToExpertBtn');
        if (transferBtn) {
            transferBtn.style.display = 'none';
        }
        
        // Disable buttons
        this.app.uiManager.elements.processBtn.disabled = true;
        this.app.uiManager.elements.analyzeBtn.disabled = true;
        this.app.uiManager.elements.expertRulesBtn.disabled = true;
        this.app.uiManager.elements.expertRunBtn.disabled = true;
        this.app.uiManager.elements.findReplaceBtn.disabled = true;
        this.app.uiManager.elements.exportBtn.disabled = true;
        
        // 恢复修复选项按钮状态
        const optionsBtn = document.getElementById('optionsBtn');
        if (optionsBtn) {
            optionsBtn.disabled = false;
        }

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

    /**
     * 截断文件名以适应显示区域
     * @param {string} filename - 完整文件名
     * @param {number} maxLength - 最大显示字符数
     * @returns {string} 截断后的文件名
     */
    truncateFileName(filename, maxLength = 20) {
        if (!filename || filename.length <= maxLength) {
            return filename;
        }
        
        // 保留扩展名
        const lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex > 0) {
            const name = filename.substring(0, lastDotIndex);
            const ext = filename.substring(lastDotIndex);
            
            // 如果文件名（不含扩展名）超过最大长度
            if (name.length > maxLength) {
                return name.substring(0, maxLength - 3) + '...' + ext;
            }
        }
        
        // 如果没有扩展名或整体长度不够
        return filename.substring(0, maxLength - 3) + '...';
    }
}
