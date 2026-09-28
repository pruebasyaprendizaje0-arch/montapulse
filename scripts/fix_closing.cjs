const fs = require('fs');
const path = require('path');

['pages/ExploreFeed.tsx', 'pages/Explore.tsx'].forEach(relPath => {
  const filePath = path.join(__dirname, '..', relPath);
  let code = fs.readFileSync(filePath, 'utf8');

  // Look for the end of filteredBusinesses.map(...)
  // Replace the closing block
  const pattern = /<\/div>\s*\)\s*\}\s*<\/div>\s*<\/div>\s*\)\s*\}/;
  
  code = code.replace(
    /<\/div>\s*\)\s*\}\s*<\/div>\s*<\/div>\s*\)\s*\}/,
    '</div>\n                            )}\n                        </div>\n                    </div>\n                )}'
  );

  // Or check line 2000
  code = code.replace(
    /<\/div>\s*\)\s*\}\s*<\/div>\s*<\/div>/,
    '</div>\n                            )}\n                        </div>\n                    </div>'
  );

  fs.writeFileSync(filePath, code, 'utf8');
});
