<?php

const KDV_RATE = 0.20;
const GEKAP_BEDEL = 33.00;
const EK_BEDEL = 6.50;
const TOPLAM_EK_BEDEL = GEKAP_BEDEL + EK_BEDEL; // 39.50 TL

const FATURA_ALTI_ISKONTOLAR = [
    'fatura_alti' => [
        'label' => 'Fatura Altı İskonto',
        'rate'  => 0.25,
        'fixed' => true,
    ],
    'on_siparis' => [
        'label' => 'Ön Sipariş İskontosu',
        'rate'  => 0.03,
        'fixed' => false,
    ],
];

const PRIMLER = [
    'donem_sonu' => [
        'label' => 'Dönem Sonu Primi',
        'rate'  => 0.02,
        'brands' => ['Bridgestone', 'Lassa'],
    ],
    'entegrasyon' => [
        'label' => 'Sell-out Primi',
        'rate'  => 0.02,
    ],
    'otopratik' => [
        'label' => 'Otopratik Primi',
        'rate'  => 0.01,
    ],
    'filo' => [
        'label' => 'Filo Primi',
        'rate'  => 0.03,
    ],
];

const HRD_PRIMI = [
    'label' => 'HRD Primi',
    'rates' => [0.03, 0.04],
    'max_rim' => 16,
];
