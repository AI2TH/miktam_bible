const fs = require('fs');

async function downloadFile() {
  try {
    const response = await fetch("https://huggingface.co/skalvinnathan/bible-smollm2/resolve/main/concordance.db?download=true");
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
