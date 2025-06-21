// 농기계/건설기계 종류 (PDF에서 추출한 실제 장비 타입)
export const EQUIPMENT_TYPES = [
  // 농기계
  '트랙터(TRACTOR)',
  '콤바인(COMBINE_HARVESTER)', 
  '스프레이어(SPRAYER)',
  '믹서(MIXER)',
  
  // 건설기계 - 굴착/로더
  '굴삭기(EXCAVATOR)',
  '휠로더(WHEEL_LOADER)',
  '스키드로더(SKID_STEER_LOADER)',
  '백호로더(BACKHOE_LOADER)',
  '지게차(FORKLIFT)',
  
  // 건설기계 - 토공/도로
  '불도저(BULLDOZER)',
  '그레이더(GRADER)',
  '컴팩터(COMPACTOR)',
  '스크레이퍼(SCRAPER)',
  '덤프트럭(DUMP_TRUCK)',
  
  // 특수장비
  '텔레핸들러(ARTICULATING_BOOM)',
  
  '기타'
] as const

// 제조사 (PDF에서 추출한 실제 농기계 브랜드)
export const MANUFACTURERS = [
  // 주요 트랙터 제조사
  'JOHNDEERE',
  'NEWHOLLAND', 
  'CASE',
  'MASSEYFERGUSON',
  'FENDT',
  'DEUTZFAHR',
  'CLAAS',
  'KUBOTA',
  'YANMAR',
  'VALTRA',
  'STEYR',
  'SAME',
  'LAMBORGHINI',
  'LANDINI',
  'MCCORMICK',
  'HURLIMANN',
  
  // 기타 농기계/건설기계 제조사
  'AGCO',
  'CATERPILLAR',
  'KOMATSU',
  'HITACHI',
  'HYUNDAI',
  'BOBCAT',
  'JCB',
  'LIEBHERR',
  'VOLVO',
  'DOOSAN',
  
  // 한국 브랜드
  '대동',
  '동양물산',
  'TYM',
  '국제종합기계',
  
  '기타'
] as const

// 제조사별 모델명 매핑
export const MANUFACTURER_MODELS: Record<string, string[]> = {
  'JOHNDEERE': [
    // 트랙터 시리즈
    '5E SERIES', '5G SERIES', '5M SERIES', '5R SERIES',
    '6010 SERIES', '6015 SERIES', '6020 SERIES', '6025 SERIES', '6030 SERIES',
    '6D SERIES', '6E SERIES', '6J SERIES', '6M SERIES', '6MC SERIES', '6R SERIES', '6RC SERIES',
    '7000 SERIES', '7010 SERIES', '7015 SERIES', '7020 SERIES', '7030 SERIES', '7J SERIES', '7R SERIES',
    '8000 SERIES', '8010 SERIES', '8020 SERIES', '8030 SERIES', '8R SERIES',
    '9000 SERIES', '9020 SERIES', '9030 SERIES', '9R SERIES', '9RX SERIES',
    // 콤바인 시리즈
    'S SERIES', 'T SERIES', 'W SERIES', 'C SERIES', 'CTS SERIES', 'CWS SERIES', 'STS SERIES', 'WTS SERIES',
    '6000 SERIES', '7000 SERIES', '8000 SERIES',
    // 스프레이어
    'R4030', 'R4038', 'R4044'
  ],
  'NEWHOLLAND': [
    'T4 SERIES', 'T5 SERIES', 'T6 SERIES', 'T7 SERIES', 'T8 SERIES', 'T9 SERIES',
    'T5000 SERIES', 'T6000 SERIES', 'T7000 SERIES', 'T8000 SERIES',
    'CR SERIES', 'CX SERIES', 'TC SERIES',
    'SP295F', 'SP300F', 'GUARDIAN 300R'
  ],
  'CASE': [
    'FARMALL SERIES', 'MAXXUM SERIES', 'PUMA SERIES', 'MAGNUM SERIES', 'STEIGER SERIES',
    'AXIAL-FLOW COMBINES'
  ],
  'MASSEYFERGUSON': [
    'MF1700 SERIES', 'MF2600 SERIES', 'MF3600 SERIES', 'MF4200 SERIES', 'MF4600 SERIES',
    'MF5400 SERIES', 'MF5600 SERIES', 'MF5700 SERIES', 'MF6100 SERIES', 'MF6400 SERIES',
    'MF6600 SERIES', 'MF6700 SERIES', 'MF7400 SERIES', 'MF7600 SERIES', 'MF7700 SERIES',
    'MF8100 SERIES', 'MF8200 SERIES', 'MF8600 SERIES', 'MF8700 SERIES'
  ],
  'FENDT': [
    '200 VARIO', '300 VARIO', '500 VARIO', '700 VARIO', '800 VARIO', '900 VARIO', '1000 VARIO'
  ],
  'DEUTZFAHR': [
    '5 SERIES', '6 SERIES', '7 SERIES', '8 SERIES', '9 SERIES'
  ],
  'CLAAS': [
    'ARION 400', 'ARION 500', 'ARION 600', 'ARION 700',
    'AXION 800', 'AXION 900',
    'LEXION SERIES'
  ],
  'KUBOTA': [
    'L SERIES', 'M SERIES', 'MX SERIES', 'B SERIES',
    'L2501', 'L3301', 'L3901', 'L4701', 'L5740',
    'M4-071', 'M5-091', 'M5-111', 'M6-121', 'M6-131', 'M7-131', 'M7-151', 'M7-171',
    'M8-151', 'M8-171', 'M9-171', 'M10-191',
    'MX5100', 'MX5200', 'MX5800'
  ],
  'YANMAR': [
    'YT SERIES', 'AF SERIES', 'EG SERIES', 'YM SERIES',
    'YT235', 'YT347', 'YT359', 'AF114', 'AF118', 'AF220', 'AF333',
    'EG116', 'EG228', 'EG334', 'YM195', 'YM240', 'YM330'
  ],
  'CATERPILLAR': [
    // 굴삭기
    '308 SERIES', '309 SERIES', '311 SERIES', '313 SERIES', '315 SERIES', '319 SERIES',
    '320 SERIES', '323 SERIES', '325 SERIES', '336 SERIES', '349 SERIES', 'M318 SERIES',
    // 휠로더
    '903D SERIES', '908M SERIES', '924H SERIES', '928H SERIES', '938H SERIES', '950 SERIES',
    '966H SERIES', '972K SERIES', '980H SERIES',
    // 불도저
    'D6N', 'D6T', 'D8T', 'D10T',
    // 덤프트럭
    '745C', '775F', '777F',
    // 그레이더
    '140M', 'TM140',
    // 스키드로더
    '226D SERIES', '259D SERIES', '272D SERIES', '279D SERIES', '289D SERIES', '299D SERIES',
    // 텔레핸들러
    'TH337C SERIES', 'TH3510D SERIES', 'TH357D SERIES', 'TH407 SERIES', 'TH417D SERIES', 'TH943C SERIES'
  ],
  'JCB': [
    // 백호로더
    '3CX', '4CX',
    // 휠로더
    '411HT', '412S', '413S', '414S', '416S', '417HT', '419S', '426E', '427HT', '435HT', '435S', '436HT', '437HT',
    // 굴삭기
    '86C-1', 'JS130', 'JS145', 'JS150', 'JS160', 'JS190', 'JS200', 'JS20MH', 'JS210', 'JS220X', 'JS360', 'JZ141',
    // 스키드로더
    '225T', '300T', '320T',
    // 텔레핸들러
    '526-56', '531-70', '532-60', '532-70', '532-125', '535-95', '536-60', '536-70', '538-60',
    '540-200', '541-70', '542-70', '550-80', '560-80', 'TM220', 'TM320', 'TM420', 'TM420S'
  ],
  'BOBCAT': [
    // 굴삭기
    'E85',
    // 스키드로더
    'S76', 'T590', 'T650', 'T76', 'T770', 'T86', 'T870', 'TL3515',
    // 트랙터
    'CT2540', 'CT4045'
  ],
  'HYUNDAI': [
    // 굴삭기
    'HX140LC', 'HX220L', 'HX235LCR', 'HX300L', 'HX330L', 'HX520L', 'R290Lc',
    // 휠로더
    'HL955', 'HL960', 'HL970A', 'HL975',
    // 지게차
    '35D-7E', '70D-9',
    // 승용차
    'S-SERIES'
  ],
  'KOMATSU': [
    // 굴삭기
    'PC70', 'PC138', 'PC200-8', 'PC290', 'PC360', 'PW118MR-11', 'HB365',
    // 휠로더
    'WA270-8', 'WA380-8',
    // 불도저
    'D61 PX', 'D85 EX',
    // 하베스터
    '901', '911', '931', '931XC', '951'
  ],
  'DOOSAN': [
    // 굴삭기
    'DX 300', 'DX 340LC', 'DX300', 'DX300LC-5', 'DX380LC-7', 'DX530LC',
    // 휠로더
    'DL420-3', 'DL420-5', 'DL450-5', 'DL500',
    // 덤프트럭
    'DA30'
  ],
  'VOLVO': [
    // 굴삭기
    'EC380',
    // 휠로더
    'L120', 'L150', 'L180', 'L220'
  ],
  'LIEBHERR': [
    // 휠로더
    'L524', 'L526', 'L538'
  ],
  'LINDE': [
    // 지게차
    'C4531', 'H30D', 'H50D'
  ],
  'AMMANN': [
    // 컴팩터
    'ARS 150', 'ARX 26-2', 'ASC 110'
  ],
  'MITSUBISHIFUSO': [
    // 믹서
    'FI MIXER'
  ],
  '대동': [
    'DK SERIES', 'RX SERIES', 'NX SERIES', 'CK SERIES',
    'DK451', 'DK551', 'DK751', 'DK901', 'DK904', 'DK1001',
    'RX6010', 'RX7010', 'RX9010',
    'NX6010', 'NX7010', 'NX8010',
    'CK2510', 'CK3010', 'CK3510'
  ],
  '동양물산': [
    'DP SERIES', 'DY SERIES',
    'DP480', 'DP580', 'DP680',
    'DY2540', 'DY3040', 'DY3540'
  ],
  'TYM': [
    'T SERIES', 'TS SERIES',
    'T233', 'T273', 'T293', 'T353', 'T393', 'T433', 'T503', 'T554', 'T603', 'T754'
  ],
  '국제종합기계': [
    'IK SERIES',
    'IK254', 'IK304', 'IK354', 'IK404', 'IK454'
  ]
}

