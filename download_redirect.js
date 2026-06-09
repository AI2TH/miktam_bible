const fs = require('fs');

async function downloadFile() {
  try {
    const res1 = await fetch("https://huggingface.co/skalvinnathan/bible-smollm2/resolve/main/concordance.db?download=true", { redirect: 'manual' });
    let url = res1.url;
    if (res1.status >= 300 && res1.status < 400 && res1.headers.get('location')) {
      url = res1.headers.get('location');
    }
    
    console.log("Downloading from", url);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Unexpected response ${response.statusText}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    fs.writeFileSync("concordance.db", buffer);
    console.log("Download completed. Size:", buffer.length);
  } catch (err) {
    console.error("Error:", err);
  }
}

downloadFile();
