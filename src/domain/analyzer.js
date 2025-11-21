function getPriorityByCode(code) {
    const FIX_PRIORITY = {
        SAFE: { level: 1, key: 'SAFE', codes: ['missing-space', 'header-space', 'mixed-punc', 'indent-style'] },
        SUGGESTED: { level: 2, key: 'SUGGESTED', codes: ['broken-line'] },
        WARNING: { level: 3, key: 'WARNING', codes: [] }
    };
    for (const k of Object.keys(FIX_PRIORITY)) {
        if (FIX_PRIORITY[k].codes.includes(code)) return FIX_PRIORITY[k];
    }
    return { level: 3, key: 'WARNING', codes: [] };
}

function checkIndent(line, lineIndex) {
    const issues = [];
    const match = line.match(/^(\u3000|\s{2,})/);
    const isListOrQuote = /^(\s*[-*+>]|\s*\d+\.)/.test(line);
    if (match && !isListOrQuote) {
        issues.push({ line: lineIndex, startCol: 0, endCol: match[0].length, type: 'warning', code: 'indent-style', message: '段首包含缩进（建议移除）' });
    }
    return issues;
}

function checkHeader(line, lineIndex) {
    const issues = [];
    const match = line.match(/^(#{1,6})([^ \n])/);
    if (match) {
        issues.push({ line: lineIndex, startCol: 0, endCol: match[1].length, type: 'error', code: 'header-space', message: '标题 # 后缺少空格' });
    }
    return issues;
}

function checkMixedPunctuation(line, lineIndex) {
    const issues = [];
    const sanitized = line.replace(/`[^`]*`/g, '');
    const regex = /([\u4e00-\u9fff])([,.:;?!])/g;
    let match;
    const puncMap = { ',': '，', '.': '。', ':': '：', ';': '；', '?': '？', '!': '！' };
    while ((match = regex.exec(sanitized)) !== null) {
        const wrongPunc = match[2];
        const correctPunc = puncMap[wrongPunc] || wrongPunc;
        issues.push({ line: lineIndex, startCol: match.index + 1, endCol: match.index + 2, type: 'warning', code: 'mixed-punc', message: `中文后使用了英文标点 "${wrongPunc}"`, fix: { type: 'replace', text: correctPunc } });
    }
    return issues;
}

function checkSpacing(line, lineIndex) {
    const issues = [];
    const sanitized = line.replace(/`[^`]*`/g, '');
    const regex1 = /([\u4e00-\u9fff])([a-zA-Z0-9])/g;
    const regex2 = /([a-zA-Z0-9])([\u4e00-\u9fff])/g;
    let match;
    while ((match = regex1.exec(sanitized)) !== null) {
        issues.push({ line: lineIndex, startCol: match.index, endCol: match.index + 2, type: 'info', code: 'missing-space', message: '中英文之间建议添加空格', fix: { type: 'replace', text: match[1] + ' ' + match[2] } });
    }
    while ((match = regex2.exec(sanitized)) !== null) {
        issues.push({ line: lineIndex, startCol: match.index, endCol: match.index + 2, type: 'info', code: 'missing-space', message: '中英文之间建议添加空格', fix: { type: 'replace', text: match[1] + ' ' + match[2] } });
    }
    return issues;
}

function checkBrokenLines(text) {
    const issues = [];
    const lines = text.split('\n');
    const headingOrBlock = /^(#{1,6})(?:\s|$)|^\s*(?:[-*+]\s|\d+\.\s|>)|^\s*```/;
    const hrPattern = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;
    let inCode = false;
    for (let i = 0; i < lines.length - 1; i++) {
        const currentLine = lines[i].trimEnd();
        const nextLine = lines[i + 1].trimEnd();
        if (!currentLine || !nextLine) continue;
        if (/^\s*```/.test(currentLine)) { inCode = !inCode; continue; }
        if (/^\s*```/.test(nextLine)) { /* lookahead handled below */ }
        if (inCode) continue;
        if (headingOrBlock.test(currentLine) || headingOrBlock.test(nextLine)) continue;
        if (hrPattern.test(currentLine) || hrPattern.test(nextLine)) continue;
        if (currentLine.startsWith('    ') || nextLine.startsWith('    ')) continue;
        const endsWithPunctuation = /[。！？：.!?:]$/.test(currentLine);
        if (!endsWithPunctuation) {
            const lastChar = currentLine.slice(-1);
            const firstChar = nextLine.charAt(0);
            const isChinese = /[\u4e00-\u9fff]/.test(lastChar) && /[\u4e00-\u9fff]/.test(firstChar);
            const separator = isChinese ? '' : ' ';
            issues.push({ line: i, startCol: 0, endCol: currentLine.length, type: 'warning', code: 'broken-line', message: `检测到段落断行（第 ${i + 1}-${i + 2} 行可能需要合并）`, fix: { type: 'merge', text: currentLine + separator + nextLine, affectedLines: [i, i + 1] } });
        }
    }
    return issues;
}

function groupByPriority(issues) {
    const grouped = { SAFE: [], SUGGESTED: [], WARNING: [] };
    for (const issue of issues) {
        const p = getPriorityByCode(issue.code);
        const withP = { ...issue, priority: p };
        grouped[p.key].push(withP);
    }
    return grouped;
}

function analyze(text) {
    const lines = text.split('\n');
    let all = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() === '') continue;
        all = all.concat(checkIndent(line, i));
        // 标题空格提示按需求取消，不再检查
        all = all.concat(checkMixedPunctuation(line, i));
        all = all.concat(checkSpacing(line, i));
    }
    const bl = checkBrokenLines(text);
    all = all.concat(bl);
    const grouped = groupByPriority(all);
    const structure = analyzeStructured(text);
    return { issues: Object.values(grouped).flat(), grouped, stats: { total: all.length, safe: grouped.SAFE.length, suggested: grouped.SUGGESTED.length, warning: grouped.WARNING.length }, structure };
}

function parseOutline(text) {
    const lines = text.split('\n');
    const outline = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const m = line.match(/^(#{1,2})(.*)$/); // 仅识别 # 与 ## 行首标题（可无空格）
        if (m) {
            const level = m[1].length;
            const content = (m[2] || '').trim();
            outline.push({ level, text: content, lineStart: i });
        }
    }
    // 生成区块范围
    const sections = [];
    for (let idx = 0; idx < outline.length; idx++) {
        const start = outline[idx].lineStart;
        const end = (idx < outline.length - 1) ? outline[idx + 1].lineStart - 1 : lines.length - 1;
        sections.push({ heading: outline[idx].text, level: outline[idx].level, range: { start, end } });
    }
    return { outline, sections };
}

function analyzeStructured(text) {
    const { outline, sections } = parseOutline(text);
    const lines = text.split('\n');
    const sectionReports = sections.map(sec => {
        let issues = [];
        for (let i = sec.range.start + 1; i <= sec.range.end; i++) { // 排除标题行
            const line = lines[i] || '';
            if (line.trim() === '') continue;
            issues = issues.concat(checkIndent(line, i));
            issues = issues.concat(checkMixedPunctuation(line, i));
            issues = issues.concat(checkSpacing(line, i));
        }
        // 断行合并建议（仅该区间）
        const textSlice = lines.slice(sec.range.start + 1, sec.range.end + 1).join('\n');
        const blLocal = checkBrokenLines(textSlice).map(it => ({ ...it, line: it.line + sec.range.start + 1 }));
        issues = issues.concat(blLocal);
        const grouped = groupByPriority(issues);
        return {
            heading: sec.heading,
            level: sec.level,
            range: sec.range,
            stats: { total: issues.length, safe: grouped.SAFE.length, suggested: grouped.SUGGESTED.length, warning: grouped.WARNING.length },
            sampleIssues: issues.slice(0, 10)
        };
    });
    return { outline, sections: sectionReports };
}

module.exports = { analyze, analyzeStructured, parseOutline };