// 트랙터 모델명 (PDF에서 추출한 실제 모델들)
export const TRACTOR_MODELS = [
  // JOHNDEERE 트랙터 시리즈
  '5E SERIES', '5G SERIES', '5M SERIES', '5R SERIES',
  '6010 SERIES', '6015 SERIES', '6020 SERIES', '6025 SERIES', '6030 SERIES',
  '6D SERIES', '6E SERIES', '6J SERIES', '6M SERIES', '6MC SERIES', '6R SERIES', '6RC SERIES',
  '7000 SERIES', '7010 SERIES', '7015 SERIES', '7020 SERIES', '7030 SERIES', '7J SERIES', '7R SERIES',
  '8000 SERIES', '8010 SERIES', '8020 SERIES', '8030 SERIES', '8R SERIES',
  '9000 SERIES', '9020 SERIES', '9030 SERIES', '9R SERIES', '9RX SERIES',
  
  // NEWHOLLAND 트랙터 시리즈
  'T4 SERIES', 'T5 SERIES', 'T6 SERIES', 'T7 SERIES', 'T8 SERIES', 'T9 SERIES',
  'T5000 SERIES', 'T6000 SERIES', 'T7000 SERIES', 'T8000 SERIES',
  
  // CASE 트랙터 시리즈
  'FARMALL SERIES', 'MAXXUM SERIES', 'PUMA SERIES', 'MAGNUM SERIES', 'STEIGER SERIES',
  'QUADTRAC SERIES', 'CVX SERIES', 'PUMA CVX SERIES',
  
  // MASSEYFERGUSON 트랙터 시리즈
  'MF4200 SERIES', 'MF5600 SERIES', 'MF5700 SERIES', 'MF6400 SERIES', 'MF7400 SERIES',
  'MF7600 SERIES', 'MF7700 SERIES', 'MF8400 SERIES', 'MF8600 SERIES', 'MF8700 SERIES',
  
  // FENDT 트랙터 시리즈
  '200 VARIO', '300 VARIO', '400 VARIO', '500 VARIO', '700 VARIO', '800 VARIO', '900 VARIO', '1000 VARIO',
  
  // DEUTZFAHR 트랙터 시리즈
  '5 SERIES', '6 SERIES', '7 SERIES', '9 SERIES', '56 SERIES', '60xx SERIES',
  'C6000 SERIES', 'C9000 SERIES', 'AGROFARM SERIES', 'AGROTRON SERIES',
  
  // CLAAS 트랙터 시리즈
  'ARION SERIES', 'AXION SERIES', 'XERION SERIES',
  
  // KUBOTA 트랙터 시리즈
  'L60 SERIES', 'M SERIES', 'MX SERIES', 'B SERIES',
  
  // VALTRA 트랙터 시리즈
  'A SERIES', 'N SERIES', 'T SERIES', 'S SERIES', 'N VERSU',
  
  // STEYR 트랙터 시리즈
  'ABSOLUT SERIES', 'CVT SERIES', 'KOMPAKT SERIES', 'PROFI SERIES',
  
  // SAME 트랙터 시리즈
  'DORADO SERIES', 'IRON SERIES', 'EXPLORER SERIES', 'DIAMOND SERIES',
  
  // LAMBORGHINI 트랙터 시리즈
  'NITRO SERIES', 'SPIRE SERIES', 'STRIKE SERIES', 'R3 EVO', 'R4 SERIES', 'R6 SERIES', 'R7 SERIES', 'R8 SERIES',
  
  // LANDINI 트랙터 시리즈
  'LANDPOWER SERIES', 'POWERFARM SERIES', 'POWERMASTER SERIES', 'REX4 SERIES',
  
  // MCCORMICK 트랙터 시리즈
  'X4 SERIES', 'X6 SERIES', 'X7 SERIES', 'MTX SERIES', 'TTX SERIES', 'ZTX SERIES', 'XTX SERIES',
  
  // YANMAR 트랙터 시리즈
  'YT SERIES', 'AF SERIES', 'EG SERIES', 'YM SERIES', 'Sv SERIES',
  
  // 대동 트랙터 시리즈
  'DK SERIES', 'RX SERIES', 'NX SERIES', 'CK SERIES', 'EX SERIES',
  
  // 기타 모델
  'VERSATILE SERIES', 'CHALLENGER SERIES', 'MT SERIES',
  
  '기타'
] as const

