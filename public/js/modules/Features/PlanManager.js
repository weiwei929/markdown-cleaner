import { API } from '../Utils/API.js';

export class PlanManager {
    constructor(app) {
        this.app = app;
        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.elements = {
            planContent: document.getElementById('planContent'),
            btnApplySafePlan: document.getElementById('btnApplySafePlan'),
            btnApplySuggestedPlan: document.getElementById('btnApplySuggestedPlan'),
            btnExportPlanJson: document.getElementById('btnExportPlanJson'),
            planPreviewOriginal: document.getElementById('planPreviewOriginal'),
            planPreviewProcessed: document.getElementById('planPreviewProcessed')
        };
    }

    bindEvents() {
        this.elements.btnApplySafePlan.addEventListener('click', () => this.applySafe());
        this.elements.btnApplySuggestedPlan.addEventListener('click', () => this.applySuggested());
        this.elements.btnExportPlanJson.addEventListener('click', () => this.exportPlanJson());
    }

    open(data, sec) {
        const el = this.elements.planContent;
        const title = Array(sec.level + 1).join('#') + ' ' + (sec.heading || '(空)') + ' · 行 ' + (sec.range.start + 1) + '-' + (sec.range.end + 1);
        
        let html = '';
        html += "<div class='issues-summary'>";
        html += "<div class='summary-line'><strong>修复计划</strong></div>";
        html += "<div class='summary-line'>范围：" + (data.scope === 'section' ? title : '全局') + "</div>";
        html += "<div class='summary-line'>选择优先级：" + ((data.selectedPriorities || []).join(', ') || '无') + "</div>";
        html += "<div class='summary-line'>估算：安全 " + data.estimate.safe + " · 建议 " + data.estimate.suggested + " · 警告 " + data.estimate.warning + "</div>";
        html += "</div>";
        html += "<div class='compare-content'><div class='compare-side original'><pre id='planPreviewOriginal'></pre></div><div class='compare-side processed'><pre id='planPreviewProcessed'></pre></div></div>";
        
        el.innerHTML = html;
        
        // Re-bind preview elements as they were overwritten
        this.elements.planPreviewOriginal = document.getElementById('planPreviewOriginal');
        this.elements.planPreviewProcessed = document.getElementById('planPreviewProcessed');

        this.app.state.set('lastPlanData', data);
        this.app.state.set('lastPlanSection', sec);
        
        this.app.modalManager.openModal('plan');
        this.requestPreview();
    }

    async requestPreview() {
        try {
            const content = this.app.editorManager.getValue();
            const sec = this.app.state.get('lastPlanSection');
            const plan = { 
                selectedPriorities: (this.app.state.get('lastPlanData') && this.app.state.get('lastPlanData').selectedPriorities) || ['SAFE', 'SUGGESTED'] 
            };
            
            if (sec && sec.heading !== '全局') {
                plan.sectionRange = sec.range;
            }

            const result = await API.post('/api/preview-fixes', { content, plan });
            
            const settings = this.app.state.get('settings');
            const mode = (settings && settings.diffMode) || 'token';
            
            const diff = mode === 'line' 
                ? this.renderLineDiff(result.originalSegment || '', result.processedSegment || '') 
                : this.renderTokenDiff(result.originalSegment || '', result.processedSegment || '');
            
            if (this.elements.planPreviewOriginal) this.elements.planPreviewOriginal.innerHTML = diff.originalHTML;
            if (this.elements.planPreviewProcessed) this.elements.planPreviewProcessed.innerHTML = diff.processedHTML;
            
        } catch (e) {
            this.app.uiManager.showError('预览生成失败: ' + e.message);
        }
    }

    async applySafe() {
        await this.applyFixes(['SAFE'], '已应用 SAFE 到该板块');
    }

    async applySuggested() {
        if (confirm('应用建议修复可能影响排版，确认仅对该板块应用吗？')) {
            await this.applyFixes(['SUGGESTED'], '已应用 SUGGESTED 到该板块');
        }
    }

