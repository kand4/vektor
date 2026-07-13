const fs = require('fs');
const fetch = require('node-fetch');

async function test() {
    // encode a tiny gif
    const b64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    const payload = 'data:image/gif;base64,' + b64;
    
    const res = await fetch('http://localhost:3000/api/telegraph/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: payload })
    });
    console.log(await res.text());
}
test();
