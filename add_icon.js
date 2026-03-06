const fs = require('fs');
const img = fs.readFileSync('frontend/public/pdf-icon.png');
const base64 = img.toString('base64');
const content = '\nexport const PDF_ICON_B64 = "data:image/png;base64,' + base64 + '";\n';
fs.appendFileSync('frontend/lib/utils/pdfAssets.ts', content);
console.log('Appended PDF_ICON_B64');