    async applyFixes(priorities, successMessage) {
        try {
            const content = this.app.editorManager.getValue();
            const sec = this.app.state.get('lastPlanSection');
            
            if (!sec) {
                this.app.uiManager.showError('无可应用的板块范围');
                return;
            }

            const result = await API.post('/api/apply-fixes', { 
                content, 
                plan: { 
                    selectedPriorities: priorities, 
                    sectionRange: sec.range 
                } 
            });

            this.app.state.set('processedContent', result.text);
            this.app.editorManager.setValue(result.text);
            this.app.editorManager.setCompareContent(content, result.text);
            this.app.editorManager.switchTab('compare');
            
            this.app.uiManager.updateStatus(successMessage);
            this.app.modalManager.closeModal('plan');
            
        } catch (e) {
            this.app.uiManager.showError('应用失败: ' + e.message);
            this.app.modalManager.closeModal('plan');
        }
    }

    exportPlanJson() {
        try {
            const data = this.app.state.get('lastPlanData');
            const sec = this.app.state.get('lastPlanSection');
            
            if (!data || !sec) {
                this.app.uiManager.showError('无可导出的计划');
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
            
            this.app.uiManager.updateStatus('修复计划 JSON 已导出');
        } catch (e) {
            this.app.uiManager.showError('导出失败: ' + e.message);
        }
    }

    // Diff rendering helpers
    esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    renderLineDiff(orig, proc) {
        const o = (orig || '').split(/\r?\n/);
        const p = (proc || '').split(/\r?\n/);
        const m = Math.max(o.length, p.length);
        let oh = '', ph = '';
        
        for (let i = 0; i < m; i++) {
            const ol = this.esc(o[i] || '');
            const pl = this.esc(p[i] || '');
            if (ol === pl) {
                oh += ol + "\n";
                ph += pl + "\n";
            } else {
                oh += "<span class='diff-del'>" + ol + "</span>\n";
                ph += "<span class='diff-add'>" + pl + "</span>\n";
            }
        }
        return { originalHTML: oh, processedHTML: ph };
    }

    tokenize(s) {
        const out = [];
        let i = 0;
        const len = s.length;
        while (i < len) {
            const ch = s.charAt(i);
            if (/\s/.test(ch)) { out.push(ch); i++; continue; }
            if (/[\u4e00-\u9fff]/.test(ch)) { out.push(ch); i++; continue; }
            if (/[A-Za-z0-9]/.test(ch)) {
                let j = i + 1;
                while (j < len && /[A-Za-z0-9]/.test(s.charAt(j))) j++;
                out.push(s.slice(i, j));
                i = j;
                continue;
            }
            out.push(ch);
            i++;
        }
        return out;
    }

    renderTokenDiff(orig, proc) {
        const oLines = (orig || '').split(/\r?\n/);
        const pLines = (proc || '').split(/\r?\n/);
        const m = Math.max(oLines.length, pLines.length);
        let oHTML = '', pHTML = '';
        
        for (let i = 0; i < m; i++) {
            const o = oLines[i] || '';
            const p = pLines[i] || '';
            if (o === p) {
                oHTML += this.esc(o) + "\n";
                pHTML += this.esc(p) + "\n";
                continue;
            }
            
            const ot = this.tokenize(o);
            const pt = this.tokenize(p);
            let prefix = 0;
            const minLen = Math.min(ot.length, pt.length);
            while (prefix < minLen && ot[prefix] === pt[prefix]) prefix++;
            
            const oRem = ot.length - prefix;
            const pRem = pt.length - prefix;
            let suffix = 0;
            while (suffix < oRem && suffix < pRem && ot[ot.length - 1 - suffix] === pt[pt.length - 1 - suffix]) suffix++;
            
            const oMid = ot.slice(prefix, ot.length - suffix).map(this.esc).join('');
            const pMid = pt.slice(prefix, pt.length - suffix).map(this.esc).join('');
            const oStart = ot.slice(0, prefix).map(this.esc).join('');
            const oEnd = suffix ? ot.slice(ot.length - suffix).map(this.esc).join('') : '';
            const pStart = ot.slice(0, prefix).map(this.esc).join('');
            const pEnd = suffix ? pt.slice(pt.length - suffix).map(this.esc).join('') : '';
            
            const oLine = oStart + (oMid ? "<mark class='diff-del-inline'>" + oMid + "</mark>" : '') + oEnd;
            const pLine = pStart + (pMid ? "<mark class='diff-add-inline'>" + pMid + "</mark>" : '') + pEnd;
            
            oHTML += oLine + "\n";
            pHTML += pLine + "\n";
        }
        return { originalHTML: oHTML, processedHTML: pHTML };
    }
}