// ECU 타입 (카테고리)
export const ECU_CATEGORIES = [
  'ECU', // Engine Control Unit - 엔진 제어 장치
  'ACU', // After-treatment Control Unit - 후처리 제어 장치
  'DCU'  // Dosing Control Unit - 도징 제어 장치
] as const

// ECU 제조사 (PDF에서 추출한 실제 제조사)
export const ECU_MAKERS = [
  'AUDI',
  'BMW',
  'BOSCH',
  'CATERPILLAR',
  'CHRYSLER',
  'CONTINENTAL',
  'CUMMINS',
  'DAF',
  'DELPHI',
  'DENSO',
  'DETROIT',
  'FORD',
  'HINO',
  'HITACHI',
  'HONDA',
  'HYUNDAI',
  'ISUZU',
  'IVECO',
  'JOHN DEERE',
  'KIA',
  'KUBOTA',
  'MAGNETI MARELLI',
  'MAN',
  'MAZDA',
  'MERCEDES',
  'MITSUBISHI',
  'NISSAN',
  'PANASONIC',
  'PERKINS',
  'SCANIA',
  'SIEMENS',
  'TOYOTA',
  'VALEO',
  'VOLKSWAGEN',
  'VOLVO',
  'YANMAR',
] as const

// ECU 모델 (PDF에서 추출한 실제 ECU 모델번호)
export const ECU_MODELS = [
  // Denso 부품번호
  '112500-0370', '112500-1240', '112500-1241', '211841-3561', '211941-37910',
  '275036-0360', '275036-1150', '275036-1152', '275036-1470', '275036-2110',
  '275036-2290', '275036-2440', '275036-3160', '275036-3410', '275036-3560',
  '275036-3740', '275036-4820', '275036-5130', '275036-5280', '275036-5650',
  '275036-5810', '275036-5920', '275036-6110', '275036-6941', '275036-7341',
  '275036-7461', '275036-7780', '275036-8730', '275036-9050',   '275036-9160',
  '275136-1919', '275136-2010', '275700-0122', '275700-1201', '275700-2753',
  '275700-6460', '275700-7122', '275800-8884', '275822-9730', '279700-9142', '39100-48010',
  
  // Bosch MB 시리즈
  'MB079700', 'MB112300', 'MB275700', 'MB275800', 'MB279700', 'ME306431',
  
  // DCM 시리즈 (Delphi)
  'DCM1.2', 'DCM2.7', 'DCM3.1', 'DCM3.2', 'DCM3.3', 'DCM3.4', 'DCM3.5', 'DCM3.7', 'DCM6.1', 'DCM6.2', 'DCM7.1',
  
  // EDC 시리즈 (Bosch)
  'EDC15', 'EDC15C13', 'EDC15C2', 'EDC15C3', 'EDC15C4', 'EDC15C5', 'EDC15C6', 'EDC15C7', 'EDC15C9',
  'EDC15M', 'EDC15P', 'EDC15Pa', 'EDC15V', 'EDC15VM', 'EDC15VP', 'EDC15VP40',
  'EDC16', 'EDC16C0', 'EDC16C08', 'EDC16C1', 'EDC16C10', 'EDC16C2', 'EDC16C3', 'EDC16C31', 'EDC16C32',
  'EDC16C34', 'EDC16C35', 'EDC16C36', 'EDC16C37', 'EDC16C39', 'EDC16C4', 'EDC16C41', 'EDC16C7', 'EDC16C8', 'EDC16C9',
  'EDC16CP31', 'EDC16CP33', 'EDC16CP34', 'EDC16CP35', 'EDC16CP36', 'EDC16CP39', 'EDC16CP42',
  'EDC16U1', 'EDC16U3', 'EDC16U31', 'EDC16U34', 'EDC16UC40',
  'EDC17', 'EDC17.9', 'EDC17C04', 'EDC17C06', 'EDC17C08', 'EDC17C10', 'EDC17C11', 'EDC17C18', 'EDC17C19',
  'EDC17C3', 'EDC17C41', 'EDC17C42', 'EDC17C43', 'EDC17C45', 'EDC17C46', 'EDC17C47', 'EDC17C49', 'EDC17C50',
  'EDC17C53', 'EDC17C54', 'EDC17C55', 'EDC17C56', 'EDC17C57', 'EDC17C58', 'EDC17C59', 'EDC17C60', 'EDC17C61',
  'EDC17C63', 'EDC17C64', 'EDC17C66', 'EDC17C69', 'EDC17C70', 'EDC17C72', 'EDC17C73', 'EDC17C74', 'EDC17C76',
  'EDC17C79', 'EDC17C81', 'EDC17C83', 'EDC17C84', 'EDC17C87', 'EDC17CB25',
  'EDC17CP01', 'EDC17CP02', 'EDC17CP04', 'EDC17CP06', 'EDC17CP07', 'EDC17CP09', 'EDC17CP10', 'EDC17CP11',
  'EDC17CP14', 'EDC17CP15', 'EDC17CP16', 'EDC17CP18', 'EDC17CP19', 'EDC17CP20', 'EDC17CP21', 'EDC17CP22',
  'EDC17CP24', 'EDC17CP27', 'EDC17CP37', 'EDC17CP42', 'EDC17CP44', 'EDC17CP45', 'EDC17CP46', 'EDC17CP47',
  'EDC17CP49', 'EDC17CP50', 'EDC17CP51', 'EDC17CP52', 'EDC17CP54', 'EDC17CP55', 'EDC17CP57', 'EDC17CP58',
  'EDC17CP60', 'EDC17CP62', 'EDC17CP65', 'EDC17CP74',
  'EDC17CV41', 'EDC17CV42', 'EDC17CV44', 'EDC17CV45', 'EDC17CV52', 'EDC17CV54', 'EDC17CV56', 'EDC17CV82',
  'EDC17U01', 'EDC17U05', 'EDC7C1', 'EDC7C3', 'EDC7C32', 'EDC7C4', 'EDC7CV41', 'EDC7U1', 'EDC7U31', 'EDC7UC31',
  
  // ME 시리즈 (Bosch)
  'ME1.5.5', 'ME1.9.3', 'ME17.', 'ME17.0.3', 'ME17.1.1', 'ME17.1.6', 'ME17.2', 'ME17.2.1', 'ME17.2.4',
  'ME17.2.4.2', 'ME17.2.42', 'ME17.3.0', 'ME17.5', 'ME17.5.20', 'ME17.5.22', 'ME17.5.24', 'ME17.5.26',
  'ME17.5.6', 'ME17.7', 'ME17.7.20', 'ME17.7.8', 'ME17.8.', 'ME17.8.3.3', 'ME17.8.31', 'ME17.8.32',
  'ME17.8.33', 'ME17.8.5', 'ME17.8.74', 'ME17.8.8', 'ME17.9.1', 'ME17.9.11', 'ME17.9.11.1', 'ME17.9.20',
  'ME17.9.21', 'ME17.9.21.1', 'ME17.9.23', 'ME17.9.5', 'ME17.9.51', 'ME17.9.52', 'ME17.9.53', 'ME17.9.55',
  'ME17.9.56', 'ME17.9.6', 'ME17.9.61', 'ME17.9.64', 'ME17.9.7', 'ME17.9.71', 'ME17.9.74',
  'ME2.1', 'ME2.7.2', 'ME2.8.1', 'ME5.2', 'ME5.2.1', 'ME7.1', 'ME7.1.1', 'ME7.1.6', 'ME7.2', 'ME7.3',
  'ME7.3.1', 'ME7.4.4', 'ME7.4.5', 'ME7.4.6', 'ME7.4.7', 'ME7.5', 'ME7.5.', 'ME7.5.1', 'ME7.5.10',
  'ME7.5.20', 'ME7.5.30', 'ME7.5.5', 'ME7.6.1', 'ME7.6.2', 'ME7.6.3', 'ME7.6.4', 'ME7.7.0', 'ME7.70',
  'ME7.8', 'ME7.8.1', 'ME7.8.2', 'ME7.8.4', 'ME7.8.8', 'ME7.9', 'ME7.9.10', 'ME7.9.3', 'ME7.9.5',
  'ME7.9.51', 'ME7.9.52', 'ME7.9.7', 'ME7.9.9', 'ME9.0', 'ME9.1.1', 'ME9.2', 'ME9.2.0', 'ME9.2.2',
  'ME9.6', 'ME9.6.1', 'ME9.7',
  
  // MED 시리즈 (Bosch)
  'MED17', 'MED17.0', 'MED17.0.1', 'MED17.0.7', 'MED17.1', 'MED17.1.1', 'MED17.1.10', 'MED17.1.11',
  'MED17.1.12', 'MED17.1.21', 'MED17.1.27', 'MED17.1.6', 'MED17.1.61', 'MED17.1.62', 'MED17.2', 'MED17.2.2',
  'MED17.2.3', 'MED17.3.1', 'MED17.3.3', 'MED17.3.4', 'MED17.3.5', 'MED17.4', 'MED17.4.2', 'MED17.4.4',
  'MED17.5', 'MED17.5.1', 'MED17.5.2', 'MED17.5.20', 'MED17.5.21', 'MED17.5.25', 'MED17.5.5', 'MED17.6.9',
  'MED17.7.1', 'MED17.7.2', 'MED17.7.3', 'MED17.7.3.1', 'MED17.7.5', 'MED17.7.7', 'MED17.7.8', 'MED17.8.10',
  'MED17.8.10.1', 'MED17.8.2', 'MED17.8.21', 'MED17.8.3', 'MED17.8.31', 'MED17.8.32', 'MED17.9.3',
  'MED17.9.30', 'MED17.9.63', 'MED17.9.66', 'MED17.9.7', 'MED17.9.8', 'MED17.9.9', 'MED7.1.1', 'MED7.5.11',
  'MED7.6.1', 'MED7.6.2', 'MED9.1', 'MED9.1.1', 'MED9.1.2', 'MED9.1.5', 'MED9.5', 'MED9.5.10', 'MED9.6',
  'MED9.6.1', 'MED9.6.2',
  
  // SID 시리즈 (Siemens)
  'SID201', 'SID202', 'SID203', 'SID204', 'SID206', 'SID208', 'SID209', 'SID211', 'SID301', 'SID303',
  'SID304', 'SID305', 'SID306', 'SID307', 'SID309', 'SID310', 'SID321', 'SID801', 'SID802', 'SID803',
  'SID805', 'SID806', 'SID807', 'SID902',
  
  // 기타
  'DDE4.0', 'PCR2.1',
  'Perkins ECU',
  'Kubota ECU',
  'Yanmar ECU',
  'Deutz ECU',
  'Isuzu ECU',
  
  // 기타
  '기타'
] as const

