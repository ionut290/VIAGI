const fs = require('fs');

const requiredFiles = ['index.html', 'src/app.js', 'src/styles.css'];
const missingFiles = requiredFiles.filter((file) => !fs.existsSync(file));

if (missingFiles.length) {
  console.error(`Missing required files: ${missingFiles.join(', ')}`);
  process.exit(1);
}

const html = fs.readFileSync('index.html', 'utf8');
for (const asset of ['src/app.js', 'src/styles.css']) {
  if (!html.includes(asset)) {
    console.error(`index.html does not reference ${asset}`);
    process.exit(1);
  }
}

console.log('Static VIAGI app validation passed.');
