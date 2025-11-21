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
            // 0. 修复断行 (如果启用)
            if (options.mergeBrokenLines) {
                processedText = this.mergeBrokenLines(processedText);
            }

            // 1. 格式修复
            if (options.fixFormat !== false) {
                processedText = this.fixMarkdownFormat(processedText);
            }

            // 2. 标点符号规范化 (已移除自动处理，改为手动检查)
            // if (options.fixPunctuation !== false) {
            //     processedText = this.normalizePunctuation(processedText);
            // }

            // 3. 繁简转换
            if (options.convertTraditional !== false && this.opencc) {
                processedText = this.convertTraditionalToChinese(processedText);
            }
            
            // 4. 统一引号格式 (始终启用)
            if (options.normalizeQuotes !== false) {
                processedText = this.normalizeQuotes(processedText);
            }
            
            // 5. 修复空格 (始终启用)
            if (options.fixSpacing !== false) {
                processedText = this.fixSpacing(processedText);
            }

            return processedText;
        } catch (error) {
            console.error('文本处理错误:', error);
            throw new Error(`文本处理失败: ${error.message}`);
        }
    }

    /**
     * 修复断行（合并段落）
     * 规则：
     * 1. 如果当前行和下一行都不是空行，且不是 Markdown 块级元素（标题、列表、引用等），则合并
     * 2. 中文之间合并时不加空格
     * 3. 英文或数字之间合并时加空格
     */
    mergeBrokenLines(text) {
        const lines = text.split('\n');
        const mergedLines = [];
        const hrPattern = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;
        const headingOrBlock = /^(#{1,6})(?:\s|$)|^\s*(?:[-*+]\s|\d+\.\s|>)|^\s*```/;
        
        for (let i = 0; i < lines.length; i++) {
            let currentLine = lines[i].trimEnd();
            
            // 如果是最后一行，直接添加
            if (i === lines.length - 1) {
                mergedLines.push(currentLine);
                break;
            }
            
            let nextLine = lines[i + 1];
            
            // 检查是否应该合并
            // 条件：
            // 1. 当前行非空
            // 2. 下一行非空
            // 3. 当前行不是块级元素
            // 4. 下一行不是块级元素
            // 5. 当前行不以两个以上空格结尾（Markdown 换行语法）
            if (currentLine.trim().length > 0 && 
                nextLine.trim().length > 0 && 
                !headingOrBlock.test(currentLine.trim()) && 
                !headingOrBlock.test(nextLine.trim()) &&
                !hrPattern.test(currentLine.trim()) &&
                !hrPattern.test(nextLine.trim()) &&
                !currentLine.endsWith('  ')) {
                
                // 决定连接符
                const lastChar = currentLine.slice(-1);
                const nextChar = nextLine.trim().slice(0, 1);
                
                // 判断是否为中文（包括标点）
                const isChineseLast = /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(lastChar);
                const isChineseNext = /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(nextChar);
                
                // 如果两端都是中文/中文标点，则直接连接；否则加空格
                const separator = (isChineseLast && isChineseNext) ? '' : ' ';
                
                // 合并到当前行
                // 注意：这里我们修改了 lines[i+1]，实际上是把下一行"吸"了上来
                // 下一次循环时，处理的就是已经合并过的内容的下一行（原 lines[i+2]）
                // 但为了简单起见，我们这里直接修改 lines 数组是不安全的，因为我们在遍历它
                // 更好的方法是：将当前行暂存，看能否与下一行合并
                
                // 修正逻辑：
                // 我们不直接修改 lines[i+1]，而是将 currentLine 与 nextLine 合并，
                // 然后跳过下一行的处理（i++）
                // 但是这样只能合并两行。对于多行合并，我们需要一个 while 循环
                
                // 重新实现：使用累加器
            }
        }
        
        // 重新实现逻辑：
        let resultLines = [];
        let buffer = '';
        let inCode = false;
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trimEnd(); // 去除尾部空格
            let trimmedLine = line.trim();
            
            // 如果是空行或块级元素，先处理缓冲区，然后添加当前行
            if (trimmedLine.length === 0 || headingOrBlock.test(trimmedLine) || hrPattern.test(trimmedLine)) {
                if (buffer) {
                    resultLines.push(buffer);
                    buffer = '';
                }
                resultLines.push(line);
            } else {
                // 普通文本行
                if (buffer) {
                    // 缓冲区已有内容，尝试合并
                    const lastChar = buffer.slice(-1);
                    const nextChar = trimmedLine.slice(0, 1);
                    
                    const isChineseLast = /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(lastChar);
                    const isChineseNext = /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(nextChar);
                    
                    const separator = (isChineseLast && isChineseNext) ? '' : ' ';
                    buffer += separator + trimmedLine;
                } else {
                    // 缓冲区为空，直接存入
                    buffer = line;
                }
            }
        }
        
        // 处理最后的缓冲区
        if (buffer) {
            resultLines.push(buffer);
        }
        
        return resultLines.join('\n');
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
     * 一键修复引号（不进行其他处理）
     */
    oneClickQuoteFix(text) {
        const lines = text.split('\n');
        const processedLines = lines.map(line => this.normalizeQuotes(line));
        const processedText = processedLines.join('\n');
        
        return {
            text: processedText,
            fixed: text !== processedText,
            validation: {
                original: text.length,
                processed: processedText.length
            }
        };
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
     * 修复空格问题
     */
    fixSpacing(text) {
        const lines = text.split(/\r?\n/);
        const processed = lines.map((line) => {
            let result = line;
            result = result.replace(/([\u4e00-\u9fff])([a-zA-Z0-9])/g, '$1 $2');
            result = result.replace(/([a-zA-Z0-9])([\u4e00-\u9fff])/g, '$1 $2');
            result = result.replace(/([\u4e00-\u9fff])[ \t]+([，。！？：；）】"])/g, '$1$2');
            result = result.replace(/([（【"])\s+([\u4e00-\u9fff])/g, '$1$2');
            // 仅清理空格与制表符，不影响换行（避免 CRLF 被压缩为单空格）
            result = result.replace(/[ \t]{2,}/g, ' ');
            return result;
        });
        // 保留原始换行风格（优先 CRLF）
        const newline = /\r\n/.test(text) ? '\r\n' : '\n';
        return processed.join(newline);
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