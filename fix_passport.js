const fs = require('fs');
const path = 'c:/Users/Frank/OneDrive/Desktop/montapulse/pages/Passport.tsx';
let c = fs.readFileSync(path, 'utf8');

// The structure issue: the outer min-h-screen div closes prematurely
// after the stats grid, and the sections after it (Upcoming Pulses, 
// Options List, Your Vibe, Logout Button) are outside the return div.
// We need to:
// 1. Remove the extra </div> that prematurely closes outer div after stats grid
// 2. Ensure the modals come properly inside the outer div

// Find the stats grid close - patterns like:
//     </div>          <- closes Stats Grid
// </div>             <- closes outer div  (this is premature)
//
//                 {/* My Upcoming Pulses - this is outside!

const lines = c.split('\n');
let fixCount = 0;

// Find the premature close: a line with 12 spaces </div> (stats grid close)
// followed by a line with 8 spaces </div> (outer div close - premature)
// followed by empty line, followed by {/* My Upcoming

for (let i = 0; i < lines.length - 3; i++) {
    const l0 = lines[i].trimEnd();
    const l1 = lines[i + 1].trimEnd();
    const l2 = lines[i + 2].trimEnd();
    const l3 = lines[i + 3] || '';

    // Check for the pattern:
    // line i:   '            </div>'  (12 spaces, closes stats grid wrapper)
    // line i+1: '        </div>'      (8 spaces, closes outer div - premature)  
    // line i+2: ''
    // line i+3: contains 'My Upcoming Pulses'
    if (l0 === '            </div>' && l1 === '        </div>' && l2 === '' && l3.includes('Upcoming Pulses')) {
        // Remove the premature </div> 
        lines.splice(i + 1, 1);
        fixCount++;
        console.log('Fix 1 applied at line', i + 1, '- removed premature outer div close');
        break;
    }
}

// Now find the "Logout Button" section closing </div>
// followed by empty, followed by the Modals comment
// And insert the closing </div> for the outer div there
for (let i = 0; i < lines.length - 3; i++) {
    const l0 = lines[i].trimEnd();
    const l1 = lines[i + 1].trimEnd();
    const l2 = lines[i + 2] || '';

    // Line i: '    </div>'  (closes logout button div, 4 spaces)
    // Line i+1: ''
    // Line i+2 contains: 'Modals'
    if (l0 === '    </div>' && l1 === '' && l2.includes('Modals')) {
        // Insert the outer div closing after the logout button div
        lines.splice(i + 1, 0, '        </div>');
        fixCount++;
        console.log('Fix 2 applied at line', i + 1, '- added outer div close before modals');
        break;
    }
}

console.log('Total fixes:', fixCount);

const result = lines.join('\n');
fs.writeFileSync(path, result, 'utf8');
console.log('File written successfully');

// Verify: show context around modals
const newLines = result.split('\n');
const idx = newLines.findIndex(l => l.includes('Modals'));
console.log('Context around Modals section:');
for (let i = Math.max(0, idx - 4); i <= Math.min(newLines.length - 1, idx + 4); i++) {
    console.log(i + ': [' + (newLines[i] || '').substring(0, 100) + ']');
}
