const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const distDir = path.join(__dirname, 'dist');

// Clean and create dist
if (fs.existsSync(distDir)) fs.rmSync(distDir, { recursive: true });
fs.mkdirSync(path.join(distDir, 'assets'), { recursive: true });
fs.mkdirSync(path.join(distDir, 'data'), { recursive: true });

// Find price list folders
var priceLists = fs.readdirSync(dataDir).filter(function (f) {
    return /^\d{4}-\d{2}$/.test(f) && fs.existsSync(path.join(dataDir, f, 'products.json'));
}).sort().reverse();

// Write manifest
fs.writeFileSync(path.join(distDir, 'data', 'manifest.json'), JSON.stringify(priceLists));

// Copy price list data
priceLists.forEach(function (folder) {
    var dest = path.join(distDir, 'data', folder);
    fs.mkdirSync(dest, { recursive: true });
    fs.copyFileSync(path.join(dataDir, folder, 'products.json'), path.join(dest, 'products.json'));
});

// Copy assets
fs.readdirSync(path.join(__dirname, 'assets')).forEach(function (f) {
    fs.copyFileSync(path.join(__dirname, 'assets', f), path.join(distDir, 'assets', f));
});

// Copy index.html
fs.copyFileSync(path.join(__dirname, 'index.html'), path.join(distDir, 'index.html'));

console.log('Build complete. Price lists:', priceLists.join(', '));
console.log('Output:', distDir);
