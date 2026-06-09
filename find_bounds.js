const fs = require('fs');

const xml = fs.readFileSync('window_dump_now.xml', 'utf-8');

function findNodesWithText(text) {
  const regex = new RegExp(`text="([^"]*${text}[^"]*)"[^>]*bounds="([^"]+)"`, 'i');
  const match = xml.match(regex);
  if (match) {
    console.log(`Match for "${text}": text="${match[1]}" bounds="${match[2]}"`);
  } else {
    // Try checking resource-id or content-desc
    const regex2 = new RegExp(`content-desc="([^"]*${text}[^"]*)"[^>]*bounds="([^"]+)"`, 'i');
    const match2 = xml.match(regex2);
    if (match2) {
      console.log(`Match for "${text}" (content-desc): desc="${match2[1]}" bounds="${match2[2]}"`);
    } else {
      console.log(`No match for "${text}"`);
    }
  }
}

console.log("=== Finding Current Screen Elements ===");
findNodesWithText("Home");
findNodesWithText("Read");
findNodesWithText("Search");
findNodesWithText("Calendar");
findNodesWithText("Profile");





