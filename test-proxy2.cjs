const fs = require('fs');
const fetch = require('node-fetch');

async function test() {
    const b64 = fs.readFileSync('public/architect.jpg').toString('base64');
    const payload = 'data:image/jpeg;base64,' + b64;
    
    console.log("Sending payload of size", payload.length);
    
    const res = await fetch('http://localhost:3000/api/telegraph/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: payload })
    });
    console.log(await res.text());
}
test();
