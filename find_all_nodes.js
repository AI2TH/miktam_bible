const fs = require('fs');

const xml = fs.readFileSync('window_dump_now.xml', 'utf-8');

// Match <node ... /> tag
const regex = /<node[^>]*>/g;
let match;
const nodes = [];

while ((match = regex.exec(xml)) !== null) {
  const nodeStr = match[0];
  const textMatch = nodeStr.match(/text="([^"]*)"/);
  const resourceIdMatch = nodeStr.match(/resource-id="([^"]*)"/);
  const contentDescMatch = nodeStr.match(/content-desc="([^"]*)"/);
  const boundsMatch = nodeStr.match(/bounds="([^"]*)"/);
  const clickableMatch = nodeStr.match(/clickable="([^"]*)"/);
  const focusedMatch = nodeStr.match(/focused="([^"]*)"/);
  const classMatch = nodeStr.match(/class="([^"]*)"/);

  const text = textMatch ? textMatch[1] : '';
  const resourceId = resourceIdMatch ? resourceIdMatch[1] : '';
  const contentDesc = contentDescMatch ? contentDescMatch[1] : '';
  const bounds = boundsMatch ? boundsMatch[1] : '';
  const clickable = clickableMatch ? clickableMatch[1] : '';
  const focused = focusedMatch ? focusedMatch[1] : '';
  const className = classMatch ? classMatch[1] : '';

  if (text || contentDesc || resourceId || clickable === 'true') {
    nodes.push({
      text,
      resourceId,
      contentDesc,
      bounds,
      clickable,
      focused,
      className
    });
  }
}

console.log(`Total nodes found: ${nodes.length}`);
nodes.forEach((n, idx) => {
  console.log(`${idx + 1}: class="${n.className}" text="${n.text}" desc="${n.contentDesc}" id="${n.resourceId}" clickable="${n.clickable}" focused="${n.focused}" bounds="${n.bounds}"`);
});