// ACU 타입 (After-treatment Control Unit - 후처리 제어 장치)
export const ACU_TYPES = [
  // Bosch ACU 시리즈
  'Bosch ACU',
  'Bosch DCU',
  'Bosch AdBlue ACU',
  'Bosch DPF ACU',
  'Bosch SCR ACU',
  
  // Delphi ACU 시리즈
  'Delphi ACU',
  'Delphi AdBlue ACU',
  'Delphi DPF ACU',
  'Delphi SCR ACU',
  
  // Continental ACU 시리즈
  'Continental ACU',
  'Continental AdBlue ACU',
  'Continental DPF ACU',
  'Continental SCR ACU',
  
  // Denso ACU 시리즈
  'Denso ACU',
  'Denso AdBlue ACU',
  'Denso DPF ACU',
  'Denso SCR ACU',
  
  // Siemens ACU 시리즈
  'Siemens ACU',
  'Siemens AdBlue ACU',
  'Siemens DPF ACU',
  'Siemens SCR ACU',
  
  // Cummins ACU 시리즈
  'Cummins ACU',
  'Cummins AdBlue ACU',
  'Cummins DPF ACU',
  'Cummins SCR ACU',
  
  // Caterpillar ACU 시리즈
  'Caterpillar ACU',
  'Caterpillar AdBlue ACU',
  'Caterpillar DPF ACU',
  'Caterpillar SCR ACU',
  
  // 기타
  '기타'
] as const

