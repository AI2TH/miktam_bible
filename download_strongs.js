const fs = require('fs');

async function testDownload() {
  const url = 'https://raw.githubusercontent.com/mormon-documentation-project/strongs/master/strongs.json';
  console.log("Fetching from:", url);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`Failed to fetch: ${res.status}`);
      return;
    }
    const data = await res.json();
    console.log("Success! Keys in JSON:", Object.keys(data).length);
    const keys = Object.keys(data);
    console.log("First 20 keys:", keys.slice(0, 20));
    console.log("Last 20 keys:", keys.slice(-20));
    
    // Find some Greek and Hebrew entries
    const sampleH = keys.find(k => k.startsWith('H') || data[k].number?.startsWith('H'));
    const sampleG = keys.find(k => k.startsWith('G') || data[k].number?.startsWith('G'));
    console.log("Sample H entry:", sampleH, data[sampleH]);
    console.log("Sample G entry:", sampleG, data[sampleG]);
  } catch (e) {
    console.error("Fetch error:", e);
  }
}

testDownload();
