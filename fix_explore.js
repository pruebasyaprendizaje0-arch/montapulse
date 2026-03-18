const fs = require('fs');
const path = 'c:/Users/Frank/OneDrive/Desktop/montapulse/pages/Explore.tsx';
let content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

// We suspect line 926 is the extra </div>
// and 927 is the )}
// We want to remove line 926.

// Let's find the lines precisely.
const targetLine = lines[925]; // 0-indexed, so line 926 is index 925
console.log('Line 926 content:', targetLine);

if (targetLine.includes('</div>')) {
    lines.splice(925, 1);
    fs.writeFileSync(path, lines.join('\n'));
    console.log('Removed line 926');
} else {
    console.log('Line 926 did not contain </div>. Searching nearby...');
    // Fallback: search for the block
    content = content.replace(/<\/div>\s*<\/div>\s*<\/div>\s*}\)/, '</div>\n                    </div>\n                )}');
    fs.writeFileSync(path, content);
}
