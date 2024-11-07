import hashlib
import requests
import random
import json

def translate_text(text, appid, key, from_lang='auto', to_lang='zh'):
    salt = str(random.randint(32768, 65536))
    sign = appid + text + salt + key
    sign = hashlib.md5(sign.encode()).hexdigest()
    
    url = 'https://fanyi-api.baidu.com/api/trans/vip/translate'
    params = {
        'q': text,
        'from': from_lang,
        'to': to_lang,
        'appid': appid,
        'salt': salt,
        'sign': sign
    }
    
    try:
        response = requests.get(url, params=params)
        result = response.json()
        
        if 'error_code' in result:
            return f"错误: {result['error_msg']}"
            
        return result['trans_result'][0]['dst']
        
    except Exception as e:
        return f"翻译出错: {str(e)}"

if __name__ == '__main__':
    APPID = '20230811001777285'
    KEY = 'LZCKVoFJXyWeoMr6BgC0'
    
    text = input('请输入要翻译的文本: ')
    result = translate_text(text, APPID, KEY)
    print(f'翻译结果: {result}') 