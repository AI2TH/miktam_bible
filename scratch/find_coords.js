const fs = require('fs');
const xml = fs.readFileSync('window_dump_now.xml', 'utf8');

const regex = /<node\s+([^>]+)>/g;
let m;
console.log('--- All parsed nodes with content ---');
while ((m = regex.exec(xml)) !== null) {
  const attrs = m[1];
  const textMatch = attrs.match(/text="([^"]*)"/);
  const descMatch = attrs.match(/content-desc="([^"]*)"/);
  const boundsMatch = attrs.match(/bounds="([^"]*)"/);
  
  const text = textMatch ? textMatch[1] : '';
  const desc = descMatch ? descMatch[1] : '';
  const bounds = boundsMatch ? boundsMatch[1] : '';
  
  if (text || desc) {
    const coordsMatch = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    let centerStr = '';
    if (coordsMatch) {
      const x1 = parseInt(coordsMatch[1]);
      const y1 = parseInt(coordsMatch[2]);
      const x2 = parseInt(coordsMatch[3]);
      const y2 = parseInt(coordsMatch[4]);
      const cx = Math.floor((x1 + x2) / 2);
      const cy = Math.floor((y1 + y2) / 2);
      centerStr = `Center: (${cx}, ${cy})`;
    }
    console.log(`Text: "${text}" | Desc: "${desc}" | Bounds: ${bounds} | ${centerStr}`);
  }
}
