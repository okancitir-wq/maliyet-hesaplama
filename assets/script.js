document.addEventListener('DOMContentLoaded', function () {
    var productSelect = document.getElementById('product-select');
    var manualPriceInput = document.getElementById('manual-price');
    var resultsContainer = document.getElementById('results-container');
    var resultsBody = document.getElementById('results-body');
    var searchInput = document.getElementById('product-search');
    var filterRadios = document.querySelectorAll('input[name="category"], input[name="brand"], input[name="season"], input[name="rim"]');
    var selectedProductCode = '';
    var warningMessage = '<br>Bu program şu anda test aşamasındadır. Bu grubun hesaplaması henüz sisteme eklenmemiştir, ilerleyen güncellemelerde eklenecektir.<br><br>Gösterilen sonuçlar doğru olmayabilir.';

    var warningModal = null;
    function showWarning(title) {
        var modalEl = document.getElementById('warningModal');
        var modalBody = document.getElementById('warningModalBody');
        if (modalEl && modalBody && typeof bootstrap !== 'undefined') {
            if (!warningModal) {
                warningModal = new bootstrap.Modal(modalEl);
            }
            modalBody.innerHTML = '<strong>' + title + '</strong>' + warningMessage;
            warningModal.show();
        } else {
            alert(title + '\n\nBu program şu anda test aşamasındadır. Bu grubun hesaplaması henüz sisteme eklenmemiştir, ilerleyen güncellemelerde eklenecektir.\n\nGösterilen sonuçlar doğru olmayabilir.');
        }
    }

    // Data loaded via fetch
    var products = [];
    var prevPriceMap = null;
    var prevListLabel = null;
    var priceLists = [];
    var selectedList = '';

    // Shortcuts to config
    var kdvRate = CONFIG.kdvRate;
    var toplamEkBedel = CONFIG.toplamEkBedel;
    var faturaAltiIskontolar = CONFIG.faturaAltiIskontolar;
    var primler = CONFIG.primler;
    var hrdPrimi = CONFIG.hrdPrimi;
    var months = CONFIG.months;

    // --- Initialization ---
    function init() {
        fetch('data/manifest.json')
            .then(function (r) { return r.json(); })
            .then(function (lists) {
                priceLists = lists;
                // Determine selected list from URL or default to newest
                var params = new URLSearchParams(window.location.search);
                var listParam = params.get('liste');
                selectedList = (listParam && priceLists.indexOf(listParam) !== -1) ? listParam : priceLists[0];
                renderPriceListButtons();
                return loadProducts(selectedList);
            })
            .then(function () {
                populateDropdown();
                updatePrimVisibility();
                calculate();
            });
    }

    function renderPriceListButtons() {
        var container = document.getElementById('price-list-container');
        container.innerHTML = '';
        priceLists.forEach(function (list) {
            var parts = list.split('-');
            var label = months[parts[1]] + ' ' + parts[0];
            var input = document.createElement('input');
            input.type = 'radio';
            input.className = 'btn-check';
            input.name = 'price-list';
            input.id = 'list-' + list;
            input.value = list;
            if (list === selectedList) input.checked = true;

            var lbl = document.createElement('label');
            lbl.className = 'btn btn-outline-secondary btn-sm';
            lbl.setAttribute('for', 'list-' + list);
            lbl.textContent = label;

            container.appendChild(input);
            container.appendChild(lbl);

            input.addEventListener('change', function () {
    
                window.location.search = '?liste=' + this.value;
            });
        });
    }

    function loadProducts(listFolder) {
        var fetchCurrent = fetch('data/' + listFolder + '/products.json')
            .then(function (r) { return r.json(); })
            .then(function (data) { products = data; });

        // Find previous list for comparison
        var prevLists = priceLists.filter(function (l) { return l < listFolder; });
        var fetchPrev;
        if (prevLists.length > 0) {
            var prevFolder = prevLists[0];
            fetchPrev = fetch('data/' + prevFolder + '/products.json')
                .then(function (r) { return r.json(); })
                .then(function (prevProducts) {
                    prevPriceMap = {};
                    prevProducts.forEach(function (p) {
                        prevPriceMap[p.code] = p.list_price_kdv_dahil;
                    });
                    var prevParts = prevFolder.split('-');
                    prevListLabel = months[prevParts[1]] + ' ' + prevParts[0];
                });
        } else {
            prevPriceMap = null;
            prevListLabel = null;
            fetchPrev = Promise.resolve();
        }

        return Promise.all([fetchCurrent, fetchPrev]);
    }


    // --- Filtering & Dropdown ---
    function getFilters() {
        var brand = (document.querySelector('input[name="brand"]:checked') || {}).value || '';
        var season = (document.querySelector('input[name="season"]:checked') || {}).value || '';
        var category = (document.querySelector('input[name="category"]:checked') || {}).value || '';
        var rim = (document.querySelector('input[name="rim"]:checked') || {}).value || '';
        return { brand: brand, season: season, category: category, rim: rim, search: searchInput.value };
    }

    function populateDropdown() {
        var filters = getFilters();
        var filtered = getFilteredProducts(filters);
        productSelect.innerHTML = '<option value="">-- Ürün seçin (' + filtered.length + ' ürün) --</option>';
        filtered.forEach(function (p) {
            var option = document.createElement('option');
            option.value = p.list_price_kdv_dahil;
            option.dataset.code = p.code;
            option.dataset.size = p.size;
            option.dataset.category = p.category;
            option.textContent = p.brand + ' | ' + p.code + ' | ' + p.size + ' | ' + p.pattern + ' ' + p.speed_load + ' | ' + formatCurrency(p.list_price_kdv_dahil) + ' TL';
            if (p.code === selectedProductCode) {
                option.selected = true;
            }
            productSelect.appendChild(option);
        });
    }

    function getFilteredProducts(filters) {
        return products.filter(function (p) {
            if (filters.brand && p.brand !== filters.brand) return false;
            if (filters.season && p.season !== filters.season) return false;
            if (filters.category && p.category !== filters.category) return false;
            if (filters.rim) {
                var rimMatch = p.size.match(/R(\d+)/i);
                var pRim = rimMatch ? parseInt(rimMatch[1], 10) : 0;
                if (filters.rim === 'plus') {
                    if (pRim >= 13 && pRim <= 22) return false;
                } else {
                    if (pRim !== parseInt(filters.rim, 10)) return false;
                }
            }
            var filter = filters.search;
            if (!filter) return true;
            var sizeDigits = p.size.replace(/[^0-9]/g, '');
            var searchStr = (p.code + ' ' + p.size + ' ' + sizeDigits + ' ' + p.pattern + ' ' + p.speed_load + ' ' + p.category + ' ' + p.brand + ' ' + p.season).toLowerCase();
            var filterDigits = filter.replace(/[^0-9]/g, '');
            var isDigitsOnly = /^\d+$/.test(filter.replace(/[\s\/\-\.]/g, ''));
            if (isDigitsOnly && filterDigits.length >= 5) {
                return sizeDigits.indexOf(filterDigits) !== -1;
            }
            var terms = filter.toLowerCase().split(/\s+/);
            return terms.every(function (term) {
                return searchStr.indexOf(term) !== -1;
            });
        });
    }

    // --- Event Listeners ---
    document.getElementById('reset-btn').addEventListener('click', function () {
        selectedProductCode = '';
        searchInput.value = '';
        manualPriceInput.value = '';
        document.querySelectorAll('input[name="brand"], input[name="season"], input[name="category"], input[name="rim"]').forEach(function (r) {
            r.checked = r.value === '';
        });
        document.querySelectorAll('.discount-toggle').forEach(function (el) {
            if (el.disabled && el.checked) return;
            el.checked = false;
        });
        document.querySelectorAll('.hrd-toggle').forEach(function (cb) {
            cb.checked = false;
        });
        populateDropdown();
        updatePrimVisibility();
        calculate();
    });

    searchInput.addEventListener('input', function () {
        populateDropdown();
    });

    filterRadios.forEach(function (radio) {
        radio.addEventListener('change', function () {
            if (this.id === 'cat-tarim') {
                showWarning('Tarım grubu seçtiniz.');
            }
            if (this.id === 'brand-firestone') {
                showWarning('Firestone markası seçtiniz.');
            }
            populateDropdown();
            updatePrimVisibility();
            calculate();

        });
    });

    productSelect.addEventListener('change', function () {
        var opt = this.options[this.selectedIndex];
        selectedProductCode = (opt && opt.dataset.code) ? opt.dataset.code : '';
        if (this.value) {
            manualPriceInput.value = '';
        }
        // Seçilen ürün tarım veya firestone ise uyar
        if (opt && opt.dataset.category === 'Tarım') {
            showWarning('Tarım grubu ürün seçtiniz.');
        }
        var productText = (opt && opt.textContent) || '';
        if (productText.split('|')[0].trim() === 'Firestone') {
            showWarning('Firestone ürünü seçtiniz.');
        }
        updatePrimVisibility();
        calculate();
    });

    manualPriceInput.addEventListener('input', function () {
        if (this.value) {
            productSelect.value = '';
            selectedProductCode = '';
        }
        updatePrimVisibility();
        calculate();
    });

    document.querySelectorAll('.discount-toggle').forEach(function (el) {
        el.addEventListener('change', function () {
            if (el.id === 'discount-entegrasyon') {
                updateDependentPrims();
            }
            calculate();

        });
    });

    document.querySelectorAll('.hrd-toggle').forEach(function (cb) {
        cb.addEventListener('change', function () {
            if (this.checked) {
                document.querySelectorAll('.hrd-toggle').forEach(function (other) {
                    if (other !== cb) other.checked = false;
                });
            }
            calculate();

        });
    });

    // --- Prim Visibility ---
    function getSelectedProductBrand() {
        var opt = productSelect.options[productSelect.selectedIndex];
        if (!opt || !opt.value) return '';
        var text = opt.textContent || '';
        var parts = text.split('|');
        return parts.length > 0 ? parts[0].trim() : '';
    }

    function getActiveCategory() {
        var filterCat = (document.querySelector('input[name="category"]:checked') || {}).value || '';
        var opt = productSelect.options[productSelect.selectedIndex];
        var productCat = (opt && opt.dataset.category) ? opt.dataset.category : '';
        return productCat || filterCat;
    }

    function updatePrimVisibility() {
        var filterBrand = (document.querySelector('input[name="brand"]:checked') || {}).value || '';
        var productBrand = getSelectedProductBrand();
        var activeBrand = productBrand || filterBrand;
        var manual = manualPriceInput.value.replace(/\./g, '').replace(',', '.');
        var hasManualPrice = !isNaN(parseFloat(manual)) && parseFloat(manual) > 0 && !productSelect.value;
        var isTarim = getActiveCategory() === 'Tarım';
        var isFirestone = activeBrand === 'Firestone';

        if (isTarim || isFirestone) {
            document.querySelectorAll('.discount-toggle').forEach(function (el) {
                if (el.disabled && el.checked) return;
                el.checked = false;
                el.disabled = true;
                var parent = el.closest('.prim-toggle, div');
                if (parent) parent.classList.add('disabled-prim');
            });
            var hrdContainer = document.getElementById('hrd-container');
            hrdContainer.classList.add('disabled-prim');
            hrdContainer.querySelectorAll('.hrd-toggle').forEach(function (cb) { cb.checked = false; cb.disabled = true; });
            return;
        }

        document.querySelectorAll('.discount-toggle').forEach(function (el) {
            if (el.disabled && el.checked) return;
            el.disabled = false;
            var parent = el.closest('.prim-toggle, div');
            if (parent) parent.classList.remove('disabled-prim');
        });

        document.querySelectorAll('.prim-toggle[data-brands]').forEach(function (div) {
            var allowed = div.dataset.brands.split(',');
            var enabled = hasManualPrice || !activeBrand || allowed.indexOf(activeBrand) !== -1;
            if (!enabled) {
                div.classList.add('disabled-prim');
                div.querySelectorAll('input[type="checkbox"]').forEach(function (cb) { cb.checked = false; cb.disabled = true; });
            } else {
                div.classList.remove('disabled-prim');
                div.querySelectorAll('input[type="checkbox"]').forEach(function (cb) { cb.disabled = false; });
            }
        });

        var hrdContainer = document.getElementById('hrd-container');
        var maxRim = parseInt(hrdContainer.dataset.maxRim, 10);
        var rimFilter = (document.querySelector('input[name="rim"]:checked') || {}).value || '';
        var rimVal = parseInt(rimFilter, 10);
        var opt = productSelect.options[productSelect.selectedIndex];
        if (opt && opt.dataset.size) {
            var rimMatch = opt.dataset.size.match(/R(\d+)/i);
            if (rimMatch) rimVal = parseInt(rimMatch[1], 10);
        }
        var disableHrd = !hasManualPrice && !isNaN(rimVal) && rimVal <= maxRim;
        var hrdToggles = hrdContainer.querySelectorAll('.hrd-toggle');
        if (disableHrd) {
            hrdContainer.classList.add('disabled-prim');
            hrdToggles.forEach(function (cb) { cb.checked = false; cb.disabled = true; });
        } else {
            hrdContainer.classList.remove('disabled-prim');
            hrdToggles.forEach(function (cb) { cb.disabled = false; });
        }

        updateDependentPrims();
    }

    function updateDependentPrims() {
        var entegrasyonCb = document.getElementById('discount-entegrasyon');
        if (!entegrasyonCb) return;
        var dependents = ['discount-otopratik', 'discount-filo'];
        dependents.forEach(function (id) {
            var cb = document.getElementById(id);
            if (!cb) return;
            if (!entegrasyonCb.checked) {
                cb.checked = false;
                cb.disabled = true;
                cb.closest('.prim-toggle, div').classList.add('disabled-prim');
            } else {
                cb.disabled = false;
                cb.closest('.prim-toggle, div').classList.remove('disabled-prim');
            }
        });
    }

    // --- Calculation ---
    function getListPrice() {
        var manual = manualPriceInput.value.replace(/\./g, '').replace(',', '.');
        var price = parseFloat(manual);
        if (!isNaN(price) && price > 0) return price;
        var selected = parseFloat(productSelect.value);
        if (!isNaN(selected) && selected > 0) return selected;
        return 0;
    }

    function getActiveDiscounts(group) {
        var active = [];
        var items = group === 'fatura_alti' ? faturaAltiIskontolar : primler;
        for (var key in items) {
            var item = items[key];
            var checkbox = document.getElementById('discount-' + key);
            if (item.fixed || (checkbox && checkbox.checked)) {
                active.push({ key: key, label: item.label, rate: item.rate });
            }
        }
        return active;
    }

    function calculate() {
        var listPrice = getListPrice();
        if (listPrice <= 0) {
            resultsContainer.classList.remove('visible');
            return;
        }

        var html = '';

        // Step 1: List price
        html += resultRow('Liste Fiyatı (KDV Dahil)', formatCurrency(listPrice) + ' TL', '');
        if (selectedProductCode) {
            html += getPriceChangeHtml(selectedProductCode, listPrice);
        }

        // Step 2: Remove GEKAP + Ek Bedel, then KDV
        html += resultRow('GEKAP + Ek Bedel', '- ' + formatCurrency(toplamEkBedel) + ' TL', 'discount');
        var afterEkBedel = roundTwo(listPrice - toplamEkBedel);
        var kdvHaric = roundTwo(afterEkBedel / (1 + kdvRate));
        var kdvAmount = roundTwo(afterEkBedel - kdvHaric);
        html += resultRow('KDV (%' + (kdvRate * 100) + ')', '- ' + formatCurrency(kdvAmount) + ' TL', 'discount');
        html += resultRow('KDV Hariç Fiyat', formatCurrency(kdvHaric) + ' TL', 'subtotal');

        // Step 3: Fatura alti discounts (cascade)
        var currentPrice = kdvHaric;
        var activeFaturaAlti = getActiveDiscounts('fatura_alti');
        activeFaturaAlti.forEach(function (d) {
            var discountAmount = roundTwo(currentPrice * d.rate);
            currentPrice = roundTwo(currentPrice - discountAmount);
            html += resultRow(d.label + ' (%' + (d.rate * 100) + ')', '- ' + formatCurrency(discountAmount) + ' TL', 'discount');
        });

        var faturaFiyati = currentPrice;
        html += '<div class="divider"></div>';
        html += resultRow('FATURA FİYATI (KDV Hariç)', formatCurrency(faturaFiyati) + ' TL', 'subtotal');

        // Step 4: Prims (calculated on fatura fiyati, not cascaded)
        var activePrimler = getActiveDiscounts('primler');
        var hrdRate = 0;
        var checkedHrd = document.querySelector('.hrd-toggle:checked');
        if (checkedHrd) hrdRate = parseFloat(checkedHrd.value) || 0;
        var toplamPrim = 0;
        var hasPrim = activePrimler.length > 0 || hrdRate > 0;
        if (hasPrim) {
            html += '<div class="divider"></div>';
            activePrimler.forEach(function (d) {
                var primAmount = roundTwo(faturaFiyati * d.rate);
                toplamPrim = roundTwo(toplamPrim + primAmount);
                html += resultRow(d.label + ' (%' + (d.rate * 100) + ')', '- ' + formatCurrency(primAmount) + ' TL', 'prim');
            });
            if (hrdRate > 0) {
                var hrdAmount = roundTwo(faturaFiyati * hrdRate);
                toplamPrim = roundTwo(toplamPrim + hrdAmount);
                html += resultRow(hrdPrimi.label + ' (%' + (hrdRate * 100) + ')', '- ' + formatCurrency(hrdAmount) + ' TL', 'prim');
            }
        }

        // Step 5: Net cost
        var netMaliyet = roundTwo(faturaFiyati - toplamPrim);

        // Step 6: Net cost with KDV + GEKAP + Ek Bedel
        var netKdv = roundTwo(netMaliyet * kdvRate);
        var netKdvDahil = roundTwo(netMaliyet + netKdv + toplamEkBedel);

        html += '<div class="divider"></div>';
        html += resultRow('Net Bayi Maliyeti (KDV Hariç)', formatCurrency(netMaliyet) + ' TL', 'subtotal');
        html += resultRow('KDV (%' + (kdvRate * 100) + ')', '+ ' + formatCurrency(netKdv) + ' TL', '');
        html += resultRow('GEKAP + Ek Bedel', '+ ' + formatCurrency(toplamEkBedel) + ' TL', '');

        resultsBody.innerHTML = html;

        document.getElementById('final-price').textContent = formatCurrency(netMaliyet) + ' TL';
        document.getElementById('final-price-kdv').textContent = formatCurrency(netKdvDahil) + ' TL';

        var effectiveDiscount = kdvHaric > 0 ? roundTwo((1 - netMaliyet / kdvHaric) * 100) : 0;
        document.getElementById('effective-discount').textContent = '%' + formatNumber(effectiveDiscount);

        resultsContainer.classList.add('visible');
    }

    // --- Helpers ---
    function resultRow(label, value, cssClass) {
        return '<div class="result-row ' + (cssClass || '') + '">' +
            '<span>' + label + '</span>' +
            '<span>' + value + '</span>' +
            '</div>';
    }

    function roundTwo(n) {
        return Math.round(n * 100) / 100;
    }

    function formatCurrency(n) {
        return new Intl.NumberFormat('tr-TR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(n);
    }

    function formatNumber(n) {
        return new Intl.NumberFormat('tr-TR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(n);
    }

    function getPriceChangeHtml(code, currentPrice) {
        if (!prevPriceMap) return '';
        var prevPrice = prevPriceMap[code];
        if (prevPrice === undefined || prevPrice <= 0) {
            return '<div class="price-change new-product"><i class="bi bi-plus-circle-fill"></i> Yeni ürün</div>';
        }
        if (prevPrice === currentPrice) {
            return '<div class="price-change no-change"><i class="bi bi-dash-circle"></i> Fiyat değişmedi (' + prevListLabel + ')</div>';
        }
        var changePercent = roundTwo(((currentPrice - prevPrice) / prevPrice) * 100);
        if (currentPrice > prevPrice) {
            return '<div class="price-change increase"><i class="bi bi-arrow-up-circle-fill"></i> +%' + formatNumber(changePercent) + ' (' + prevListLabel + ': ' + formatCurrency(prevPrice) + ' TL)</div>';
        }
        return '<div class="price-change decrease"><i class="bi bi-arrow-down-circle-fill"></i> -%' + formatNumber(Math.abs(changePercent)) + ' (' + prevListLabel + ': ' + formatCurrency(prevPrice) + ' TL)</div>';
    }

    // Start
    init();
});
