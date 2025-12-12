require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const pkg = require('./package.json');

// 导入文本处理模块
const TextProcessor = require('./utils/textProcessor');
const Analyzer = require('./src/domain/analyzer');
const Fixer = require('./src/domain/fixer');
const AI = require('./src/domain/ai');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ==================== 中间件配置 ====================

// 1. Request ID 中间件（必须在最前面）
app.use((req, res, next) => {
    req.requestId = crypto.randomUUID();
    res.setHeader('X-Request-ID', req.requestId);
    next();
});

// 2. CORS 配置（支持环境变量）
const corsOptions = {
    origin: (origin, callback) => {
        if (NODE_ENV === 'production') {
            const allowedOrigins = process.env.CORS_ORIGINS 
                ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
                : [];
            if (allowedOrigins.length === 0 || allowedOrigins.includes(origin) || !origin) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        } else {
            // 开发环境允许所有来源
            callback(null, true);
        }
    },
    credentials: true
};
app.use(cors(corsOptions));

// 3. Body 解析（保持现有限制）
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. API 限流配置
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // 每个IP限制100次
    message: {
        success: false,
        error: {
            code: 'RATE_LIMITED',
            message: '请求过于频繁，请稍后再试',
            requestId: null // 将在错误处理中填充
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            error: {
                code: 'RATE_LIMITED',
                message: '请求过于频繁，请稍后再试',
                requestId: req.requestId
            }
        });
    }
});

// CPU 密集型接口的限流（更严格）
const heavyLimiter = rateLimit({
    windowMs: 60 * 1000, // 1分钟
    max: parseInt(process.env.RATE_LIMIT_HEAVY_MAX) || 10, // 每个IP限制10次
    message: {
        success: false,
        error: {
            code: 'RATE_LIMITED',
            message: '该接口请求过于频繁，请稍后再试',
            requestId: null
        }
    },
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            error: {
                code: 'RATE_LIMITED',
                message: '该接口请求过于频繁，请稍后再试',
                requestId: req.requestId
            }
        });
    }
});

// 5. 输入验证中间件
const validateContent = (req, res, next) => {
    const { content } = req.body;
    if (content !== undefined) {
        if (typeof content !== 'string') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'content 必须是字符串类型',
                    requestId: req.requestId
                }
            });
        }
        const maxLength = 5 * 1024 * 1024; // 5MB
        if (content.length > maxLength) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'CONTENT_TOO_LARGE',
                    message: `文本内容不能超过 ${maxLength / 1024 / 1024}MB`,
                    requestId: req.requestId
                }
            });
        }
    }
    next();
};

// 6. 开发环境缓存控制
app.use((req, res, next) => {
    if (req.path.endsWith('.js') || req.path.endsWith('.css')) {
        res.setHeader('Cache-Control', 'no-store');
    }
    next();
});

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));
// 标记库静态服务（避免 CDN 失败）
app.use('/lib/marked', express.static(path.join(__dirname, 'node_modules', 'marked')));
// DOMPurify 静态服务（用于预览安全净化）
app.use('/lib/dompurify', express.static(path.join(__dirname, 'node_modules', 'dompurify', 'dist')));
// favicon 占位，避免 404 警告
app.get('/favicon.ico', (req, res) => res.status(204).end());

// 配置文件上传
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB 限制
    },
    fileFilter: (req, file, cb) => {
        // 允许的文件类型
        const allowedTypes = ['.md', '.markdown', '.txt'];
        const fileExt = path.extname(file.originalname).toLowerCase();
        
        if (allowedTypes.includes(fileExt)) {
            cb(null, true);
        } else {
            cb(new Error('只支持 .md, .markdown, .txt 文件格式'));
        }
    }
});

// 创建文本处理器实例
const textProcessor = new TextProcessor();

// ==================== API 路由 ====================
// 应用通用限流（除了静态文件和健康检查）
app.use('/api/', apiLimiter);

/**
 * 上传并处理 Markdown 文件
 */
app.post('/api/process', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: '请上传文件',
                    requestId: req.requestId
                }
            });
        }

        // 获取处理选项
        const options = {
            fixFormat: req.body.fixFormat === 'true',
            fixPunctuation: req.body.fixPunctuation === 'true',
            convertTraditional: req.body.convertTraditional === 'true'
        };

        // 读取文件内容
        const originalContent = req.file.buffer.toString('utf-8');
        
        // 处理文本
        const processedContent = await textProcessor.processText(originalContent, options);
        
        // 生成处理报告
        const report = textProcessor.generateReport(originalContent, processedContent);

        res.json({
            success: true,
            data: {
                originalContent,
                processedContent,
                fileName: req.file.originalname,
                fileSize: req.file.size,
                report,
                options
            }
        });

    } catch (error) {
        console.error(`[${req.requestId}] 文件处理错误:`, error.message);
        res.status(500).json({
            success: false,
            error: {
                code: 'PROCESS_ERROR',
                message: NODE_ENV === 'production' ? '文件处理失败' : error.message,
                requestId: req.requestId
            }
        });
    }
});

