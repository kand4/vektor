const fetch = require('node-fetch');

async function createTelegraphPage(accessToken, title, authorName, content) {
    const response = await fetch('https://api.telegra.ph/createPage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            access_token: accessToken,
            title,
            author_name: authorName,
            content: JSON.stringify(content),
            return_content: false
        })
    });
    return response.json();
}

async function test() {
    const content = [
        { tag: 'p', children: ['Hello world'] },
        { tag: 'img', attrs: { src: 'https://iili.io/CY4UvP2.jpg' } }
    ];
    // use a dummy access token (from createAccount)
    const acc = await fetch('https://api.telegra.ph/createAccount?short_name=Test&author_name=Test').then(r => r.json());
    if(acc.ok) {
        const page = await createTelegraphPage(acc.result.access_token, 'Test Page', 'Test', content);
        console.log(page);
    }
}
test();
