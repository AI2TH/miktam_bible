const https = require('https');
const fs = require('fs');

const file = fs.createWriteStream("concordance.db");
https.get("https://huggingface.co/skalvinnathan/bible-smollm2/resolve/main/concordance.db?download=true", response => {
  response.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Download completed.');
  });
}).on('error', err => {
  fs.unlink("concordance.db", () => {});
  console.error('Error:', err.message);
});
