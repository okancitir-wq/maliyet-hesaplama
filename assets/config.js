var CONFIG = {
    kdvRate: 0.20,
    gekapBedel: 33.00,
    ekBedel: 6.50,
    toplamEkBedel: 39.50,

    faturaAltiIskontolar: {
        fatura_alti: {
            label: 'Fatura Altı İskonto',
            rate: 0.25,
            fixed: true
        },
        on_siparis: {
            label: 'Ön Sipariş İskontosu',
            rate: 0.03,
            fixed: false
        }
    },

    primler: {
        donem_sonu: {
            label: 'Dönem Sonu Primi',
            rate: 0.02,
            brands: ['Bridgestone', 'Lassa']
        },
        entegrasyon: {
            label: 'Sell-out Primi',
            rate: 0.02
        },
        otopratik: {
            label: 'Otopratik Primi',
            rate: 0.01
        },
        filo: {
            label: 'Filo Primi',
            rate: 0.03
        }
    },

    hrdPrimi: {
        label: 'HRD Primi',
        rates: [0.03, 0.04],
        max_rim: 16
    },

    months: {
        '01': 'Ocak', '02': 'Şubat', '03': 'Mart', '04': 'Nisan',
        '05': 'Mayıs', '06': 'Haziran', '07': 'Temmuz', '08': 'Ağustos',
        '09': 'Eylül', '10': 'Ekim', '11': 'Kasım', '12': 'Aralık'
    }
};
