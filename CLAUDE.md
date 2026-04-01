# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

B2B tire dealer cost calculator for Bridgestone, Lassa, Dayton, and Firestone tires. Calculates the net dealer cost from KDV-included list prices by removing taxes, applying invoice discounts, and computing bonuses.

## Commands

```bash
# Build (generates dist/ with manifest.json and all assets)
node build.js

# Local dev server
npx serve dist -l 8080

# Deploy to Vercel production
npx vercel --prod

# Parse a new price list from Excel
node parse-price-list.js <excel-file> <YYYY-MM>
# Example: node parse-price-list.js "fiyat-listesi.xlsx" 2026-04
# Then rebuild: node build.js
```

## Architecture

Static HTML + JS app deployed to Vercel. No server-side runtime. All computation is client-side.

**Data flow:** `build.js` scans `data/` for `YYYY-MM` folders containing `products.json`, generates `data/manifest.json`, and copies everything to `dist/`. At runtime, `script.js` fetches `manifest.json` to discover available price lists, then fetches the selected period's `products.json` and the previous period's for price comparison.

**Config lives in `assets/config.js`** as a global `CONFIG` object — KDV rate, GEKAP/ek bedel amounts, discount definitions, prim definitions. This is the single source of truth for all business constants.

**Price list parsing:** `parse-price-list.js` reads Excel files with brand/season sheets. Standard sheets (Bridgestone, Lassa, Dayton) have columns: code, size, pattern, speed_load, price. Firestone sheet has a different layout (combined size+pattern in column). Output goes to `data/<YYYY-MM>/products.json`.

## Calculation Logic (Critical Business Rules)

Price structure: `KDV Hariç + %20 KDV + 39.50 TL (GEKAP+bedel) = Liste Fiyatı`

To reverse: `KDV Hariç = (Liste Fiyatı - 39.50) / 1.20`

**Two distinct discount groups — do not mix:**

1. **Fatura Altı İskontolar** (applied on invoice, cascading/multiplicative):
   - %25 fatura altı — always applied, cannot be toggled off
   - %3 ön sipariş — optional toggle

2. **Primler** (calculated on the final invoice price, paid separately to dealers later):
   - %2 dönem sonu, %1 otopratik, %2 sell-out (entegrasyon), %3 filo, %3/%4 HRD
   - These are NOT cascaded; each is calculated independently on the same invoice price

**Prim visibility rules:**
- Tarım category or Firestone brand → all optional discounts and prims disabled
- Dönem sonu prim → only for Bridgestone and Lassa
- Otopratik and Filo → require Sell-out (entegrasyon) to be enabled first
- HRD prim → disabled when product rim size ≤ 16"

Rounding: `Math.round(n * 100) / 100` at every intermediate step (matches Turkish invoice rounding).

## Updating Price Lists

1. Get the Excel file from Bridgestone
2. Run: `node parse-price-list.js "file.xlsx" YYYY-MM`
3. Verify output in `data/<YYYY-MM>/products.json`
4. Run `node build.js` to regenerate `dist/` and `data/manifest.json`
5. Deploy: `npx vercel --prod`

Product JSON schema:
```json
{"code":"219782","size":"295/35R20","pattern":"DRIVEWAYS SPORT+","speed_load":"105Y XL","category":"Binek","brand":"Lassa","season":"Yaz","list_price_kdv_dahil":13874}
```

Brands: `Bridgestone`, `Lassa`, `Dayton`, `Firestone`
Seasons: `Yaz`, `Kış`, `Dört Mevsim` (auto-detected for patterns like MULTIWAYS, TURANZA ALL SEASON, A005 EVO)
Categories: `Binek`, `4x4`, `Ticari`, `Tarım`

## Language

All UI text and labels are in Turkish. The user communicates in Turkish.
