const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];
const outputFolder = process.argv[3]; // e.g. "2026-01"

if (!filePath || !outputFolder) {
    console.error('Usage: node parse-price-list.js <excel-file> <output-folder>');
    console.error('Example: node parse-price-list.js "price-list.xlsx" 2026-01');
    process.exit(1);
}

const wb = XLSX.readFile(filePath);
const products = [];

const FOUR_SEASON_PATTERNS = [
    'MULTIWAYS', 'TURANZA ALL SEASON', 'A005 EVO'
];

function isFourSeason(pattern) {
    var upper = pattern.toUpperCase();
    return FOUR_SEASON_PATTERNS.some(function (p) { return upper.includes(p); });
}

function detectCategory(text) {
    var upper = text.toUpperCase();
    if (upper.includes('BİNEK')) return 'Binek';
    if (upper.includes('4X4') || upper.includes('SUV') || upper.includes('ARAZİ')) return '4x4';
    if (upper.includes('TİCARİ')) return 'Ticari';
    if (upper.includes('TARIM') || upper.includes('TRAKTÖR')) return 'Tarım';
    return null;
}

function isHeaderOrLabel(val) {
    if (val == null) return true;
    var s = String(val).trim();
    if (!s) return true;
    if (s.includes('JANT') || s.includes('SERİ') || s.includes('Seri')) return true;
    if (s.includes('LASTİK') || s.includes('LASTIK')) return true;
    if (s.includes('Satış Kodu') || s.includes('Ebat') || s.includes('EBAT')) return true;
    if (s.includes('Peşin') || s.includes('PEŞİN')) return true;
    if (s.includes('FİYAT') || s.includes('TAVSİYE')) return true;
    if (detectCategory(s)) return true;
    return false;
}

// Parse standard sheets (Bridgestone, Lassa, Dayton)
function parseStandardSheet(sheetName, brand, season) {
    if (!sheetName) return;
    var ws = wb.Sheets[sheetName];
    if (!ws) return;
    var data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

    // Find the price column index by looking for "Peşin" in header rows
    var priceCol = -1;
    for (var i = 0; i < 15; i++) {
        if (!data[i]) continue;
        for (var j = 0; j < data[i].length; j++) {
            var cell = String(data[i][j] || '');
            if (cell.includes('Peşin') || cell.includes('PEŞİN')) {
                priceCol = j;
                break;
            }
        }
        if (priceCol >= 0) break;
    }

    // For Dayton, price col might be index 4 without explicit header
    if (priceCol < 0 && brand === 'Dayton') {
        priceCol = 4;
    }

    var currentCategory = 'Binek';
    var lastSize = '';
    var count = 0;

    for (var i = 0; i < data.length; i++) {
        var row = data[i];
        if (!row || row.length === 0) continue;

        var firstCell = row[0];
        var firstStr = String(firstCell || '').trim();

        // Check for category header
        var cat = detectCategory(firstStr);
        if (cat) {
            currentCategory = cat;
            continue;
        }

        // Skip label/header rows
        if (isHeaderOrLabel(firstCell)) continue;

        var code = firstStr;

        // Must look like a product code (numeric or alphanumeric like D11027)
        if (!/^\d+$/.test(code) && !/^[A-Z]\d+/i.test(code)) continue;

        var size = row[1] != null ? String(row[1]).trim() : '';
        var pattern = row[2] != null ? String(row[2]).trim() : '';
        var speedLoad = row[3] != null ? String(row[3]).trim() : '';

        // Handle rows where size is empty (inherited from previous)
        if (!size && lastSize) {
            size = lastSize;
        }
        if (size) {
            lastSize = size;
        }

        var price = row[priceCol];
        if (price == null || price === '') continue;
        price = Math.round(parseFloat(price));
        if (isNaN(price) || price <= 0) continue;

        if (!size || !pattern) continue;

        var actualSeason = season;
        if (isFourSeason(pattern)) actualSeason = 'Dört Mevsim';

        products.push({
            code: code,
            size: size,
            pattern: pattern,
            speed_load: speedLoad,
            category: currentCategory,
            brand: brand,
            season: actualSeason,
            list_price_kdv_dahil: price
        });
        count++;
    }

    console.log('  ' + sheetName.trim() + ': ' + count + ' products (priceCol=' + priceCol + ')');
}

// Parse Firestone sheet (combined size+pattern in one column)
function parseFirestoneSheet() {
    var ws = wb.Sheets['FIRESTONE'];
    if (!ws) return;
    var data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    var count = 0;

    for (var i = 2; i < data.length; i++) {
        var row = data[i];
        if (!row || row.length < 8) continue;

        var code = row[0];
        if (code == null || String(code).trim() === '') continue;
        code = String(code).trim();
        if (!/^\d+$/.test(code)) continue;

        var desc = String(row[2] || '');
        // Extract size: digits/dots/slashes + space? + R + digits
        var sizeMatch = desc.match(/^([\d./]+\s*R\s*\d+)\s+/i);
        if (!sizeMatch) continue;

        var size = sizeMatch[1].replace(/\s+/g, ' ').trim();
        var rest = desc.substring(sizeMatch[0].length).trim();
        // Pattern is the next word(s) before TL or before the speed/load code
        var patternMatch = rest.match(/^(\S+)/);
        var pattern = patternMatch ? patternMatch[1] : rest;

        var speedLoad = String(row[6] || '').trim();
        var price = Math.round(parseFloat(row[7]));
        if (isNaN(price) || price <= 0) continue;

        products.push({
            code: code,
            size: size,
            pattern: pattern,
            speed_load: speedLoad,
            category: 'Tarım',
            brand: 'Firestone',
            season: 'Yaz',
            list_price_kdv_dahil: price
        });
        count++;
    }

    console.log('  FIRESTONE: ' + count + ' products');
}

// Find sheet by keywords
function findSheet(brand, season) {
    return wb.SheetNames.find(function (s) {
        var upper = s.toUpperCase();
        return upper.includes(brand.toUpperCase()) && upper.includes(season.toUpperCase());
    });
}

console.log('Parsing sheets...');
parseStandardSheet(findSheet('BRIDGESTONE', 'YAZ'), 'Bridgestone', 'Yaz');
parseStandardSheet(findSheet('BRIDGESTONE', 'KIŞ'), 'Bridgestone', 'Kış');
parseStandardSheet(findSheet('LASSA', 'YAZ'), 'Lassa', 'Yaz');
parseStandardSheet(findSheet('LASSA', 'KIŞ'), 'Lassa', 'Kış');
parseStandardSheet(findSheet('DAYTON', 'YAZ'), 'Dayton', 'Yaz');
parseStandardSheet(findSheet('DAYTON', 'KIŞ'), 'Dayton', 'Kış');
parseFirestoneSheet();

// Write output
var outDir = path.join(__dirname, 'data', outputFolder);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
var outFile = path.join(outDir, 'products.json');
fs.writeFileSync(outFile, JSON.stringify(products, null, 2), 'utf8');

// Summary
var summary = {};
products.forEach(function (p) {
    var key = p.brand + ' / ' + p.season + ' / ' + p.category;
    summary[key] = (summary[key] || 0) + 1;
});
console.log('\nTotal products: ' + products.length);
Object.keys(summary).sort().forEach(function (k) {
    console.log('  ' + k + ': ' + summary[k]);
});
console.log('\nOutput: ' + outFile);
