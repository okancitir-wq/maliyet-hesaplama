<?php
require_once __DIR__ . '/includes/config.php';

// Scan data/ for price list folders (YYYY-MM format)
$priceLists = [];
foreach (glob(__DIR__ . '/data/*/products.json') as $file) {
    $folder = basename(dirname($file));
    if (preg_match('/^\d{4}-\d{2}$/', $folder)) {
        $priceLists[] = $folder;
    }
}
rsort($priceLists); // newest first

$selectedList = isset($_GET['liste']) && in_array($_GET['liste'], $priceLists) ? $_GET['liste'] : $priceLists[0];

$months = [
    '01' => 'Ocak', '02' => 'Şubat', '03' => 'Mart', '04' => 'Nisan',
    '05' => 'Mayıs', '06' => 'Haziran', '07' => 'Temmuz', '08' => 'Ağustos',
    '09' => 'Eylül', '10' => 'Ekim', '11' => 'Kasım', '12' => 'Aralık',
];

$productsJson = file_get_contents(__DIR__ . '/data/' . $selectedList . '/products.json');
$products = json_decode($productsJson, true) ?: [];
?>
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lastik Maliyet Hesaplama</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
    <link href="assets/style.css" rel="stylesheet">
</head>
<body>
    <!-- Password Screen -->
    <div id="password-screen">
        <div class="password-card card shadow-sm">
            <div class="header-bar">
                <i class="bi bi-lock-fill"></i> Giriş
            </div>
            <div class="card-body p-4 text-center">
                <p class="mb-3" style="color:#6c757d;">Devam etmek için parola girin</p>
                <div class="input-group mb-3" style="max-width:250px;margin:0 auto;">
                    <input type="password" id="password-input" class="form-control" placeholder="Parola" autofocus>
                    <button class="btn btn-primary" id="password-btn" type="button">Giriş</button>
                </div>
                <div id="password-error" style="color:#dc3545;display:none;font-size:0.85rem;">Hatalı parola</div>
            </div>
        </div>
    </div>

    <div class="main-card card shadow-sm" id="main-app" style="display:none;">
        <div class="header-bar">
            <i class="bi bi-calculator"></i> Lastik Maliyet Hesaplama
        </div>
        <div class="card-body p-4">
            <div class="two-col">

            <!-- LEFT COLUMN: Filters & Product Selection -->
            <div class="col-left">

                <!-- Price List Selector -->
                <div class="mb-3">
                    <label class="section-label">Fiyat Listesi</label>
                    <div class="d-flex flex-wrap gap-2">
                        <?php foreach ($priceLists as $list):
                            $parts = explode('-', $list);
                            $label = $months[$parts[1]] . ' ' . $parts[0];
                        ?>
                            <input type="radio" class="btn-check" name="price-list" id="list-<?= $list ?>" value="<?= $list ?>" <?= $list === $selectedList ? 'checked' : '' ?>>
                            <label class="btn btn-outline-secondary btn-sm" for="list-<?= $list ?>"><?= $label ?></label>
                        <?php endforeach; ?>
                    </div>
                </div>

                <!-- Brand Filter -->
                <div class="mb-3">
                    <label class="section-label">Marka</label>
                    <div class="d-flex flex-wrap gap-2">
                        <input type="radio" class="btn-check" name="brand" id="brand-all" value="" checked>
                        <label class="btn btn-outline-secondary btn-sm" for="brand-all">Tümü</label>
                        <input type="radio" class="btn-check" name="brand" id="brand-bridgestone" value="Bridgestone">
                        <label class="btn btn-outline-secondary btn-sm" for="brand-bridgestone">Bridgestone</label>
                        <input type="radio" class="btn-check" name="brand" id="brand-lassa" value="Lassa">
                        <label class="btn btn-outline-secondary btn-sm" for="brand-lassa">Lassa</label>
                        <input type="radio" class="btn-check" name="brand" id="brand-dayton" value="Dayton">
                        <label class="btn btn-outline-secondary btn-sm" for="brand-dayton">Dayton</label>
                        <input type="radio" class="btn-check" name="brand" id="brand-firestone" value="Firestone">
                        <label class="btn btn-outline-secondary btn-sm" for="brand-firestone">Firestone</label>
                    </div>
                </div>

                <!-- Season Filter -->
                <div class="mb-3">
                    <label class="section-label">Mevsim</label>
                    <div class="d-flex flex-wrap gap-2">
                        <input type="radio" class="btn-check" name="season" id="season-all" value="" checked>
                        <label class="btn btn-outline-secondary btn-sm" for="season-all">Tümü</label>
                        <input type="radio" class="btn-check" name="season" id="season-yaz" value="Yaz">
                        <label class="btn btn-outline-secondary btn-sm" for="season-yaz">Yaz</label>
                        <input type="radio" class="btn-check" name="season" id="season-kis" value="Kış">
                        <label class="btn btn-outline-secondary btn-sm" for="season-kis">Kış</label>
                        <input type="radio" class="btn-check" name="season" id="season-4m" value="Dört Mevsim">
                        <label class="btn btn-outline-secondary btn-sm" for="season-4m">Dört Mevsim</label>
                    </div>
                </div>

                <!-- Category Filter -->
                <div class="mb-3">
                    <label class="section-label">Kategori</label>
                    <div class="d-flex flex-wrap gap-2">
                        <input type="radio" class="btn-check" name="category" id="cat-all" value="" checked>
                        <label class="btn btn-outline-secondary btn-sm" for="cat-all">Tümü</label>
                        <input type="radio" class="btn-check" name="category" id="cat-binek" value="Binek">
                        <label class="btn btn-outline-secondary btn-sm" for="cat-binek">Binek</label>
                        <input type="radio" class="btn-check" name="category" id="cat-4x4" value="4x4">
                        <label class="btn btn-outline-secondary btn-sm" for="cat-4x4">4x4 / SUV</label>
                        <input type="radio" class="btn-check" name="category" id="cat-ticari" value="Ticari">
                        <label class="btn btn-outline-secondary btn-sm" for="cat-ticari">Ticari</label>
                        <input type="radio" class="btn-check" name="category" id="cat-tarim" value="Tarım">
                        <label class="btn btn-outline-secondary btn-sm" for="cat-tarim">Tarım</label>
                    </div>
                </div>

                <!-- Rim Size Filter -->
                <div class="mb-3">
                    <label class="section-label">Jant Ebatı</label>
                    <div class="d-flex flex-wrap gap-2">
                        <input type="radio" class="btn-check" name="rim" id="rim-all" value="" checked>
                        <label class="btn btn-outline-secondary btn-sm" for="rim-all">Tümü</label>
                        <?php for ($r = 13; $r <= 22; $r++): ?>
                            <input type="radio" class="btn-check" name="rim" id="rim-<?= $r ?>" value="<?= $r ?>">
                            <label class="btn btn-outline-secondary btn-sm" for="rim-<?= $r ?>"><?= $r ?>"</label>
                        <?php endfor; ?>
                        <input type="radio" class="btn-check" name="rim" id="rim-plus" value="plus">
                        <label class="btn btn-outline-secondary btn-sm" for="rim-plus">PLUS</label>
                    </div>
                </div>

                <!-- Search -->
                <div class="mb-3">
                    <label class="section-label">Ürün Ara</label>
                    <input type="text" id="product-search" class="form-control" placeholder="Ebat, desen veya kod ile ara... (ör: 205/55R16)">
                </div>

                <!-- Product Selection -->
                <div class="mb-3">
                    <label class="section-label">Ürün Seçimi</label>
                    <select id="product-select" class="form-select">
                        <option value="">-- Ürün seçin --</option>
                    </select>
                </div>

                <div class="or-divider">veya</div>

                <!-- Manual Price Input -->
                <div class="mb-3">
                    <label class="section-label">Manuel Fiyat Girişi (KDV Dahil)</label>
                    <div class="input-group manual-input-group">
                        <input type="text" id="manual-price" class="form-control" placeholder="0,00" inputmode="decimal">
                        <span class="input-group-text">TL</span>
                    </div>
                </div>

            </div>

            <!-- RIGHT COLUMN: Discounts & Results -->
            <div class="col-right">

                <!-- Fatura Altı İskontolar -->
                <div class="mb-3">
                    <label class="section-label">Fatura Altı İskontolar</label>
                    <div class="discount-toggles d-flex flex-wrap gap-2">
                        <?php foreach (FATURA_ALTI_ISKONTOLAR as $key => $item): ?>
                            <?php if ($item['fixed']): ?>
                                <div class="locked-discount">
                                    <input type="checkbox" class="btn-check discount-toggle" id="discount-<?= $key ?>" checked disabled>
                                    <label class="btn btn-success btn-sm" for="discount-<?= $key ?>">
                                        <?= $item['label'] ?> (%<?= $item['rate'] * 100 ?>)
                                        <i class="bi bi-lock-fill"></i>
                                    </label>
                                </div>
                            <?php else: ?>
                                <div>
                                    <input type="checkbox" class="btn-check discount-toggle" id="discount-<?= $key ?>" autocomplete="off">
                                    <label class="btn btn-outline-primary btn-sm" for="discount-<?= $key ?>">
                                        <?= $item['label'] ?> (%<?= $item['rate'] * 100 ?>)
                                    </label>
                                </div>
                            <?php endif; ?>
                        <?php endforeach; ?>
                    </div>
                </div>

                <!-- Primler -->
                <div class="mb-4">
                    <label class="section-label">Primler</label>
                    <div class="discount-toggles d-flex flex-wrap gap-2">
                        <?php foreach (PRIMLER as $key => $item): ?>
                            <div class="prim-toggle" <?= isset($item['brands']) ? 'data-brands="' . htmlspecialchars(implode(',', $item['brands'])) . '"' : '' ?>>
                                <input type="checkbox" class="btn-check discount-toggle" id="discount-<?= $key ?>" autocomplete="off">
                                <label class="btn btn-outline-primary btn-sm" for="discount-<?= $key ?>">
                                    <?= $item['label'] ?> (%<?= $item['rate'] * 100 ?>)
                                </label>
                            </div>
                        <?php endforeach; ?>
                        <!-- HRD Primi -->
                        <div id="hrd-container" class="prim-toggle d-flex gap-2" data-max-rim="<?= HRD_PRIMI['max_rim'] ?>">
                            <?php foreach (HRD_PRIMI['rates'] as $rate): ?>
                                <div>
                                    <input type="checkbox" class="btn-check hrd-toggle" id="hrd-<?= $rate * 100 ?>" value="<?= $rate ?>" autocomplete="off">
                                    <label class="btn btn-outline-primary btn-sm" for="hrd-<?= $rate * 100 ?>">
                                        <?= HRD_PRIMI['label'] ?> (%<?= $rate * 100 ?>)
                                    </label>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </div>

                <!-- Results -->
                <div id="results-container">
                    <div class="result-section">
                        <div id="results-body"></div>
                    </div>
                    <div class="final-result">
                        <div class="result-row">
                            <span>NET BAYİ MALİYETİ (KDV Hariç)</span>
                            <span id="final-price">0,00 TL</span>
                        </div>
                        <div class="result-row">
                            <span>NET BAYİ MALİYETİ (KDV, GEKAP ve Ek Bedel Dahil)</span>
                            <span id="final-price-kdv">0,00 TL</span>
                        </div>
                        <div class="result-row" style="font-size: 0.85rem; font-weight: 400; opacity: 0.85;">
                            <span>Toplam Etkin İskonto</span>
                            <span id="effective-discount">%0,00</span>
                        </div>
                    </div>
                </div>

            </div>

            </div>
        </div>
    </div>

    <script>
        var products = <?= json_encode($products, JSON_UNESCAPED_UNICODE) ?>;
        var kdvRate = <?= KDV_RATE ?>;
        var toplamEkBedel = <?= TOPLAM_EK_BEDEL ?>;
        var faturaAltiIskontolar = <?= json_encode(FATURA_ALTI_ISKONTOLAR, JSON_UNESCAPED_UNICODE) ?>;
        var primler = <?= json_encode(PRIMLER, JSON_UNESCAPED_UNICODE) ?>;
        var hrdPrimi = <?= json_encode(HRD_PRIMI, JSON_UNESCAPED_UNICODE) ?>;
    </script>
    <script src="assets/script.js"></script>
</body>
</html>
