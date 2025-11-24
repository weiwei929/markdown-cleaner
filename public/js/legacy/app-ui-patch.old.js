/**
 * UI 主题切换补丁
 * 
 * 此文件通过扩展 MarkdownCleanerApp 的原型来添加主题切换功能
 * 不修改原始 app.js 文件，便于测试和回滚
 * 
 * 功能：根据当前模式（overview/basic/expert）动态切换 body 的 CSS 类
 */

(function() {
    'use strict';
    
    console.log('[UI Patch] 主题切换补丁加载中...');
    
    // 保存原方法的引用
    const originalUpdateUIByMode = MarkdownCleanerApp.prototype.updateUIByMode;
    
    // 扩展方法
    MarkdownCleanerApp.prototype.updateUIByMode = function() {
        const m = this.state.uiMode || 'overview';
        
        // 更新 Body 类名以应用 CSS 变量主题
        document.body.classList.remove('mode-basic', 'mode-expert', 'mode-overview');
        document.body.classList.add('mode-' + m);
        
        console.log(`[UI Patch] 已切换主题: mode-${m}`);
        
        // 调用原方法
        if (originalUpdateUIByMode) {
            originalUpdateUIByMode.call(this);
        }

        // 修复 modeBar 的 display 属性 (原方法将其设为 block，导致 flex 失效)
        if (m !== 'overview' && this.elements.modeBar) {
            this.elements.modeBar.style.display = 'flex';
        }
    };
    
    console.log('[UI Patch] 主题切换补丁已成功加载 ✓');
    
})();
