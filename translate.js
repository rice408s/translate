const APPID = '20230811001777285';
const KEY = 'LZCKVoFJXyWeoMr6BgC0';

function generateSign(query, salt) {
    const str = APPID + query + salt + KEY;
    return MD5(str);
}

async function translate(text) {
    const salt = new Date().getTime();
    const sign = generateSign(text, salt);
    
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
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error_code) {
            throw new Error(`翻译错误: ${data.error_msg}`);
        }
        return data.trans_result[0].dst;
    } catch (error) {
        throw error;
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'translate') {
        translate(request.text)
            .then(result => sendResponse({result}))
            .catch(error => sendResponse({error: error.message}));
        return true;
    }
}); 