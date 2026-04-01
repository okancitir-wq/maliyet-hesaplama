# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

B2B tire dealer cost calculator for Bridgestone, Lassa, Dayton, and Firestone tires. Calculates the net dealer cost from KDV-included list prices by removing taxes, applying invoice discounts, and computing bonuses.

## Running the App

Served via XAMPP Apache. Files are copied to `C:/xampp/htdocs/maliyet-hesaplama/`. After changes, sync with:
```
cp -r * /c/xampp/htdocs/maliyet-hesaplama/
```
Access at: http://localhost/maliyet-hesaplama/

## Architecture

Single-page PHP app with client-side calculation (no AJAX). PHP renders the page and injects config/product data as JS variables. All computation happens in the browser for instant feedback.

**Key files:**
- `index.php` — Main page, renders UI, injects PHP constants as JS vars
- `includes/config.php` — KDV rate, GEKAP/ek bedel amounts, discount and bonus definitions
- `data/products.json` — Product catalog (code, size, pattern, speed_load, category, brand, season, price). Updated by replacing the file wholesale.
- `assets/script.js` — All calculation logic and DOM manipulation
- `assets/style.css` — Bootstrap 5 overrides and custom styles

## Calculation Logic (Critical Business Rules)

The price structure for list prices: `KDV Hariç + %20 KDV + 39.50 TL (GEKAP+bedel) = Liste Fiyatı`

To reverse: `KDV Hariç = (Liste Fiyatı - 39.50) / 1.20`

**Two distinct discount groups — do not mix:**

1. **Fatura Altı İskontolar** (applied on invoice, cascading/multiplicative):
   - %25 fatura altı — always applied, cannot be toggled off
   - %3 ön sipariş — optional toggle

2. **Primler** (calculated on the final invoice price, paid separately to dealers later):
   - %2 dönem sonu, %1 otopratik, %2 entegrasyon — each optional
   - These are NOT cascaded; each is calculated independently on the same invoice price

Rounding: `Math.round(n * 100) / 100` at every intermediate step (matches Turkish invoice rounding).

## Updating Price Lists

Replace `data/products.json` with new data. The JSON schema per product:
```json
{"code":"219782","size":"295/35R20","pattern":"DRIVEWAYS SPORT+","speed_load":"105Y XL","category":"Binek","brand":"Lassa","season":"Yaz","list_price_kdv_dahil":13874}
```
- **Brands:** `Bridgestone`, `Lassa`, `Dayton`, `Firestone`
- **Seasons:** `Yaz`, `Kış`, `Dört Mevsim` (detected by pattern names like MULTIWAYS, TURANZA ALL SEASON, A005 EVO)
- **Categories:** `Binek`, `4x4`, `Ticari`, `Tarım`
- Prices are integers in TL (KDV included).

Price list source is an Excel file with separate sheets per brand/season. Parse with Node.js `xlsx` package (installed in project). Firestone sheet has a different column layout (combined size+pattern in one column).

## Search

The search supports multiple modes:
- Text search: space-separated terms, all must match (searches code, size, pattern, speed_load, category, brand, season)
- Digit-only search: e.g. "2356516" matches size "235/65R16" by stripping non-digit characters from both search and size

## Filtering

Three filter dimensions work together: Brand (radio), Season (radio), Category (radio). All default to "Tümü" (all).

## Language

All UI text and labels are in Turkish. The user communicates in Turkish.