// 엔진 종류 (농기계/건설장비 엔진)
export const ENGINE_TYPES = [
  // Cummins 엔진
  'Cummins ISX',
  'Cummins QSX',
  'Cummins ISM',
  'Cummins QSM',
  'Cummins ISL',
  'Cummins QSL',
  'Cummins ISB',
  'Cummins QSB',
  
  // Detroit Diesel 엔진
  'Detroit DD13',
  'Detroit DD15',
  'Detroit DD16',
  'Detroit DDEC',
  
  // Volvo 엔진
  'Volvo D11',
  'Volvo D13',
  'Volvo D16',
  'Volvo TAD',
  
  // Perkins 엔진
  'Perkins 1104',
  'Perkins 1106',
  'Perkins 854',
  'Perkins 1204',
  'Perkins 1206',
  
  // Caterpillar 엔진
  'Caterpillar C7',
  'Caterpillar C9',
  'Caterpillar C13',
  'Caterpillar C15',
  'Caterpillar C18',
  
  // John Deere 엔진
  'John Deere PowerTech',
  'John Deere 4045',
  'John Deere 6068',
  'John Deere 6090',
  'John Deere 6135',
  
  // Kubota 엔진
  'Kubota V3800',
  'Kubota V2403',
  'Kubota D1703',
  'Kubota D905',
  'Kubota V1505',
  
  // Yanmar 엔진
  'Yanmar 3TNV',
  'Yanmar 4TNV',
  'Yanmar 4JH',
  'Yanmar 6LY',
  'Yanmar 3GM',
  
  // Deutz 엔진
  'Deutz TCD',
  'Deutz BF4M',
  'Deutz BF6M',
  'Deutz BF8M',
  
  // Isuzu 엔진
  'Isuzu 4JJ1',
  'Isuzu 4HK1',
  'Isuzu 6HK1',
  'Isuzu 4BD1',
  
  // 기타
  '기타'
] as const

// 연결방법
export const CONNECTION_METHODS = [
  'OBD',
  'BENCH',
  'BOOT',
  'BDM'
] as const

// ECU 장비 카테고리
export const ECU_TOOL_CATEGORIES = [
  'FLEX 시리즈',
  'PAD Flash 시리즈',
  'KESS 시리즈',
  '기타'
] as const

// ECU 장비 상세 목록
export const ECU_TOOLS = {
  'FLEX 시리즈': [
    'FLEX Box',
    'FLEX Pro',
    'FLEX Master',
    'FLEX Ultimate',
    'FLEX OBD',
    'FLEX BENCH'
  ],
  'PAD Flash 시리즈': [
    'PAD Flash Pro',
    'PAD Flash Master',
    'PAD Flash Ultimate',
    'PAD Flash OBD',
    'PAD Flash BENCH',
    'PAD Flash BDM'
  ],
  'KESS 시리즈': [
    'KESS V2',
    'KESS V3',
    'KESS V5.017',
    'KESS Master',
    'KESS Clone'
  ],

  '기타': [
    'CMD Flash',
    'Galletto',
    'MPPS',
    'BDM100',
    'KTAG',
    '기타'
  ]
} as const

// 호환성을 위한 기존 ECU_TOOLS (플랫 배열)
export const ECU_TOOLS_FLAT = [
  'FLEX Box',
  'FLEX Pro', 
  'FLEX Master',
  'FLEX Ultimate',
  'PAD Flash Pro',
  'PAD Flash Master',
  'PAD Flash Ultimate',
  'KESS V2',
  'KESS V3',
  'KESS V5.017',
  'CMD Flash',
  'Galletto',
  'MPPS',
  'BDM100',
  'KTAG',
  '기타'
] as const

// 프로토콜
export const PROTOCOLS = [
  'CAN',
  'K-LINE',
  'ISO',
  'UDS',
  '기타'
] as const

// 튜닝 작업 카테고리
export const TUNING_CATEGORIES = [
  '튜닝 작업'
] as const

// 카테고리별 튜닝 작업
export const TUNING_WORKS_BY_CATEGORY = {
  '튜닝 작업': [
    '파워업',
    'EGR 제거',
    'AdBlue 제거',
    'DPF 제거',
    '속도제한해제'
  ]
} as const

// 호환성을 위한 기존 TUNING_WORKS (플랫 배열)
export const TUNING_WORKS = [
  'DPF 제거',
  'EGR 제거',
  'AdBlue 제거',
  '파워업',
  '연비최적화',
  '속도제한해제',
  '기타'
] as const

// 작업 상태
export const WORK_STATUS = [
  '예약',
  '진행중', 
  '완료',
  'AS',
  '실패'
] as const

// 파일 타입
export const FILE_TYPES = [
  'original',
  'tuned',
  'photo',
  'video'
] as const

// 업로드 가능한 파일 확장자
export const ALLOWED_FILE_EXTENSIONS = {
  tuning: ['.bin', '.ori', '.mod', '.mmf', '.kess', '.flex'],
  image: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  video: ['.mp4', '.avi', '.mov', '.wmv', '.flv']
}

// 최대 파일 크기 (바이트)
export const MAX_FILE_SIZE = {
  tuning: 50 * 1024 * 1024, // 50MB
  image: 10 * 1024 * 1024,  // 10MB
  video: 100 * 1024 * 1024  // 100MB
}

