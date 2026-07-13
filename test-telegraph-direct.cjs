const FormData = require('form-data');
const fetch = require('node-fetch');
const fs = require('fs');

async function test() {
    const form = new FormData();
    const b64 = fs.readFileSync('public/architect.jpg');
    form.append('file', Buffer.from(b64, 'base64'), {
        filename: 'image.jpg',
        contentType: 'image/jpeg'
    });

    const res = await fetch('https://telegra.ph/upload', {
        method: 'POST',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Origin': 'https://telegra.ph',
            'Referer': 'https://telegra.ph/',
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: form
    });
    console.log(await res.text());
}
test();
