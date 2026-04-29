import fs from 'fs';
import https from 'https';

const url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Coat_of_arms_of_Malaysia.svg/500px-Coat_of_arms_of_Malaysia.svg.png';
const dest = './public/jata_negara.png';

https.get(url, (res) => {
  const file = fs.createWriteStream(dest);
  res.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Downloaded Jata Negara');
  });
}).on('error', (err) => {
  console.log('Error:', err.message);
});