// 고객 더미 데이터
export const CUSTOMERS_DATA = [
  { 
    id: 1, 
    name: '김농부', 
    phone: '010-1234-5678', 
    zipCode: '17564',
    roadAddress: '경기도 안성시 죽산면 죽산초교길 69',
    jibunAddress: '경기도 안성시 죽산면 죽산리 310-1'
  },
  { 
    id: 2, 
    name: '이농장', 
    phone: '010-2345-6789', 
    zipCode: '28644',
    roadAddress: '충청북도 청주시 서원구 충대로 1',
    jibunAddress: '충청북도 청주시 서원구 개신동 12-1'
  },
  { 
    id: 3, 
    name: '박트랙터', 
    phone: '010-3456-7890', 
    zipCode: '54326',
    roadAddress: '전라북도 김제시 교동로 21',
    jibunAddress: '전라북도 김제시 교동 123'
  },
  { 
    id: 4, 
    name: '최콤바인', 
    phone: '010-4567-8901', 
    zipCode: '50969',
    roadAddress: '경상남도 김해시 분성로 273',
    jibunAddress: '경상남도 김해시 내외동 396-1'
  },
  { 
    id: 5, 
    name: '정기계', 
    phone: '010-5678-9012', 
    zipCode: '58217',
    roadAddress: '전라남도 나주시 시청길 5',
    jibunAddress: '전라남도 나주시 송월동 282'
  },
  { 
    id: 6, 
    name: '강벼농사', 
    phone: '010-6789-0123', 
    zipCode: '39660',
    roadAddress: '충청남도 서천군 한산면 한산로 456',
    jibunAddress: '충청남도 서천군 한산면 한산리 123-4'
  },
  { 
    id: 7, 
    name: '윤과수원', 
    phone: '010-7890-1234', 
    zipCode: '51736',
    roadAddress: '경상남도 창원시 성산구 성산로 567',
    jibunAddress: '경상남도 창원시 성산구 성산동 567-1'
  },
  { 
    id: 8, 
    name: '장축산업', 
    phone: '010-8901-2345', 
    zipCode: '24126',
    roadAddress: '강원도 춘천시 중앙로 678',
    jibunAddress: '강원도 춘천시 중앙동 678-2'
  },
  { 
    id: 9, 
    name: '임채소밭', 
    phone: '010-9012-3456', 
    zipCode: '46326',
    roadAddress: '전라남도 무안군 무안읍 무안로 789',
    jibunAddress: '전라남도 무안군 무안읍 무안리 789-3'
  },
  { 
    id: 10, 
    name: '한목장주', 
    phone: '010-0123-4567', 
    zipCode: '35826',
    roadAddress: '충청북도 제천시 의림대로 890',
    jibunAddress: '충청북도 제천시 의림동 890-4'
  },
  { 
    id: 11, 
    name: '오감자왕', 
    phone: '010-1357-2468', 
    zipCode: '25726',
    roadAddress: '강원도 강릉시 경강로 123',
    jibunAddress: '강원도 강릉시 교동 123-1'
  },
  { 
    id: 12, 
    name: '서딸기농장', 
    phone: '010-2468-1357', 
    zipCode: '55326',
    roadAddress: '전라북도 완주군 용진읍 용진로 234',
    jibunAddress: '전라북도 완주군 용진읍 용진리 234-1'
  },
  { 
    id: 13, 
    name: '남고구마', 
    phone: '010-3579-2468', 
    zipCode: '31726',
    roadAddress: '충청남도 당진시 당진중앙로 345',
    jibunAddress: '충청남도 당진시 당진동 345-1'
  },
  { 
    id: 14, 
    name: '문양파밭', 
    phone: '010-4680-1357', 
    zipCode: '54004',
    roadAddress: '전라북도 군산시 옥산면 옥산로 741',
    jibunAddress: '전라북도 군산시 옥산면 옥산리 234-2'
  },
  { 
    id: 15, 
    name: '배사과원', 
    phone: '010-5791-2468', 
    zipCode: '27738',
    roadAddress: '충청북도 음성군 금왕읍 금왕로 852',
    jibunAddress: '충청북도 음성군 금왕읍 금왕리 567-3'
  },
  { 
    id: 16, 
    name: '조옥수수', 
    phone: '010-6802-1357', 
    zipCode: '18626',
    roadAddress: '경기도 화성시 봉담읍 봉담로 963',
    jibunAddress: '경기도 화성시 봉담읍 봉담리 890-4'
  },
  { 
    id: 17, 
    name: '유콩농장', 
    phone: '010-7913-2468', 
    zipCode: '33326',
    roadAddress: '충청남도 부여군 규암면 규암로 174',
    jibunAddress: '충청남도 부여군 규암면 규암리 123-5'
  },
  { 
    id: 18, 
    name: '신토마토', 
    phone: '010-8024-1357', 
    zipCode: '52726',
    roadAddress: '경상남도 진주시 금곡면 금곡로 285',
    jibunAddress: '경상남도 진주시 금곡면 금곡리 456-6'
  },
  { 
    id: 19, 
    name: '허오이농원', 
    phone: '010-9135-2468', 
    zipCode: '59326',
    roadAddress: '전라남도 장성군 황룡면 황룡로 396',
    jibunAddress: '전라남도 장성군 황룡면 황룡리 789-7'
  },
  { 
    id: 20, 
    name: '전배추밭', 
    phone: '010-0246-1357', 
    zipCode: '36726',
    roadAddress: '경상북도 안동시 풍천면 풍천로 507',
    jibunAddress: '경상북도 안동시 풍천면 풍천리 234-8'
  }
];

// 장비 더미 데이터
export const EQUIPMENT_DATA = [
  { id: 1, customerId: 1, customerName: '김농부', equipmentType: '트랙터(TRACTOR)', manufacturer: 'JOHNDEERE', model: '6M SERIES', serial: 'JD6M001' },
  { id: 2, customerId: 2, customerName: '이농장', equipmentType: '콤바인(COMBINE_HARVESTER)', manufacturer: 'NEWHOLLAND', model: 'CR SERIES', serial: 'NH890CR002' },
  { id: 3, customerId: 3, customerName: '박트랙터', equipmentType: '트랙터(TRACTOR)', manufacturer: 'KUBOTA', model: 'M SERIES', serial: 'KB7060M003' },
  { id: 4, customerId: 4, customerName: '최콤바인', equipmentType: '콤바인(COMBINE_HARVESTER)', manufacturer: 'CLAAS', model: 'LEXION SERIES', serial: 'CL760LX004' },
  { id: 5, customerId: 5, customerName: '정기계', equipmentType: '굴삭기(EXCAVATOR)', manufacturer: 'CATERPILLAR', model: '320 SERIES', serial: 'CAT320005' },
  { id: 6, customerId: 6, customerName: '강벼농사', equipmentType: '스프레이어(SPRAYER)', manufacturer: 'JOHNDEERE', model: 'R4030', serial: 'JDR4030006' },
  { id: 7, customerId: 7, customerName: '송건설', equipmentType: '휠로더(WHEEL_LOADER)', manufacturer: 'CATERPILLAR', model: '950 SERIES', serial: 'CAT950007' },
  { id: 8, customerId: 8, customerName: '윤농기계', equipmentType: '스키드로더(SKID_STEER_LOADER)', manufacturer: 'BOBCAT', model: 'S76', serial: 'BOB76008' },
  { id: 9, customerId: 9, customerName: '장운송', equipmentType: '지게차(FORKLIFT)', manufacturer: 'LINDE', model: 'H50D', serial: 'LIN50009' },
  { id: 10, customerId: 10, customerName: '임토목', equipmentType: '백호로더(BACKHOE_LOADER)', manufacturer: 'JCB', model: '3CX', serial: 'JCB3CX010' },
  { id: 11, customerId: 11, customerName: '한농업', equipmentType: '트랙터(TRACTOR)', manufacturer: 'MASSEYFERGUSON', model: 'MF5700', serial: 'MF5700011' },
  { id: 12, customerId: 12, customerName: '조건설', equipmentType: '불도저(BULLDOZER)', manufacturer: 'CATERPILLAR', model: 'D6T', serial: 'CATD6T012' },
  { id: 13, customerId: 13, customerName: '홍농장', equipmentType: '콤바인(COMBINE_HARVESTER)', manufacturer: 'JOHNDEERE', model: 'S SERIES', serial: 'JDS680013' },
  { id: 14, customerId: 14, customerName: '신기계', equipmentType: '그레이더(GRADER)', manufacturer: 'CATERPILLAR', model: '140M', serial: 'CAT140014' },
  { id: 15, customerId: 15, customerName: '오농기', equipmentType: '트랙터(TRACTOR)', manufacturer: 'FENDT', model: '700 VARIO', serial: 'FEN700015' },
  { id: 16, customerId: 16, customerName: '서건설', equipmentType: '컴팩터(COMPACTOR)', manufacturer: 'AMMANN', model: 'ARS 150', serial: 'AMM150016' },
  { id: 17, customerId: 17, customerName: '남농업', equipmentType: '스프레이어(SPRAYER)', manufacturer: 'NEWHOLLAND', model: 'SP300F', serial: 'NH300017' },
  { id: 18, customerId: 18, customerName: '고기계', equipmentType: '텔레핸들러(ARTICULATING_BOOM)', manufacturer: 'JCB', model: 'TM420', serial: 'JCB420018' },
  { id: 19, customerId: 19, customerName: '문토목', equipmentType: '덤프트럭(DUMP_TRUCK)', manufacturer: 'CATERPILLAR', model: '745C', serial: 'CAT745019' },
  { id: 20, customerId: 20, customerName: '배농장', equipmentType: '믹서(MIXER)', manufacturer: 'MITSUBISHIFUSO', model: 'FI MIXER', serial: 'MIT3900020' }
];

