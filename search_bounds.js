const fs = require('fs');
const content = fs.readFileSync('window_dump_now.xml', 'utf8');

// Find all nodes and print their text/resource-id and bounds
const regex = /<node[^>]*text="([^"]*)"[^>]*resource-id="([^"]*)"[^>]*bounds="([^"]*)"/g;
let match;
while ((match = regex.exec(content)) !== null) {
  const [_, text, resourceId, bounds] = match;
  if (text || resourceId) {
    console.log(`Text: "${text}" | ID: "${resourceId}" | Bounds: ${bounds}`);
  }
}
