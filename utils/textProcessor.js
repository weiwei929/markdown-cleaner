/**
 * MarkDown 文档文本处理器
 * 功能：格式修复、标点规范、繁简转换
 */

class TextProcessor {
    constructor() {
        // 初始化繁简转换库（使用 opencc-js 的浏览器版本）
        this.opencc = null;
        this.initOpenCC();
    }

    /**
     * 初始化 OpenCC 转换器
     */
    async initOpenCC() {
        try {
            // 在服务器端使用 opencc-js
            const OpenCC = require('opencc-js');
            this.opencc = OpenCC.Converter({ from: 'hk', to: 'cn' });
        } catch (error) {
            console.warn('OpenCC 初始化失败，繁简转换功能将被禁用:', error.message);
        }
    }

    /**
     * 主要文本处理入口
     * @param {string} text - 原始文本
     * @param {object} options - 处理选项
     * @returns {Promise<string>} - 处理后的文本
     */
    async processText(text, options = {}) {
        let processedText = text;

        try {
            // 1. 格式修复
            if (options.fixFormat !== false) {
                processedText = this.fixMarkdownFormat(processedText);
            }

            // 2. 标点符号规范化
            if (options.fixPunctuation !== false) {
                processedText = this.normalizePunctuation(processedText);
            }

            // 3. 繁简转换
            if (options.convertTraditional !== false && this.opencc) {
                processedText = this.convertTraditionalToChinese(processedText);
            }

            return processedText;
        } catch (error) {
            console.error('文本处理错误:', error);
            throw new Error(`文本处理失败: ${error.message}`);
        }
    }

    /**
     * 修复 Markdown 格式
     * @param {string} text - 输入文本
     * @returns {string} - 格式修复后的文本
     */
    fixMarkdownFormat(text) {
        let lines = text.split('\n');
        let processedLines = [];
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            let prevLine = i > 0 ? lines[i - 1] : '';
            let nextLine = i < lines.length - 1 ? lines[i + 1] : '';
            
            // 修复标题格式
            line = this.fixHeadings(line, prevLine, nextLine, processedLines);
            
            // 修复列表格式
            line = this.fixLists(line);
            
            // 修复代码块格式
            line = this.fixCodeBlocks(line, prevLine, nextLine);
            
            processedLines.push(line);
        }
        
