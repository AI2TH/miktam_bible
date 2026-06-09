const fs = require('fs');
const path = require('path');

async function downloadFile() {
  const url = 'https://huggingface.co/skalvinnathan/bible-smollm2/resolve/main/concordance.db';
  const destPath = path.join(__dirname, 'concordance_temp.db');
  console.log(`Downloading ${url} to ${destPath}...`);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download: ${res.status} ${res.statusText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(destPath, buffer);
  console.log(`Download finished successfully. File size: ${buffer.length} bytes.`);
}

downloadFile().catch(console.error);