// 작업 이력 더미 데이터
export const WORK_HISTORY_DATA = [
  {
    id: 1,
    workDate: '2024-01-15',
    customerId: 1,
    customerName: '김농부',
    equipmentId: 1,
    equipmentType: '트랙터(TRACTOR)',
    manufacturer: 'JOHNDEERE',
    model: '6M SERIES',
    serial: 'JD6M001',
    ecuCategory: '엔진 ECU',
    ecuToolCategory: 'KESS 시리즈',
    connectionMethod: 'OBD',
    ecuType: 'Bosch EDC17',
    tuningWork: '파워업 튜닝',
    price: 350000,
    status: '완료',
    notes: '파워 20% 향상, 연비 개선 확인'
  },
  {
    id: 2,
    workDate: '2024-01-18',
    customerId: 2,
    customerName: '이농장',
    equipmentId: 2,
    equipmentType: '콤바인(COMBINE_HARVESTER)',
    manufacturer: 'NEWHOLLAND',
    model: 'CR SERIES',
    serial: 'NH890CR002',
    ecuCategory: '엔진 ECU',
    ecuToolCategory: 'FLEX 시리즈',
    connectionMethod: 'BENCH',
    ecuType: 'Bosch EDC16',
    tuningWork: '연비 개선',
    price: 280000,
    status: '완료',
    notes: '연비 15% 개선, 엔진 소음 감소'
  },
  {
    id: 3,
    workDate: '2024-01-22',
    customerId: 3,
    customerName: '박트랙터',
    equipmentId: 3,
    equipmentType: '트랙터(TRACTOR)',
    manufacturer: 'KUBOTA',
    model: 'M SERIES',
    serial: 'KB7060M003',
    ecuCategory: '요소수 ECU',
    ecuToolCategory: 'PAD Flash 시리즈',
    connectionMethod: 'OBD',
    ecuType: 'Denso',
    tuningWork: 'DPF 삭제',
    price: 450000,
    status: '완료',
    notes: 'DPF 시스템 완전 제거, 정상 작동 확인'
  },
  {
    id: 4,
    workDate: '2024-01-25',
    customerId: 4,
    customerName: '최콤바인',
    equipmentId: 4,
    equipmentType: '콤바인(COMBINE_HARVESTER)',
    manufacturer: 'CLAAS',
    model: 'LEXION SERIES',
    serial: 'CL760LX004',
    ecuCategory: '엔진 ECU',
    ecuToolCategory: 'KESS 시리즈',
    connectionMethod: 'BDM',
    ecuType: 'Bosch EDC17',
    tuningWork: '파워업 튜닝',
    price: 380000,
    status: '진행중',
    notes: '하드웨어 연결 완료, 소프트웨어 작업 중'
  },
  {
    id: 5,
    workDate: '2024-01-28',
    customerId: 5,
    customerName: '정기계',
    equipmentId: 5,
    equipmentType: '굴삭기(EXCAVATOR)',
    manufacturer: 'CATERPILLAR',
    model: '320 SERIES',
    serial: 'CAT320005',
    ecuCategory: '엔진 ECU',
    ecuToolCategory: 'FLEX 시리즈',
    connectionMethod: 'OBD',
    ecuType: 'Caterpillar ACERT',
    tuningWork: '파워업 튜닝',
    price: 420000,
    status: '완료',
    notes: '굴삭력 25% 향상, 유압 시스템 최적화'
  },
  {
    id: 6,
    workDate: '2024-02-02',
    customerId: 6,
    customerName: '강벼농사',
    equipmentId: 6,
    equipmentType: '스프레이어(SPRAYER)',
    manufacturer: 'JOHNDEERE',
    model: 'R4030',
    serial: 'JDR4030006',
    ecuCategory: '엔진 ECU',
    ecuToolCategory: 'PAD Flash 시리즈',
    connectionMethod: 'OBD',
    ecuType: 'Bosch EDC16',
    tuningWork: '연비 개선',
    price: 250000,
    status: '완료',
    notes: '연료 소모량 18% 감소'
  },
  {
    id: 7,
    workDate: '2024-02-05',
    customerId: 7,
    customerName: '송건설',
    equipmentId: 7,
    equipmentType: '휠로더(WHEEL_LOADER)',
    manufacturer: 'CATERPILLAR',
    model: '950 SERIES',
    serial: 'CAT950007',
    ecuCategory: '엔진 ECU',
    ecuToolCategory: 'KESS 시리즈',
    connectionMethod: 'BENCH',
    ecuType: 'Caterpillar C7',
    tuningWork: 'DPF 삭제',
    price: 480000,
    status: '실패',
    notes: 'ECU 보안 업데이트로 인한 접근 불가'
  },
  {
    id: 8,
    workDate: '2024-02-08',
    customerId: 8,
    customerName: '윤농기계',
    equipmentId: 8,
    equipmentType: '스키드로더(SKID_STEER_LOADER)',
    manufacturer: 'BOBCAT',
    model: 'S76',
    serial: 'BOB76008',
    ecuCategory: '엔진 ECU',
    ecuToolCategory: 'FLEX 시리즈',
    connectionMethod: 'OBD',
    ecuType: 'Kubota V2403',
    tuningWork: '파워업 튜닝',
    price: 320000,
    status: '완료',
    notes: '리프팅 파워 20% 증가'
  },
  {
    id: 9,
    workDate: '2024-02-12',
    customerId: 9,
    customerName: '장운송',
    equipmentId: 9,
    equipmentType: '지게차(FORKLIFT)',
    manufacturer: 'LINDE',
    model: 'H50D',
    serial: 'LIN50009',
    ecuCategory: '엔진 ECU',
    ecuToolCategory: 'PAD Flash 시리즈',
    connectionMethod: 'OBD',
    ecuType: 'Deutz TCD 2012',
    tuningWork: '연비 개선',
    price: 200000,
    status: '완료',
    notes: '연비 12% 개선, 배기가스 감소'
  },
  {
    id: 10,
    workDate: '2024-02-15',
    customerId: 10,
    customerName: '임토목',
    equipmentId: 10,
    equipmentType: '백호로더(BACKHOE_LOADER)',
    manufacturer: 'JCB',
    model: '3CX',
    serial: 'JCB3CX010',
    ecuCategory: '엔진 ECU',
    ecuToolCategory: 'KESS 시리즈',
    connectionMethod: 'BDM',
    ecuType: 'JCB Dieselmax',
    tuningWork: 'DPF 삭제',
    price: 400000,
    status: '진행중',
    notes: 'BDM 연결 작업 중'
  },
  {
    id: 11,
    workDate: '2024-02-18',
    customerId: 11,
    customerName: '한농업',
    equipmentId: 11,
    equipmentType: '트랙터(TRACTOR)',
    manufacturer: 'MASSEYFERGUSON',
    model: 'MF5700',
    serial: 'MF5700011',
    ecuCategory: '엔진 ECU',
    ecuToolCategory: 'FLEX 시리즈',
    connectionMethod: 'OBD',
    ecuType: 'AGCO Power',
    tuningWork: '파워업 튜닝',
    price: 360000,
    status: '완료',
    notes: '토크 증가 22%, 작업 효율성 향상'
  },
  {
    id: 12,
    workDate: '2024-02-22',
    customerId: 12,
    customerName: '조건설',
    equipmentId: 12,
    equipmentType: '불도저(BULLDOZER)',
    manufacturer: 'CATERPILLAR',
    model: 'D6T',
    serial: 'CATD6T012',
    ecuCategory: '엔진 ECU',
    ecuToolCategory: 'PAD Flash 시리즈',
    connectionMethod: 'BENCH',
    ecuType: 'Caterpillar C9',
    tuningWork: '파워업 튜닝',
    price: 500000,
    status: '완료',
    notes: '블레이드 파워 30% 증가'
  },
  {
    id: 13,
    workDate: '2024-02-25',
    customerId: 13,
    customerName: '홍농장',
    equipmentId: 13,
    equipmentType: '콤바인(COMBINE_HARVESTER)',
    manufacturer: 'JOHNDEERE',
    model: 'S SERIES',
    serial: 'JDS680013',
    ecuCategory: '요소수 ECU',
    ecuToolCategory: 'KESS 시리즈',
    connectionMethod: 'OBD',
    ecuType: 'Bosch EDC17',
    tuningWork: 'DPF 삭제',
    price: 450000,
    status: '실패',
    notes: 'ECU 암호화 강화로 접근 실패'
  },
  {
    id: 14,
    workDate: '2024-02-28',
    customerId: 14,
    customerName: '신기계',
    equipmentId: 14,
    equipmentType: '그레이더(GRADER)',
    manufacturer: 'CATERPILLAR',
    model: '140M',
    serial: 'CAT140014',
    ecuCategory: '엔진 ECU',
    ecuToolCategory: 'FLEX 시리즈',
    connectionMethod: 'OBD',
    ecuType: 'Caterpillar C7',
    tuningWork: '연비 개선',
    price: 380000,
    status: '완료',
    notes: '연비 16% 개선, 엔진 온도 안정화'
  },
  {
    id: 15,
    workDate: '2024-03-05',
    customerId: 15,
    customerName: '오농기',
    equipmentId: 15,
    equipmentType: '트랙터(TRACTOR)',
    manufacturer: 'FENDT',
    model: '700 VARIO',
    serial: 'FEN700015',
    ecuCategory: '엔진 ECU',
    ecuToolCategory: 'PAD Flash 시리즈',
    connectionMethod: 'BDM',
    ecuType: 'Deutz TCD 6.1',
    tuningWork: '파워업 튜닝',
    price: 420000,
    status: '진행중',
    notes: 'BDM 프로그래밍 진행 중'
  },
  {
    id: 16,
    workDate: '2024-03-08',
    customerId: 16,
    customerName: '조옥수수',
    equipmentId: 16,
    equipmentType: '컴팩터(COMPACTOR)',
    manufacturer: 'AMMANN',
    model: 'ARS 150',
    serial: 'AMM150016',
    ecuCategory: '엔진 ECU',
    ecuToolCategory: 'KESS 시리즈',
    connectionMethod: 'OBD',
    ecuType: 'Deutz TCD 2012',
    tuningWork: '기타',
    customTuningWork: '인젝터 타이밍 조정',
    price: 300000,
    status: '완료',
    notes: '연료 분사 타이밍 최적화로 진동 감소'
  },
  {
    id: 17,
    workDate: '2024-03-12',
    customerId: 17,
    customerName: '유콩농장',
    equipmentId: 17,
    equipmentType: '스프레이어(SPRAYER)',
    manufacturer: 'NEWHOLLAND',
    model: 'SP300F',
    serial: 'NH300017',
    ecuCategory: '엔진 ECU',
    ecuToolCategory: 'FLEX 시리즈',
    connectionMethod: 'BENCH',
    ecuType: 'Bosch EDC16',
    tuningWork: '기타',
    customTuningWork: '터보 압력 증가 + 연료맵 수정',
    price: 380000,
    status: '완료',
    notes: '터보 압력 15% 증가, 연료 효율성 개선'
  },
  {
    id: 18,
    workDate: '2024-03-15',
    customerId: 18,
    customerName: '신토마토',
    equipmentId: 18,
    equipmentType: '텔레핸들러(ARTICULATING_BOOM)',
    manufacturer: 'JCB',
    model: 'TM420',
    serial: 'JCB420018',
    ecuCategory: '엔진 ECU',
    ecuToolCategory: 'KESS 시리즈',
    connectionMethod: 'OBD',
    ecuType: 'JCB Dieselmax',
    tuningWork: '파워업 튜닝',
    price: 400000,
    status: '예약',
    notes: '3월 20일 작업 예정, 고객 요청사항: 리프팅 파워 증가'
  },
  {
    id: 19,
    workDate: '2024-02-28',
    customerId: 19,
    customerName: '허오이농원',
    equipmentId: 19,
    equipmentType: '덤프트럭(DUMP_TRUCK)',
    manufacturer: 'CATERPILLAR',
    model: '745C',
    serial: 'CAT745019',
    ecuCategory: '엔진 ECU',
    ecuToolCategory: 'PAD Flash 시리즈',
    connectionMethod: 'BENCH',
    ecuType: 'Caterpillar C18',
    tuningWork: 'DPF 삭제',
    price: 500000,
    status: 'AS',
    notes: 'DPF 삭제 후 엔진 경고등 발생, 재작업 필요'
  },
  {
    id: 20,
    workDate: '2024-03-18',
    customerId: 20,
    customerName: '전배추밭',
    equipmentId: 20,
    equipmentType: '믹서(MIXER)',
    manufacturer: 'MITSUBISHIFUSO',
    model: 'FI MIXER',
    serial: 'MIT3900020',
    ecuCategory: '엔진 ECU',
    ecuToolCategory: 'FLEX 시리즈',
    connectionMethod: 'OBD',
    ecuType: 'Mitsubishi 4M50',
    tuningWork: '연비 개선',
    price: 280000,
    status: '예약',
    notes: '3월 25일 작업 예정, 연료비 절약 목적'
  }
]; 