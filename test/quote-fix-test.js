// 引号错位修复测试
const TextProcessor = require('../utils/textProcessor');

const processor = new TextProcessor();

// 测试用例：常见的引号错位问题
const testCases = [
    {
        name: '引号完全错位',
        input: '他说"你好"，我回答"谢谢"。',
        expected: '他说"你好"，我回答"谢谢"。'
    },
    {
        name: '连续相同引号',
        input: '""这是一段话""',
        expected: '"这是一段话"'
    },
    {
        name: '引号数量不匹配',
        input: '他说"今天天气不错，我们去公园吧。',
        expected: '他说"今天天气不错，我们去公园吧。"'
    },
    {
        name: '引号与标点错位',
        input: '"这是一句话。"',
        expected: '"这是一句话。"'
    },
    {
        name: '对话引号错位',
        input: '小明说"我要回家了"。小红回答"好的，路上小心"。',
        expected: '小明说"我要回家了"。小红回答"好的，路上小心"。'
    },
    {
        name: '嵌套引号',
        input: '老师说"请大家读一下"春眠不觉晓"这句诗"。',
        expected: '老师说"请大家读一下\'春眠不觉晓\'这句诗"。'
    },
    {
        name: '混合引号类型',
        input: 'He said "你好" and she replied "Hello".',
        expected: 'He said "你好" and she replied "Hello".'
    },
    {
        name: '代码块保护',
        input: '这是代码：```\n"let msg = "hello";\n```\n其他内容"测试"。',
        expected: '这是代码：```\n"let msg = "hello";\n```\n其他内容"测试"。'
    }
];

console.log('🔧 引号错位修复功能测试\n');

testCases.forEach((testCase, index) => {
    console.log(`📝 测试 ${index + 1}: ${testCase.name}`);
    console.log(`输入: ${testCase.input}`);
    
    // 使用新的智能引号处理
    const result = processor.normalizeQuotes(testCase.input);
    console.log(`输出: ${result}`);
    console.log(`预期: ${testCase.expected}`);
    
    const passed = result === testCase.expected;
    console.log(`结果: ${passed ? '✅ 通过' : '❌ 失败'}\n`);
});

// 验证引号平衡性
console.log('📊 引号平衡性检测测试\n');

const balanceTests = [
    '"正常的引号对"',
    '"缺少右引号',
    '缺少左引号"',
    '""多个左引号"',
    '"多个右引号""'
];

balanceTests.forEach((test, index) => {
    console.log(`测试 ${index + 1}: ${test}`);
    const validation = processor.validateQuotePairs(test);
    console.log(`平衡性: ${validation.isBalanced ? '✅ 平衡' : '❌ 不平衡'}`);
    console.log(`左引号: ${validation.leftCount}, 右引号: ${validation.rightCount}`);
    
    if (!validation.isBalanced) {
        const fixed = processor.autoFixUnbalancedQuotes(test);
        console.log(`自动修复: ${fixed}`);
    }
    console.log('');
});