        // 去除多余的空行，但保留必要的空行
        return this.normalizeEmptyLines(processedLines.join('\n'));
    }

    /**
     * 修复标题格式
     */
    fixHeadings(line, prevLine, nextLine, processedLines) {
        const headingPattern = /^(#{1,6})\s*(.*)/;
        const match = line.match(headingPattern);
        
        if (match) {
            const level = match[1];
            const content = match[2].trim();
            
            // 确保标题前后有空行
            if (prevLine.trim() !== '' && processedLines.length > 0) {
                // 检查前一行不是空行，则在标题前添加空行
                if (processedLines[processedLines.length - 1] !== '') {
                    processedLines.push('');
                }
            }
            
            // 标准化标题格式：# + 空格 + 内容
            return `${level} ${content}`;
        }
        
        return line;
    }

    /**
     * 修复列表格式
     */
    fixLists(line) {
        // 修复无序列表
        line = line.replace(/^(\s*)[-*+]\s*(.+)$/, '$1- $2');
        
        // 修复有序列表
        line = line.replace(/^(\s*)(\d+)\.\s*(.+)$/, '$1$2. $3');
        
        // 修复嵌套列表的缩进（统一为2个空格）
        line = line.replace(/^(\s{4,})([-*+]|\d+\.)\s*(.+)$/, (match, indent, marker, content) => {
            const level = Math.floor(indent.length / 4) + 1;
            const newIndent = '  '.repeat(level);
            return `${newIndent}${marker} ${content}`;
        });
        
        return line;
    }

    /**
     * 修复代码块格式
     */
    fixCodeBlocks(line, prevLine, nextLine) {
        // 修复代码块的反引号格式
        if (line.match(/^`{3,}/)) {
            // 确保代码块前后有空行
            return line;
        }
        
        // 修复行内代码格式，确保反引号前后不要多余空格
        line = line.replace(/`\s+([^`]+)\s+`/g, '`$1`');
        
        return line;
    }

    /**
     * 规范化标点符号
     * @param {string} text - 输入文本
     * @returns {string} - 标点规范后的文本
     */
    normalizePunctuation(text) {
        // 中文标点符号映射表
        const chinesePunctuation = {
            ',': '，',
            '.': '。',
            '!': '！',
            '?': '？',
            ':': '：',
            ';': '；',
            '(': '（',
            ')': '）',
            '【': '[',
            '】': ']',
            '"': '"',
            "'": "'"
        };

        // 英文标点符号映射表
        const englishPunctuation = {
            '，': ',',
            '。': '.',
            '！': '!',
            '？': '?',
            '：': ':',
            '；': ';',
            '（': '(',
            '）': ')',
            '【': '[',
            '】': ']',
            '"': '"',
            "'": "'"
        };

        let lines = text.split('\n');
        let processedLines = [];

        for (let line of lines) {
            // 跳过代码块和行内代码
            if (line.match(/^```/) || line.match(/^\s*`[^`]+`\s*$/) || line.match(/^\s{4,}/)) {
                processedLines.push(line);
                continue;
            }

            let processedLine = line;

            // 检测行内是否包含中文
            const hasChinese = /[\u4e00-\u9fff]/.test(line);
            
            // 检测行内是否包含英文单词
            const hasEnglish = /[a-zA-Z]+/.test(line);

            if (hasChinese && hasEnglish) {
                // 中英文混合，智能处理
                processedLine = this.smartPunctuationFix(line);
            } else if (hasChinese) {
                // 纯中文或主要是中文，使用中文标点（但跳过引号处理）
                for (let [eng, chn] of Object.entries(chinesePunctuation)) {
                    // 避免在 URL 和代码中替换，并跳过引号（在后面统一处理）
                    if (!line.includes('http') && !line.includes('`') && eng !== '"') {
                        processedLine = processedLine.replace(new RegExp('\\' + eng, 'g'), chn);
                    }
                }
            } else if (hasEnglish) {
                // 纯英文，使用英文标点（但保留引号统一处理）
                for (let [chn, eng] of Object.entries(englishPunctuation)) {
                    // 跳过引号，在后面统一处理
                    if (chn !== '"' && chn !== '"') {
                        processedLine = processedLine.replace(new RegExp(chn, 'g'), eng);
                    }
                }
            }

            // 统一引号格式（在所有其他处理之后）
            processedLine = this.normalizeQuotes(processedLine);

            // 修复空格问题
            processedLine = this.fixSpacing(processedLine);

            processedLines.push(processedLine);
        }

        return processedLines.join('\n');
    }

    /**
     * 智能标点处理（中英文混合）
     */
    smartPunctuationFix(line) {
        // 在英文单词和数字周围使用英文标点
        // 在中文字符周围使用中文标点
        
        let result = line;
        
        // 处理逗号：英文环境用英文逗号，中文环境用中文逗号
        result = result.replace(/([a-zA-Z0-9])\s*，\s*([a-zA-Z0-9])/g, '$1, $2');
        result = result.replace(/([\u4e00-\u9fff])\s*,\s*([\u4e00-\u9fff])/g, '$1，$2');
        
        // 处理句号
        result = result.replace(/([a-zA-Z0-9])\s*。\s*/g, '$1. ');
        result = result.replace(/([\u4e00-\u9fff])\s*\.\s*$/g, '$1。');
        
        // 处理括号
        result = result.replace(/([a-zA-Z0-9])\s*（/g, '$1 (');
        result = result.replace(/）\s*([a-zA-Z0-9])/g, ') $1');
        result = result.replace(/([\u4e00-\u9fff])\s*\(/g, '$1（');
        result = result.replace(/\)\s*([\u4e00-\u9fff])/g, '）$1');
        
        return result;
    }

    /**
     * 统一引号格式
     */
    normalizeQuotes(line) {
        // 跳过代码块和行内代码
        if (line.match(/^```/) || line.match(/^\s*`[^`]+`\s*$/) || line.match(/^\s{4,}/)) {
            return line;
        }

        let result = line;
        
        // 第一步：将所有各种引号先统一为临时标记
        // 使用 Unicode 编码确保准确性
        const quotePatterns = [
            // 英文引号
            new RegExp(String.fromCharCode(8220), 'g'),  // 左双引号 "
            new RegExp(String.fromCharCode(8221), 'g'),  // 右双引号 "
            new RegExp(String.fromCharCode(34), 'g'),    // 直引号 "
            // 繁体中文引号
            /「/g,      // 繁体左引号
            /」/g,      // 繁体右引号
            /『/g,      // 繁体左书名号
            /』/g,      // 繁体右书名号
            // 其他变体引号
            new RegExp(String.fromCharCode(8218), 'g'),  // 德文下引号 ‚
            new RegExp(String.fromCharCode(8222), 'g'),  // 德文左引号 „
            new RegExp(String.fromCharCode(8249), 'g'),  // 法文左引号 ‹
            new RegExp(String.fromCharCode(8250), 'g'),  // 法文右引号 ›
            new RegExp(String.fromCharCode(171), 'g'),   // 法文左双引号 «
            new RegExp(String.fromCharCode(187), 'g')    // 法文右双引号 »
        ];

        // 将所有引号替换为临时标记
        for (const pattern of quotePatterns) {
            result = result.replace(pattern, '###QUOTE###');
        }

        // 第二步：将临时标记替换为中文引号对
        result = this.replaceQuoteMarkers(result);

        return result;
    }

    /**
     * 替换引号标记为中文引号对
     */
    replaceQuoteMarkers(text) {
        let result = text;
        let isOpening = true;
        
        // 将所有临时标记替换为交替的中文引号
        // 使用正确的中文双引号 Unicode 编码
        result = result.replace(/###QUOTE###/g, () => {
            // 使用正确的中文引号：" (U+201C) 和 " (U+201D)
            const quote = isOpening ? String.fromCharCode(8220) : String.fromCharCode(8221);
            isOpening = !isOpening;
            return quote;
        });
        
        return result;
    }

    /**
     * 修复引号配对（备用方法）
     */
    fixQuotePairs(text) {
        // 简单的引号配对处理
        // 将连续的引号合并，并确保成对出现
        let result = text;
        
        // 合并连续的中文双引号
        result = result.replace(/[""]{2,}/g, '"');
        
        // 处理引号配对（简单实现）
        // 分割所有可能的引号字符
        const quoteChars = /["""]/g;
        const parts = result.split(quoteChars);
        const quotes = result.match(quoteChars) || [];
        
        let rebuiltText = '';
        let isOpening = true;
        
        for (let i = 0; i < parts.length; i++) {
            rebuiltText += parts[i];
            if (i < quotes.length) {
                // 添加配对的中文引号，交替开闭
                rebuiltText += isOpening ? '"' : '"';
                isOpening = !isOpening;
            }
        }
        
        return rebuiltText;
    }

    /**
     * 修复空格问题
     */
    fixSpacing(line) {
        let result = line;
        
        // 中英文之间添加空格
        result = result.replace(/([\u4e00-\u9fff])([a-zA-Z0-9])/g, '$1 $2');
        result = result.replace(/([a-zA-Z0-9])([\u4e00-\u9fff])/g, '$1 $2');
        
        // 中文和符号之间的空格处理
        result = result.replace(/([\u4e00-\u9fff])\s+([，。！？：；）】"])/g, '$1$2');
        result = result.replace(/([（【"])\s+([\u4e00-\u9fff])/g, '$1$2');
        
        // 清理多余的空格
        result = result.replace(/\s{2,}/g, ' ');
        
        return result;
    }

    /**
     * 繁简转换
     * @param {string} text - 输入文本
     * @returns {string} - 转换后的文本
     */
    convertTraditionalToChinese(text) {
        if (!this.opencc) {
            console.warn('OpenCC 未初始化，跳过繁简转换');
            return text;
        }

        try {
            return this.opencc(text);
        } catch (error) {
            console.error('繁简转换错误:', error);
            return text;
        }
    }

    /**
     * 规范化空行
     */
    normalizeEmptyLines(text) {
        // 移除文件开头和结尾的空行
        text = text.replace(/^\n+/, '').replace(/\n+$/, '');
        
        // 将连续的多个空行替换为单个空行
        text = text.replace(/\n{3,}/g, '\n\n');
        
        // 确保文档以换行符结尾
        if (!text.endsWith('\n')) {
            text += '\n';
        }
        
        return text;
    }

    /**
     * 生成处理报告
     * @param {string} originalText - 原始文本
     * @param {string} processedText - 处理后文本
     * @returns {object} - 处理报告
     */
    generateReport(originalText, processedText) {
        const originalLines = originalText.split('\n');
        const processedLines = processedText.split('\n');
        
        // 统计变化
        let changes = 0;
        for (let i = 0; i < Math.max(originalLines.length, processedLines.length); i++) {
            const orig = originalLines[i] || '';
            const proc = processedLines[i] || '';
            if (orig !== proc) {
                changes++;
            }
        }

        // 统计字符和行数
        const report = {
            originalStats: {
                characters: originalText.length,
                lines: originalLines.length,
                words: this.countWords(originalText)
            },
            processedStats: {
                characters: processedText.length,
                lines: processedLines.length,
                words: this.countWords(processedText)
            },
            changes: {
                modifiedLines: changes,
                charactersDiff: processedText.length - originalText.length
            },
            features: {
                formatFixed: this.detectFormatIssues(originalText).length > 0,
                punctuationNormalized: this.detectPunctuationIssues(originalText).length > 0,
                traditionalConverted: this.detectTraditionalChinese(originalText).length > 0
            }
        };

        return report;
    }

    /**
     * 统计单词数
     */
    countWords(text) {
        // 中文字符按字符计算，英文按单词计算
        const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
        const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
        return chineseChars + englishWords;
    }

    /**
     * 检测格式问题
     */
    detectFormatIssues(text) {
        const issues = [];
        const lines = text.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // 检测标题格式问题
            if (line.match(/^#{1,6}[^\s]/)) {
                issues.push(`第${i + 1}行：标题缺少空格`);
            }
            
            // 检测列表格式问题
            if (line.match(/^[-*+][^\s]/)) {
                issues.push(`第${i + 1}行：列表项缺少空格`);
            }
        }
        
        return issues;
    }

    /**
     * 检测标点符号问题
     */
    detectPunctuationIssues(text) {
        const issues = [];
        
        // 检测中英文标点混用
        if (text.match(/[\u4e00-\u9fff][,.:;!?]/)) {
            issues.push('检测到中文内容使用英文标点');
        }
        
        if (text.match(/[a-zA-Z][，。：；！？]/)) {
            issues.push('检测到英文内容使用中文标点');
        }
        
        return issues;
    }

    /**
     * 检测繁体中文
     */
    detectTraditionalChinese(text) {
        // 常见繁体字符
        const traditionalChars = /[繁體字資料網絡討論問題]/g;
        return text.match(traditionalChars) || [];
    }
}

module.exports = TextProcessor;