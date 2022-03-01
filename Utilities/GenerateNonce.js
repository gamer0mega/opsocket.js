export function GenerateNonce() {
    let key = '';
    for(let i = 0; i < 16; i++) {
        key += String.fromCharCode(~~(Math.random() * (96)) + 32);
    };
    key = Buffer.from(key).toString('base64');
    return key;
};