/**
 * 处理文本内容（不通过文件上传）
 */
app.post('/api/process-text', heavyLimiter, validateContent, async (req, res) => {
    try {
        const { content, options } = req.body;

        if (!content) {
            return res.status(400).json({
                success: false,
                error: '请提供文本内容'
            });
        }

        // 处理文本
        const processedContent = await textProcessor.processText(content, options);
        
        // 生成处理报告
        const report = textProcessor.generateReport(content, processedContent);

        res.json({
            success: true,
            data: {
                originalContent: content,
                processedContent,
                report,
                options
            }
        });

    } catch (error) {
        console.error(`[${req.requestId}] 文本处理错误:`, error.message);
        res.status(500).json({
            success: false,
            error: {
                code: 'PROCESS_ERROR',
                message: NODE_ENV === 'production' ? '文本处理失败' : error.message,
                requestId: req.requestId
            }
        });
    }
});

app.post('/api/analyze', heavyLimiter, validateContent, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: '请提供文本内容',
                    requestId: req.requestId
                }
            });
        }
        const result = Analyzer.analyze(content);
        return res.json({ success: true, data: result });
    } catch (error) {
        console.error(`[${req.requestId}] 分析错误:`, error.message);
        return res.status(500).json({
            success: false,
            error: {
                code: 'ANALYSIS_ERROR',
                message: NODE_ENV === 'production' ? '分析失败' : error.message,
                requestId: req.requestId
            }
        });
    }
});

app.post('/api/apply-fixes', heavyLimiter, validateContent, async (req, res) => {
    try {
        const { content, plan } = req.body;
        if (!content) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: '请提供文本内容',
                    requestId: req.requestId
                }
            });
        }
        const result = Fixer.applyFixes(content, plan || { selectedPriorities: [] });
        return res.json({ success: true, data: result });
    } catch (error) {
        console.error(`[${req.requestId}] 修复应用错误:`, error.message);
        return res.status(500).json({
            success: false,
            error: {
                code: 'FIX_ERROR',
                message: NODE_ENV === 'production' ? '修复应用失败' : error.message,
                requestId: req.requestId
            }
        });
    }
});

app.post('/api/plan', heavyLimiter, validateContent, async (req, res) => {
    try {
        const { content, selectedPriorities, sectionRange } = req.body;
        if (!content) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: '请提供文本内容',
                    requestId: req.requestId
                }
            });
        }
        const analysis = Analyzer.analyze(content);
        let counts = analysis.grouped;
        let scope = 'global';
        if (sectionRange && Number.isInteger(sectionRange.start) && Number.isInteger(sectionRange.end)) {
            scope = 'section';
            const lines = content.split(/\r?\n/);
            const slice = lines.slice(sectionRange.start, sectionRange.end + 1).join('\n');
            const local = Analyzer.analyze(slice);
            counts = local.grouped;
        }
        const sel = selectedPriorities || [];
        const estimate = {
            safe: sel.includes('SAFE') ? (counts.SAFE ? counts.SAFE.length : 0) : 0,
            suggested: sel.includes('SUGGESTED') ? (counts.SUGGESTED ? counts.SUGGESTED.length : 0) : 0,
            warning: sel.includes('WARNING') ? (counts.WARNING ? counts.WARNING.length : 0) : 0
        };
        return res.json({ success: true, data: { scope, sectionRange, selectedPriorities: sel, estimate } });
    } catch (error) {
        console.error(`[${req.requestId}] 计划生成错误:`, error.message);
        return res.status(500).json({
            success: false,
            error: {
                code: 'PLAN_ERROR',
                message: NODE_ENV === 'production' ? '计划生成失败' : error.message,
                requestId: req.requestId
            }
        });
    }
});

