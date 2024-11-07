const APPID = '20230811001777285';
const KEY = 'LZCKVoFJXyWeoMr6BgC0';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'translate') {
        const text = request.text;
        const salt = request.salt;  // 使用content script传来的salt
        const sign = request.sign;  // 使用content script传来的sign
        
        const url = new URL('https://fanyi-api.baidu.com/api/trans/vip/translate');
        const params = {
            q: text,
            from: 'auto',
            to: 'zh',
            appid: APPID,
            salt: salt,
            sign: sign
        };
        
        url.search = new URLSearchParams(params).toString();
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.error_code) {
                    console.error('Translation API error:', data);
                    throw new Error(`翻译错误: ${data.error_msg}`);
                }
                sendResponse({result: data.trans_result[0].dst});
            })
            .catch(error => {
                console.error('Translation error:', error);
                sendResponse({error: error.message});
            });
            
        return true;
    }
}); 