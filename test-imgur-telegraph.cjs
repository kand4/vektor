const fetch = require('node-fetch');

async function test() {
    const content = [
        { tag: 'p', children: ['Hello imgur'] },
        { tag: 'img', attrs: { src: 'https://i.imgur.com/8Q5Z2g6.jpg' } }
    ];
    const acc = await fetch('https://api.telegra.ph/createAccount?short_name=Test&author_name=Test').then(r => r.json());
    if(acc.ok) {
        const response = await fetch('https://api.telegra.ph/createPage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                access_token: acc.result.access_token,
                title: 'Imgur Test',
                author_name: 'Test',
                content: JSON.stringify(content),
                return_content: false
            })
        });
        const page = await response.json();
        console.log(page);
    }
}
test();
