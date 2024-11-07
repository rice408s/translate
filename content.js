// 创建加载动画的样式
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    .loading-spinner {
        display: inline-block;
        width: 12px;
        height: 12px;
        border: 2px solid #f3f3f3;
        border-top: 2px solid #FF8C00;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-left: 5px;
        vertical-align: middle;
    }
    .translated-text {
        display: inline;
        cursor: pointer;
    }
    .translated-text .original {
        color: #FF8C00;
    }
    .translated-text .translation-wrapper {
        color: #666;
        font-style: italic;
    }
`;
document.head.appendChild(style);

const APPID = '20230811001777285';
const KEY = 'LZCKVoFJXyWeoMr6BgC0';

// 获取页面的唯一标识符
const pageId = window.location.href;

// 从localStorage删除翻译
function removeTranslation(text) {
    try {
        const savedTranslations = localStorage.getItem(`translations_${pageId}`);
        if (savedTranslations) {
            const translations = JSON.parse(savedTranslations);
            const newTranslations = translations.filter(t => t.text !== text);
            localStorage.setItem(`translations_${pageId}`, JSON.stringify(newTranslations));
        }
    } catch (err) {
        console.error('Error removing translation:', err);
    }
}

// 从localStorage加载已保存的翻译
function loadTranslations() {
    try {
        const savedTranslations = localStorage.getItem(`translations_${pageId}`);
        if (savedTranslations) {
            const translations = JSON.parse(savedTranslations);
            translations.forEach(item => {
                try {
                    const elements = document.evaluate(
                        `//text()[contains(., '${item.text}')]`,
                        document.body,
                        null,
                        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                        null
                    );
                    
                    for (let i = 0; i < elements.snapshotLength; i++) {
                        const element = elements.snapshotItem(i);
                        if (element.nodeType === 3) { // 文本节点
                            const text = element.textContent;
                            const index = text.indexOf(item.text);
                            if (index !== -1) {
                                const span = document.createElement('span');
                                span.innerHTML = `<span class="original">${item.text}</span> <span class="translation-wrapper">(${item.translation}) </span>`;
                                span.classList.add('translated-text');
                                span.dataset.originalText = item.text;
                                
                                const range = document.createRange();
                                range.setStart(element, index);
                                range.setEnd(element, index + item.text.length);
                                range.deleteContents();
                                range.insertNode(span);
                            }
                        }
                    }
                } catch (err) {
                    console.error('Error restoring translation:', err);
                }
            });
        }
    } catch (err) {
        console.error('Error loading translations:', err);
    }
}

// 保存翻译到localStorage
function saveTranslation(text, translation) {
    try {
        const savedTranslations = localStorage.getItem(`translations_${pageId}`) || '[]';
        const translations = JSON.parse(savedTranslations);
        if (!translations.some(t => t.text === text)) {
            translations.push({ text, translation });
            localStorage.setItem(`translations_${pageId}`, JSON.stringify(translations));
        }
    } catch (err) {
        console.error('Error saving translation:', err);
    }
}

function generateSign(query, salt) {
    const str = APPID + query + salt + KEY;
    return MD5(str);
}

async function translateText(text, salt, sign) {
    try {
        if (!chrome?.runtime?.sendMessage) {
            throw new Error('Chrome runtime not available');
        }
        
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'translate',
                text: text,
                salt: salt,
                sign: sign
            }, response => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(response);
                }
            });
        });
    } catch (err) {
        throw new Error(`Translation request failed: ${err.message}`);
    }
}

// 处理取消翻译
function handleTranslatedClick(e) {
    // 检查是否点击了已翻译的文本
    const translatedSpan = e.target.closest('.translated-text');
    if (translatedSpan) {
        const originalText = translatedSpan.dataset.originalText;
        if (originalText) {
            const textNode = document.createTextNode(originalText);
            translatedSpan.parentNode.replaceChild(textNode, translatedSpan);
            removeTranslation(originalText);
        }
        return;
    }

    // 检查选中的文本是否包含翻译内容
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText) {
        // 获取选中范围内的所有翻译元素
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const root = container.nodeType === 3 ? container.parentNode : container;
        
        // 查找所有翻译元素
        const translatedElements = root.getElementsByClassName('translated-text');
        Array.from(translatedElements).forEach(elem => {
            if (range.intersectsNode(elem)) {
                const originalText = elem.dataset.originalText;
                if (originalText) {
                    const textNode = document.createTextNode(originalText);
                    elem.parentNode.replaceChild(textNode, elem);
                    removeTranslation(originalText);
                }
            }
        });
    }
}

// 修改事件监听器，使用 mouseup 代替 click
document.removeEventListener('click', handleTranslatedClick); // 移除之前的click监听器
document.addEventListener('mouseup', handleTranslatedClick);

document.addEventListener('mouseup', async function(e) {
    let loadingSpinner = null;
    try {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (!selectedText || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        
        // 检查选中的文本是否在可编辑区域内
        let container = range.commonAncestorContainer;
        if (container.nodeType === 3) { // 文本节点
            container = container.parentNode;
        }
        
        // 如果点击的是已翻译的文本，则不进行新的翻译
        if (container.classList?.contains('translated-text')) {
            return;
        }

        // 创建一个新的范围来插入加载动画
        const newRange = document.createRange();
        newRange.setStart(range.endContainer, range.endOffset);
        newRange.setEnd(range.endContainer, range.endOffset);
        
        // 添加加载动画
        loadingSpinner = document.createElement('span');
        loadingSpinner.className = 'loading-spinner';
        newRange.insertNode(loadingSpinner);
        
        // 生成签名
        const salt = Date.now().toString();
        const sign = generateSign(selectedText, salt);
        
        const response = await translateText(selectedText, salt, sign);

        // 移除加载动画
        if (loadingSpinner?.parentNode) {
            loadingSpinner.remove();
        }

        if (!response.error) {
            const span = document.createElement('span');
            span.innerHTML = `<span class="original">${selectedText}</span> <span class="translation-wrapper">(${response.result}) </span>`;
            span.classList.add('translated-text');
            span.dataset.originalText = selectedText;
            
            // 替换选中的文本
            range.deleteContents();
            range.insertNode(span);
            
            // 保存翻译结果
            saveTranslation(selectedText, response.result);
        } else {
            console.error('Translation error:', response.error);
        }
    } catch (err) {
        console.error('Selection handling error:', err);
        if (loadingSpinner?.parentNode) {
            loadingSpinner.remove();
        }
    }
});

// 页面加载完成后恢复翻译
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadTranslations);
} else {
    loadTranslations();
}