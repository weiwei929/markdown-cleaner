/**
 * Markdown 文档检查器 (Linter)
 * 功能：执行规则检查，返回错误列表
 */

/**
 * 修复优先级定义
 */
const FIX_PRIORITY = {
    SAFE: {
        level: 1,
        name: '安全修复',
        icon: '✅',
        color: '#2ecc71',
        autoFix: true,
        description: '不改变文字内容，只调整格式',
        codes: ['missing-space', 'header-space', 'mixed-punc', 'indent-style']
    },
    SUGGESTED: {
        level: 2,
        name: '建议修复',
        icon: '⚠️',
        color: '#f39c12',
        autoFix: false,
        description: '可能改变文字排版，但不改变内容',
        codes: ['broken-line']
    },
    WARNING: {
        level: 3,
        name: '警告修复',
        icon: '❌',
        color: '#e74c3c',
        autoFix: false,
        description: '可能改变文字内容或含义',
        codes: []
    }
};

/**
 * 根据错误代码获取优先级
 */
function getPriorityByCode(code) {
    for (const [key, priority] of Object.entries(FIX_PRIORITY)) {
        if (priority.codes.includes(code)) {
            return { ...priority, key };
        }
    }
    return { ...FIX_PRIORITY.WARNING, key: 'WARNING' }; // 默认为警告级别
}

class MarkdownLinter {
    constructor() {
        this.rules = [
            this.checkIndent,
            this.checkHeader,
            this.checkMixedPunctuation,
            this.checkSpacing,
            this.checkBrokenLines
        ];
    }

    /**
     * 执行所有检查
     * @param {string} text - 待检查的文本
     * @returns {Object} - 包含问题列表和统计信息的对象
     */
    lint(text) {
        const lines = text.split('\n');
        let allIssues = [];

        // 单行规则检查
        lines.forEach((line, index) => {
            // 跳过代码块标记和空行
            if (line.trim() === '' || line.startsWith('```')) return;

            this.rules.forEach(rule => {
                // 跳过多行检查规则
                if (rule === this.checkBrokenLines) return;
                
                const issues = rule.call(this, line, index);
                if (issues && issues.length > 0) {
                    allIssues = allIssues.concat(issues);
                }
            });
        });

        // 多行规则检查（断行检查）
        const brokenLineIssues = this.checkBrokenLines(text);
        if (brokenLineIssues && brokenLineIssues.length > 0) {
            allIssues = allIssues.concat(brokenLineIssues);
        }

        // 为每个问题添加优先级信息
        allIssues = allIssues.map(issue => {
            const priority = getPriorityByCode(issue.code);
            return { ...issue, priority };
        });

        // 按优先级分组
        const grouped = this.groupByPriority(allIssues);

        return {
            issues: allIssues,
            grouped: grouped,
            stats: {
                total: allIssues.length,
                safe: grouped.SAFE?.length || 0,
                suggested: grouped.SUGGESTED?.length || 0,
                warning: grouped.WARNING?.length || 0
            }
        };
    }

    /**
     * 按优先级分组问题
     */
    groupByPriority(issues) {
        const grouped = {
            SAFE: [],
            SUGGESTED: [],
            WARNING: []
        };

        issues.forEach(issue => {
            const key = issue.priority.key;
            if (grouped[key]) {
                grouped[key].push(issue);
            }
        });

        return grouped;
    }

    /**
     * 规则：检查段首缩进
     * Markdown 标准通常不建议段首缩进，特别是使用全角空格
     */
    checkIndent(line, lineIndex) {
        const issues = [];
        // 检测段首的全角空格 (U+3000) 或 2个以上普通空格，且不是列表项
        const match = line.match(/^(\u3000|\s{2,})/);
        
        // 排除列表项 (- * + 1.) 和引用 (>)
        const isListOrQuote = /^(\s*[-*+>]|\s*\d+\.)/.test(line);

        if (match && !isListOrQuote) {
            issues.push({
                line: lineIndex,
                startCol: 0,
                endCol: match[0].length,
                type: 'warning',
                code: 'indent-style',
                message: '段首包含缩进（建议移除）',
                fix: {
                    type: 'delete',
                    text: ''
                }
            });
        }
        return issues;
    }

