const TextProcessor = require('../../utils/textProcessor');

function applyFixes(text, plan) {
    const tp = new TextProcessor();
    const sel = (plan && plan.selectedPriorities) || [];
    const range = plan && plan.sectionRange;
    if (range && Number.isInteger(range.start) && Number.isInteger(range.end)) {
        const lines = text.split(/\r?\n/);
        const start = Math.max(0, range.start);
        const end = Math.min(lines.length - 1, range.end);
        const before = lines.slice(0, start).join('\n');
        const segment = lines.slice(start, end + 1).join('\n');
        const after = lines.slice(end + 1).join('\n');
        let segOut = segment;
        if (sel.includes('SAFE')) {
            segOut = tp.fixMarkdownFormat(segOut);
            segOut = tp.fixSpacing(segOut);
        }
        if (sel.includes('SUGGESTED')) {
            segOut = tp.mergeBrokenLines(segOut);
            segOut = tp.oneClickQuoteFix(segOut).text;
        }
        const out = [before, segOut, after].filter(Boolean).join('\n');
        const report = tp.generateReport(text, out);
        return { text: out, report };
    } else {
        let out = text;
        if (sel.includes('SAFE')) {
            out = tp.fixMarkdownFormat(out);
            out = tp.fixSpacing(out);
        }
        if (sel.includes('SUGGESTED')) {
            out = tp.mergeBrokenLines(out);
            out = tp.oneClickQuoteFix(out).text;
        }
        const report = tp.generateReport(text, out);
        return { text: out, report };
    }
}

function previewFixes(text, plan) {
    const tp = new TextProcessor();
    const sel = (plan && plan.selectedPriorities) || [];
    const range = plan && plan.sectionRange;
    if (range && Number.isInteger(range.start) && Number.isInteger(range.end)) {
        const lines = text.split(/\r?\n/);
        const start = Math.max(0, range.start);
        const end = Math.min(lines.length - 1, range.end);
        const segment = lines.slice(start, end + 1).join('\n');
        let segOut = segment;
        if (sel.includes('SAFE')) {
            segOut = tp.fixMarkdownFormat(segOut);
            segOut = tp.fixSpacing(segOut);
        }
        if (sel.includes('SUGGESTED')) {
            segOut = tp.mergeBrokenLines(segOut);
            segOut = tp.oneClickQuoteFix(segOut).text;
        }
        return { originalSegment: segment, processedSegment: segOut };
    } else {
        let segOut = text;
        if (sel.includes('SAFE')) {
            segOut = tp.fixMarkdownFormat(segOut);
            segOut = tp.fixSpacing(segOut);
        }
        if (sel.includes('SUGGESTED')) {
            segOut = tp.mergeBrokenLines(segOut);
            segOut = tp.oneClickQuoteFix(segOut).text;
        }
        return { originalSegment: text, processedSegment: segOut };
    }
}

module.exports = { applyFixes, previewFixes };