app.post('/api/preview-fixes', heavyLimiter, validateContent, async (req, res) => {
    try {
        const { content, plan } = req.body;
        if (!content) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: '请提供文本内容',
                    requestId: req.requestId
                }
            });
        }
        const result = Fixer.previewFixes(content, plan || { selectedPriorities: [] });
        return res.json({ success: true, data: result });
    } catch (error) {
        console.error(`[${req.requestId}] 预览生成错误:`, error.message);
        return res.status(500).json({
            success: false,
            error: {
                code: 'PREVIEW_ERROR',
                message: NODE_ENV === 'production' ? '预览生成失败' : error.message,
                requestId: req.requestId
            }
        });
    }
});

app.post('/api/ai/suggest', heavyLimiter, validateContent, async (req, res) => {
    try {
        const { content, rules } = req.body;
        if (!content) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: '请提供文本内容',
                    requestId: req.requestId
                }
            });
        }
        const result = await AI.suggest(content, rules || {});
        return res.json({ success: true, data: { ...result, rules: rules || {} } });
    } catch (error) {
        console.error(`[${req.requestId}] AI 建议错误:`, error.message);
        return res.status(500).json({
            success: false,
            error: {
                code: 'AI_ERROR',
                message: NODE_ENV === 'production' ? 'AI 建议生成失败' : error.message,
                requestId: req.requestId
            }
        });
    }
});

/**
 * 专门的引号修复端点 - 一键修复中文引号错位
 */
app.post('/api/fix-quotes', heavyLimiter, validateContent, async (req, res) => {
    try {
        const { content } = req.body;
        
        if (!content) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: '请提供文本内容',
                    requestId: req.requestId
                }
            });
        }

        // 一键修复引号
        const result = textProcessor.oneClickQuoteFix(content);

        res.json({
            success: true,
            data: {
                originalContent: content,
                fixedContent: result.text,
                validation: result.validation,
                wasFixed: result.fixed,
                message: result.fixed ? '✅ 引号错位已修复' : 'ℹ️ 未发现引号问题'
            }
        });

    } catch (error) {
        console.error(`[${req.requestId}] 引号修复错误:`, error.message);
        res.status(500).json({
            success: false,
            error: {
                code: 'QUOTE_FIX_ERROR',
                message: NODE_ENV === 'production' ? '引号修复失败' : error.message,
                requestId: req.requestId
            }
        });
    }
});

/**
 * 获取应用信息
 */
app.get('/api/info', (req, res) => {
    res.json({
        success: true,
        data: {
            name: 'MarkDown 文档整理工具',
            version: pkg.version,
            description: '本地 Markdown 文档整理工具 - 格式修复、标点规范、繁简转换',
            features: [
                '格式修复 - 标题层级、列表缩进、代码块格式',
                '标点规范 - 中英文标点符号规范化',
                '繁简转换 - 繁体中文转换为简体中文',
                '手动微调 - 支持编辑器内手动调整',
                '实时预览 - Markdown 渲染效果预览'
            ],
            supportedFormats: ['.md', '.markdown', '.txt'],
            maxFileSize: '10MB'
        }
    });
});

/**
 * 健康检查
 */
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 错误处理中间件
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'FILE_TOO_LARGE',
                    message: '文件大小不能超过 10MB',
                    requestId: req.requestId
                }
            });
        }
    }
    
    // CORS 错误
    if (error.message === 'Not allowed by CORS') {
        return res.status(403).json({
            success: false,
            error: {
                code: 'CORS_ERROR',
                message: '请求来源不被允许',
                requestId: req.requestId
            }
        });
    }
    
    console.error(`[${req.requestId || 'unknown'}] 服务器错误:`, error.message);
    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: NODE_ENV === 'production' ? '服务器内部错误' : error.message,
            requestId: req.requestId
        }
    });
});

// 404 处理
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: '请求的资源不存在',
            requestId: req.requestId
        }
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`
╭─────────────────────────────────────────────────╮
│  📝 MarkDown 文档整理工具                         │
│                                               │
│  🚀 服务器已启动                                │
│  🌐 访问地址: http://localhost:${PORT}              │
│  📁 项目目录: ${__dirname}        │
│                                               │
│  ✨ 功能特性:                                  │
│  • 格式修复 - 标题层级、列表缩进               │
│  • 标点规范 - 中英文标点符号规范化             │
│  • 繁简转换 - 繁体转简体                      │
│  • 手动微调 - 实时编辑器支持                  │
│  • 实时预览 - Markdown 渲染效果               │
│                                               │
│  按 Ctrl+C 停止服务器                          │
╰─────────────────────────────────────────────────╯
    `);
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('\n🛑 接收到终止信号，正在关闭服务器...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n🛑 接收到中断信号，正在关闭服务器...');
    process.exit(0);
});

module.exports = app;