    /**
     * 规则：检查标题格式
     * 标题 # 后应该有一个空格
     */
    checkHeader(line, lineIndex) {
        const issues = [];
        const match = line.match(/^(#{1,6})([^ \n])/);
        
        if (match) {
            issues.push({
                line: lineIndex,
                startCol: 0,
                endCol: match[1].length,
                type: 'error',
                code: 'header-space',
                message: '标题 # 后缺少空格',
                fix: {
                    type: 'replace',
                    text: match[1] + ' ' + match[2]
                }
            });
        }
        return issues;
    }

    /**
     * 规则：检查中英文标点混用
     * 中文内容后紧跟英文标点
     */
    checkMixedPunctuation(line, lineIndex) {
        const issues = [];
        // 匹配中文后跟英文标点的情况
        const regex = /([\u4e00-\u9fff])([,.:;?!])/g;
        let match;

        while ((match = regex.exec(line)) !== null) {
            const puncMap = {
                ',': '，', '.': '。', ':': '：', ';': '；', '?': '？', '!': '！'
            };
            const wrongPunc = match[2];
            const correctPunc = puncMap[wrongPunc] || wrongPunc;

            issues.push({
                line: lineIndex,
                startCol: match.index + 1, // 指向标点
                endCol: match.index + 2,
                type: 'warning',
                code: 'mixed-punc',
                message: `中文后使用了英文标点 "${wrongPunc}"`,
                fix: {
                    type: 'replace',
                    text: correctPunc
                }
            });
        }
        return issues;
    }

    /**
     * 规则：检查中英文间距
     * 中文和英文/数字之间建议保留空格
     */
    checkSpacing(line, lineIndex) {
        const issues = [];
        // 中文接英文/数字
        const regex1 = /([\u4e00-\u9fff])([a-zA-Z0-9])/g;
        // 英文/数字接中文
        const regex2 = /([a-zA-Z0-9])([\u4e00-\u9fff])/g;

        let match;
        while ((match = regex1.exec(line)) !== null) {
            issues.push({
                line: lineIndex,
                startCol: match.index,
                endCol: match.index + 2,
                type: 'info',
                code: 'missing-space',
                message: '中英文之间建议添加空格',
                fix: {
                    type: 'replace',
                    text: match[1] + ' ' + match[2]
                }
            });
        }

        while ((match = regex2.exec(line)) !== null) {
            issues.push({
                line: lineIndex,
                startCol: match.index,
                endCol: match.index + 2,
                type: 'info',
                code: 'missing-space',
                message: '中英文之间建议添加空格',
                fix: {
                    type: 'replace',
                    text: match[1] + ' ' + match[2]
                }
            });
        }

        return issues;
    }

    /**
     * 规则：检查段落断行
     * 检测段落中不必要的断行（非 Markdown 块级元素的断行）
     */
    checkBrokenLines(text) {
        const issues = [];
        const lines = text.split('\n');
        
        // Markdown 块级元素特征
        const blockPattern = /^(#+ |- |\* |\d+\. |> |```|---|===|\*\*\*)/;
        
        for (let i = 0; i < lines.length - 1; i++) {
            const currentLine = lines[i].trimEnd();
            const nextLine = lines[i + 1].trimEnd();
            
            // 跳过空行
            if (!currentLine || !nextLine) continue;
            
            // 跳过块级元素
            if (blockPattern.test(currentLine) || blockPattern.test(nextLine)) continue;
            
            // 跳过代码块内容
            if (currentLine.startsWith('    ') || nextLine.startsWith('    ')) continue;
            
            // 检测断行：当前行不以句号、问号、感叹号、冒号结尾
            // 且下一行不是块级元素开始
            const endsWithPunctuation = /[。！？：.!?:]$/.test(currentLine);
            
            if (!endsWithPunctuation) {
                // 获取当前行最后一个字符和下一行第一个字符
                const lastChar = currentLine.slice(-1);
                const firstChar = nextLine.charAt(0);
                
                // 判断是否需要空格（中文不需要，英文需要）
                const isChinese = /[\u4e00-\u9fff]/.test(lastChar) && /[\u4e00-\u9fff]/.test(firstChar);
                const separator = isChinese ? '' : ' ';
                
                issues.push({
                    line: i,
                    startCol: 0,
                    endCol: currentLine.length,
                    type: 'warning',
                    code: 'broken-line',
                    message: `检测到段落断行（第 ${i + 1}-${i + 2} 行可能需要合并）`,
                    fix: {
                        type: 'merge',
                        text: currentLine + separator + nextLine,
                        affectedLines: [i, i + 1]
                    }
                });
            }
        }
        
        return issues;
    }
}

// 导出给全局使用
window.MarkdownLinter = MarkdownLinter;
window.FIX_PRIORITY = FIX_PRIORITY;
