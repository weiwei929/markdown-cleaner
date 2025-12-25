// 引号规范化测试（可直接 node 运行）
// 目标：保证 normalizeQuotes() 行为稳定、代码块不被改写

const assert = require('assert');
const TextProcessor = require('../utils/textProcessor');

const processor = new TextProcessor();

const L = '“';
const R = '”';
const FENCE = '```';

const cases = [
    {
        name: '基本替换：英文引号 → 中文引号',
        input: '他说"你好"，我回答"谢谢"。',
        expected: `他说${L}你好${R}，我回答${L}谢谢${R}。`
    },
    {
        name: '不匹配引号：自动补齐右引号',
        input: '他说"今天天气不错，我们去公园吧。',
        expected: `他说${L}今天天气不错，我们去公园吧。${R}`
    },
    {
        name: '整句引用',
        input: '"这是一句话。"',
        expected: `${L}这是一句话。${R}`
    },
    {
        name: '英文句子中的引号',
        input: 'He said "你好" and she replied "Hello".',
        expected: `He said ${L}你好${R} and she replied ${L}Hello${R}.`
    },
    {
        name: '代码块保护：代码块内不替换，引号只改正文',
        input: `这是代码：${FENCE}\n"let msg = "hello";\n${FENCE}\n其他内容"测试"。`,
        expected: `这是代码：${FENCE}\n"let msg = "hello";\n${FENCE}\n其他内容${L}测试${R}。`
    }
];

console.log('🔧 normalizeQuotes() 行为测试');

let passed = 0;
for (const tc of cases) {
    const out = processor.normalizeQuotes(tc.input);
    try {
        assert.strictEqual(out, tc.expected);
        console.log(`✅ ${tc.name}`);
        passed++;
    } catch (e) {
        console.error(`❌ ${tc.name}`);
        console.error('输入:   ', tc.input);
        console.error('输出:   ', out);
        console.error('期望:   ', tc.expected);
        process.exitCode = 1;
    }
}

console.log(`\n通过: ${passed}/${cases.length}`);
