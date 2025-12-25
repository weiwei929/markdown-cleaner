/**
 * MarkDown 文档文本处理器
 * 功能：格式修复、标点规范、繁简转换
 */

class TextProcessor {
    constructor() {
        // 初始化繁简转换库（使用 opencc-js 的浏览器版本）
        this.opencc = null;
        this._initPromise = null;
        // 不立即初始化，改为惰性初始化
    }

    /**
     * 初始化 OpenCC 转换器（惰性初始化）
     */
    async initOpenCC() {
        if (this._initPromise) {
            return this._initPromise;
        }
        
        this._initPromise = (async () => {
            try {
                // 在服务器端使用 opencc-js
                const OpenCC = require('opencc-js');
                this.opencc = OpenCC.Converter({ from: 'hk', to: 'cn' });
            } catch (error) {
                console.warn('OpenCC 初始化失败，繁简转换功能将被禁用:', error.message);
                this.opencc = null;
            }
        })();
        
        return this._initPromise;
    }

    /**
     * 确保 OpenCC 已初始化（用于需要繁简转换时）
     */
    async ensureOpenCCReady() {
        if (!this.opencc && !this._initPromise) {
            await this.initOpenCC();
        } else if (this._initPromise) {
            await this._initPromise;
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

            // 2. 标点符号规范化
            if (options.fixPunctuation !== false) {
                processedText = this.normalizePunctuation(processedText);
            }

            // 3. 繁简转换（惰性初始化）
            if (options.convertTraditional !== false) {
                await this.ensureOpenCCReady();
                if (this.opencc) {
                    processedText = this.convertTraditionalToChinese(processedText);
                }
                
                // 3.1 异体字转换（在繁简转换之后执行）
                processedText = this.convertVariantCharacters(processedText);
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
     * 1. 合并段落中不应断开的连续行
     * 2. 不合并 Markdown 块级元素（标题、列表、引用、代码块、分隔线）
     * 3. 不合并以两个空格结尾的行（Markdown 硬换行语法）
     * 4. 中文字符间直接连接，英文/数字间加空格
     * 5. 支持多行连续合并
     */
    mergeBrokenLines(text) {
        const lines = text.split('\n');
        const resultLines = [];

        // 定义不应合并的行类型
        const shouldNotMerge = (line) => {
            const trimmed = line.trim();
            // 空行
            if (trimmed.length === 0) return true;
            // Markdown 块级元素
            if (/^(#{1,6})/.test(trimmed)) return true; // 标题（即使没有空格也不合并）
            if (/^\s*[-*+]/.test(trimmed)) return true; // 无序列表（即使没有空格也不合并）
            if (/^\s*\d+\./.test(trimmed)) return true; // 有序列表（即使没有空格也不合并）
            if (/^\s*>/.test(trimmed)) return true; // 引用
            if (/^\s*```/.test(trimmed)) return true; // 代码块
            if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(trimmed)) return true; // 分隔线
            // 以两个空格结尾（Markdown 硬换行）
            if (line.endsWith('  ')) return true;
            return false;
        };

        // 检查是否是列表项的延续行
        const isListContinuation = (line, prevLine) => {
            const trimmed = line.trim();
            const prevTrimmed = prevLine.trim();
            // 如果前一行是列表项开头，且当前行有缩进，则认为是列表项的延续
            if ((/^\s*[-*+]/.test(prevTrimmed) || /^\s*\d+\./.test(prevTrimmed)) &&
                line.match(/^\s{2,}/)) {
                return true;
            }
            return false;
        };

        let currentParagraph = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // 检查是否是列表项的延续行
            const prevLine = i > 0 ? lines[i - 1] : '';
            const isContinuation = isListContinuation(line, prevLine);

            // 如果这一行不应该合并，或者是段落开始，或者是列表延续行
            if (shouldNotMerge(line) || currentParagraph === '' || isContinuation) {
                // 先输出之前的段落（如果有）
                if (currentParagraph) {
                    resultLines.push(currentParagraph);
                    currentParagraph = '';
                }

                // 如果这一行本身就是块级元素，直接输出
                if (shouldNotMerge(line) || isContinuation) {
                    resultLines.push(line);
                } else {
                    // 开始新段落
                    currentParagraph = line;
                }
            } else {
                // 这一行应该与之前的行合并
                const lastChar = currentParagraph.slice(-1);
                const firstChar = trimmedLine.charAt(0);

                // 判断连接符：中文直接连接，其他情况加空格
                const isChineseLast = /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(lastChar);
                const isChineseFirst = /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(firstChar);
                const separator = (isChineseLast && isChineseFirst) ? '' : ' ';

                currentParagraph += separator + trimmedLine;
            }
        }

        // 处理最后的段落
        if (currentParagraph) {
            resultLines.push(currentParagraph);
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
            
            // 修复段落顶格对齐（移除段首缩进，但保留4空格代码块）
            line = this.fixParagraphIndent(line);
            
            // 修复标题格式（返回对象）
            const headingResult = this.fixHeadings(line, prevLine, nextLine);
            if (headingResult.needsEmptyLineBefore && processedLines.length > 0) {
                const lastLine = processedLines[processedLines.length - 1];
                if (lastLine !== '') {
                    processedLines.push('');
                }
            }
            line = headingResult.line;
            
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
     * 修复段落顶格对齐
     * 移除段首的各种缩进（全角空格、多个空格等），但保留4个空格（代码块）
     * @param {string} line - 输入行
     * @returns {string} - 处理后的行
     */
    fixParagraphIndent(line) {
        const trimmed = line.trim();
        
        // 空行直接返回
        if (trimmed.length === 0) return line;
        
        // 保留代码块（4个空格开头）
        if (line.match(/^ {4}/)) {
            return line;
        }
        
        // 保留 Markdown 块级元素
        if (/^(#{1,6})\s/.test(trimmed)) return line; // 标题
        if (/^\s*[-*+]\s/.test(trimmed)) return line; // 无序列表
        if (/^\s*\d+\.\s/.test(trimmed)) return line; // 有序列表
        if (/^\s*>/.test(trimmed)) return line; // 引用
        if (/^\s*```/.test(trimmed)) return line; // 代码块标记
        if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(trimmed)) return line; // 分隔线
        
        // 移除段首的各种缩进（全角空格、制表符、多个空格等）
        // 但保留列表项内的缩进（用于嵌套列表）
        const indentMatch = line.match(/^(\s+)/);
        if (indentMatch) {
            const indent = indentMatch[1];
            // 检查是否是列表项的延续行（2个空格，可能是列表延续）
            // 但全角空格、制表符、1个空格、3个以上空格都应该移除
            if (indent.includes('\u3000') || indent.includes('\t')) {
                // 移除全角空格和制表符
                return line.replace(/^[\u3000\t]+/, '');
            }
            // 如果是1个空格或3个以上空格（但不是4个空格的代码块），移除
            if (indent.length === 1 || (indent.length >= 3 && indent.length !== 4)) {
                return line.replace(/^\s+/, '');
            }
            // 如果是2个空格，可能是列表延续，保留
            // 如果是4个空格，已经在前面检查过，保留
        }
        
        return line;
    }

    /**
     * 修复标题格式
     * 返回一个对象，包含处理后的行和是否需要在前面插入空行
     */
    fixHeadings(line, prevLine, nextLine) {
        const headingPattern = /^(#{1,6})\s*(.*)/;
        const match = line.match(headingPattern);
        
        if (match) {
            const level = match[1];
            const content = match[2].trim();
            
            // 检查前一行是否也是标题（不管有没有空格）
            const prevIsHeading = prevLine.match(/^#{1,6}/);
            
            // 检查是否需要在标题前添加空行
            // 只有当前一行不是空行且不是标题时才需要
            const needsEmptyLineBefore = prevLine.trim() !== '' && !prevIsHeading;
            
            // 标准化标题格式：# + 空格 + 内容
            return {
                line: `${level} ${content}`,
                needsEmptyLineBefore: needsEmptyLineBefore
            };
        }
        
        return {
            line: line,
            needsEmptyLineBefore: false
        };
    }

    /**
     * 修复列表格式
     */
    fixLists(line) {
        // 保护 Markdown 分割线（---, ***, ___）
        if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
            return line;
        }
        
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
     * 统一引号格式（处理整个文本，支持嵌套引号）
     * @param {string} text - 输入文本
     * @returns {string} - 处理后的文本
     */
    normalizeQuotes(text) {
        // 保护代码块和行内代码
        const codeBlockRegex = /```[\s\S]*?```/g;
        const inlineCodeRegex = /`[^`\n]+`/g;
        
        const codeBlocks = [];
        const inlineCodes = [];
        const codeBlockLines = []; // 记录4空格代码块的行号范围
        
        // 保护代码块（```...```）
        let result = text.replace(codeBlockRegex, (match) => {
            codeBlocks.push(match);
            return `###CODEBLOCK${codeBlocks.length - 1}###`;
        });
        
        // 保护行内代码
        result = result.replace(inlineCodeRegex, (match) => {
            inlineCodes.push(match);
            return `###INLINECODE${inlineCodes.length - 1}###`;
        });
        
        // 保护4空格缩进的代码块（按行处理）
        const lines = result.split('\n');
        const processedLines = lines.map((line, index) => {
            // 如果是4空格开头的行，标记为代码块行
            if (line.match(/^ {4,}/)) {
                codeBlockLines.push(index);
                return line;
            }
            return line;
        });
        result = processedLines.join('\n');
        
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

        // 将所有引号替换为临时标记（但跳过代码块行）
        const resultLines = result.split('\n');
        const finalLines = resultLines.map((line, index) => {
            // 跳过代码块行和代码块标记
            if (codeBlockLines.includes(index) || line.includes('###CODEBLOCK') || line.includes('###INLINECODE')) {
                return line;
            }
            
            let processedLine = line;
            for (const pattern of quotePatterns) {
                processedLine = processedLine.replace(pattern, '###QUOTE###');
            }
            return processedLine;
        });
        result = finalLines.join('\n');

        // 第二步：将临时标记替换为中文引号对（支持嵌套）
        result = this.replaceQuoteMarkersWithNesting(result);
        
        // 恢复代码块
        result = result.replace(/###CODEBLOCK(\d+)###/g, (match, index) => {
            return codeBlocks[parseInt(index)];
        });
        
        // 恢复行内代码
        result = result.replace(/###INLINECODE(\d+)###/g, (match, index) => {
            return inlineCodes[parseInt(index)];
        });

        return result;
    }

    /**
     * 一键修复引号（不进行其他处理）
     */
    oneClickQuoteFix(text) {
        const processedText = this.normalizeQuotes(text);
        
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
     * 替换引号标记为中文引号对（简化版：所有引号都使用双引号）
     * @param {string} text - 输入文本
     * @returns {string} - 处理后的文本
     */
    replaceQuoteMarkersWithNesting(text) {
        // 中文双引号 Unicode 编码
        const doubleQuoteLeft = String.fromCharCode(8220);  // "
        const doubleQuoteRight = String.fromCharCode(8221); // "
        
        // 找到所有引号标记的位置
        const quotePositions = [];
        let match;
        const regex = /###QUOTE###/g;
        while ((match = regex.exec(text)) !== null) {
            quotePositions.push(match.index);
        }
        
        if (quotePositions.length === 0) {
            return text;
        }
        
        // 构建结果字符串
        let result = '';
        let lastIndex = 0;
        let isOpening = true; // 交替使用左引号和右引号
        
        for (let i = 0; i < quotePositions.length; i++) {
            const pos = quotePositions[i];
            
            // 添加引号前的文本
            result += text.substring(lastIndex, pos);
            
            // 交替使用左引号和右引号
            if (isOpening) {
                result += doubleQuoteLeft;
            } else {
                result += doubleQuoteRight;
            }
            isOpening = !isOpening;
            
            lastIndex = pos + '###QUOTE###'.length;
        }
        
        // 添加剩余的文本
        result += text.substring(lastIndex);
        
        // 如果引号数量是奇数，补充右引号
        if (!isOpening) {
            result += doubleQuoteRight;
        }
        
        return result;
    }

    /**
     * 修复空格问题
     */
    fixSpacing(text) {
        const lines = text.split(/\r?\n/);
        const processed = lines.map((line) => {
            // 保护 Markdown 分割线（---, ***, ___）
            if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
                return line;
            }
            
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
     * 转换异体字为标准简体字
     * 这些异体字不遵循标准的简繁体转换规则，需要单独处理
     * @param {string} text - 输入文本
     * @returns {string} - 转换后的文本
     */
    convertVariantCharacters(text) {
        // 异体字映射表
        const variantMap = {
            '勐': '猛',      // 勐 → 猛
            '幺': '么',      // 幺 → 么
            '麽': '么',      // 麽 → 么
            '豔': '艳',      // 豔 → 艳
            '洩': '泄',      // 洩 → 泄
            '週': '周',      // 週 → 周
            '裡': '里',      // 裡 → 里
            '髮': '发',      // 髮 → 发（头发）
            '乾': '干',      // 乾 → 干（干燥）
            '為': '为',      // 為 → 为
            '擡': '抬'       // 擡 → 抬
        };

        // 使用正则表达式替换所有异体字
        let result = text;
        for (const [variant, standard] of Object.entries(variantMap)) {
            // 使用全局替换，替换所有出现的异体字
            result = result.split(variant).join(standard);
        }

        return result;
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
        const detailedChanges = [];

        for (let i = 0; i < Math.max(originalLines.length, processedLines.length); i++) {
            const orig = originalLines[i] || '';
            const proc = processedLines[i] || '';
            if (orig !== proc) {
                changes++;
                detailedChanges.push({
                    lineNumber: i + 1,
                    original: orig,
                    processed: proc,
                    type: this.analyzeChangeType(orig, proc)
                });
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
                charactersDiff: processedText.length - originalText.length,
                detailedChanges: detailedChanges.slice(0, 20) // 最多显示20个详细变更
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
     * 分析变更类型
     */
    analyzeChangeType(original, processed) {
        if (!original.trim() && processed.trim()) return '新增内容';
        if (original.trim() && !processed.trim()) return '删除内容';

        // 检查是否是标点符号变更
        if (original.replace(/[,.:;!?，。：；！？]/g, '') === processed.replace(/[,.:;!?，。：；！？]/g, '')) {
            return '标点符号';
        }

        // 检查是否是引号变更
        if (original.replace(/[""''""''「」『』]/g, '') === processed.replace(/[""''""''「」『』]/g, '')) {
            return '引号格式';
        }

        // 检查是否是空格变更
        if (original.replace(/\s/g, '') === processed.replace(/\s/g, '')) {
            return '空格调整';
        }

        // 检查是否是繁简转换
        const tradChars = /[繁體字資料網絡討論問題]/g;
        if (tradChars.test(original) && !tradChars.test(processed)) {
            return '繁简转换';
        }

        return '其他修改';
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
     * 规范化标点符号
     */
    normalizePunctuation(text) {
        let result = text;

        // 保护 Markdown 分割线（---, ***, ___）
        const hrRegex = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/gm;
        const horizontalRules = [];
        result = result.replace(hrRegex, (match) => {
            horizontalRules.push(match);
            return `###HR${horizontalRules.length - 1}###`;
        });

        // 跳过代码块
        const codeBlockRegex = /```[\s\S]*?```/g;
        const inlineCodeRegex = /`[^`\n]+`/g;

        // 保护代码块
        const codeBlocks = [];
        result = result.replace(codeBlockRegex, (match) => {
            codeBlocks.push(match);
            return `###CODEBLOCK${codeBlocks.length - 1}###`;
        });

        // 保护行内代码
        const inlineCodes = [];
        result = result.replace(inlineCodeRegex, (match) => {
            inlineCodes.push(match);
            return `###INLINECODE${inlineCodes.length - 1}###`;
        });

        // 处理数字后的标点（如 3.14 不应该变成 3。14）
        // 先保护数字.数字和数字.字母的情况
        const numberPattern = /\d+\.\d+|\d+\.\w+/g;
        const numbers = [];
        result = result.replace(numberPattern, (match) => {
            numbers.push(match);
            return `###NUMBER${numbers.length - 1}###`;
        });
        
        // 中文语境：英文标点 → 中文标点
        result = result.replace(/([\u4e00-\u9fff])[,](?!\w)/g, '$1，');
        result = result.replace(/([\u4e00-\u9fff])\.(?!\w)/g, '$1。');
        result = result.replace(/([\u4e00-\u9fff]):(?!\w)/g, '$1：');
        result = result.replace(/([\u4e00-\u9fff]);(?!\w)/g, '$1；');
        result = result.replace(/([\u4e00-\u9fff])\!(?!\w)/g, '$1！');
        result = result.replace(/([\u4e00-\u9fff])\?(?!\w)/g, '$1？');
        
        // 恢复数字
        result = result.replace(/###NUMBER(\d+)###/g, (match, index) => {
            return numbers[parseInt(index)];
        });
        
        // 处理数字后的逗号（如 3.14,这是正确的 中的逗号应该变成中文逗号）
        // 匹配：数字或数字.数字后跟逗号，且逗号后是中文
        result = result.replace(/(\d+(?:\.\d+)?),([\u4e00-\u9fff])/g, '$1，$2');
        
        // 英文语境：中文标点 → 英文标点
        // 改进：检测英文单词后的中文标点
        result = result.replace(/([a-zA-Z0-9])\，/g, '$1,');
        result = result.replace(/([a-zA-Z0-9])\。/g, '$1.');
        result = result.replace(/([a-zA-Z0-9])\：/g, '$1:');
        result = result.replace(/([a-zA-Z0-9])\；/g, '$1;');
        result = result.replace(/([a-zA-Z0-9])\！/g, '$1!');
        result = result.replace(/([a-zA-Z0-9])\？/g, '$1?');

        // 恢复代码块
        result = result.replace(/###CODEBLOCK(\d+)###/g, (match, index) => {
            return codeBlocks[parseInt(index)];
        });

        // 恢复行内代码
        result = result.replace(/###INLINECODE(\d+)###/g, (match, index) => {
            return inlineCodes[parseInt(index)];
        });

        // 恢复分割线
        result = result.replace(/###HR(\d+)###/g, (match, index) => {
            return horizontalRules[parseInt(index)];
        });

        return result;
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