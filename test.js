/**
 * Markdown Cleaner 测试脚本
 * 使用方法：node test.js [文件路径]
 * 示例：node test.js test-demo.md
 */

const TextProcessor = require('./utils/textProcessor');
const fs = require('fs');

// 测试用例
const testCases = {
    // 测试1：标题格式
    '标题格式测试': `# 标题1
##标题2没有空格
###标题3也没有空格`,

    // 测试2：列表格式
    '列表格式测试': `*列表项1
*列表项2
  *嵌套项`,

    // 测试3：引号统一
    '引号统一测试': `他说"你好"
这是"测试"文档
使用「繁体引号」和『书名号』`,

    // 测试4：标点符号
    '标点符号测试': `中文句子,使用英文逗号.
这也是英文句号.
中英文之间缺少空格:Hello世界`,

    // 测试5：繁简转换
    '繁简转换测试': `這是繁體字
資料庫和網路`,

    // 测试6：综合测试
    '综合测试': `# 测试文档

##标题格式问题
#这个标题没有空格
##这个也没有

## 列表问题
*列表项1
*列表项2
*嵌套项缩进不对

## 引号问题
他说"你好"
这是"测试"文档
使用「繁体引号」和『书名号』

## 标点问题
中文句子,使用英文逗号.
这也是英文句号.
中英文之间缺少空格:Hello世界

## 繁体字問題
這是繁體字
資料庫和網路
`
};

async function runTest(name, content, options = {}) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`测试: ${name}`);
    console.log('='.repeat(60));
    
    const tp = new TextProcessor();
    
    try {
        const result = await tp.processText(content, {
            fixFormat: true,
            fixPunctuation: true,
            normalizeQuotes: true,
            convertTraditional: true,
            mergeBrokenLines: true,
            fixSpacing: true,
            ...options
        });
        
        console.log('\n【原始内容】');
        console.log(content);
        
        console.log('\n【处理后内容】');
        console.log(result);
        
        console.log('\n【主要变化】');
        const originalLines = content.split('\n');
        const resultLines = result.split('\n');
        
        let changes = 0;
        for (let i = 0; i < Math.max(originalLines.length, resultLines.length); i++) {
            const orig = originalLines[i] || '';
            const res = resultLines[i] || '';
            if (orig !== res) {
                changes++;
                console.log(`  第${i + 1}行:`);
                console.log(`    - ${orig}`);
                console.log(`    + ${res}`);
            }
        }
        
        console.log(`\n总计: ${changes} 行发生变化`);
        
    } catch (error) {
        console.error(`\n❌ 错误: ${error.message}`);
        console.error(error.stack);
    }
}

async function testFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`❌ 文件不存在: ${filePath}`);
        return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    await runTest(filePath, content);
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length > 0) {
        // 测试指定文件
        for (const file of args) {
            await testFile(file);
        }
    } else {
        // 运行所有测试用例
        console.log('\n🧪 Markdown Cleaner 测试套件');
        console.log('='.repeat(60));
        
        for (const [name, content] of Object.entries(testCases)) {
            await runTest(name, content);
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ 所有测试完成');
        console.log('='.repeat(60));
    }
}

main().catch(error => {
    console.error('测试失败:', error);
    process.exit(1);
});
