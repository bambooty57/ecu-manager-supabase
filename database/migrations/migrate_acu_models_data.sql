-- ACU 모델 데이터 마이그레이션
-- constants/index.ts의 하드코딩된 ACU_MODELS_BY_MANUFACTURER 데이터를 Supabase로 이전

-- Bosch ACU 모델들
INSERT INTO acu_models (name, manufacturer, series, is_default) VALUES
('EDC17C74', 'Bosch', 'EDC', true),
('EDC17CP44', 'Bosch', 'EDC', true),
('EDC17CP54', 'Bosch', 'EDC', true),
('EDC17C49', 'Bosch', 'EDC', true),
('EDC16C39', 'Bosch', 'EDC', true),
('EDC16C34', 'Bosch', 'EDC', true),
('EDC7C1', 'Bosch', 'EDC', true),
('EDC7UC31', 'Bosch', 'EDC', true),
('MS6.1', 'Bosch', 'MS', true),
('MS6.2', 'Bosch', 'MS', true),
('MS6.3', 'Bosch', 'MS', true),
('AdBlue ACU', 'Bosch', 'AdBlue', true),
('DPF ACU', 'Bosch', 'DPF', true),
('SCR ACU', 'Bosch', 'SCR', true)
ON CONFLICT (name) DO NOTHING;

-- Delphi ACU 모델들
INSERT INTO acu_models (name, manufacturer, series, is_default) VALUES
('DCM3.7', 'Delphi', 'DCM', true),
('DCM6.2A', 'Delphi', 'DCM', true),
('DCM7.1', 'Delphi', 'DCM', true),
('DCM7.4', 'Delphi', 'DCM', true),
('DDEC VI', 'Delphi', 'DDEC', true),
('DDEC VII', 'Delphi', 'DDEC', true),
('DDEC VIII', 'Delphi', 'DDEC', true),
('AdBlue ACU', 'Delphi', 'AdBlue', true),
('DPF ACU', 'Delphi', 'DPF', true),
('SCR ACU', 'Delphi', 'SCR', true)
ON CONFLICT (name) DO NOTHING;

-- Continental ACU 모델들
INSERT INTO acu_models (name, manufacturer, series, is_default) VALUES
('SID803', 'Continental', 'SID', true),
('SID804', 'Continental', 'SID', true),
('SID807', 'Continental', 'SID', true),
('SID208', 'Continental', 'SID', true),
('SID209', 'Continental', 'SID', true),
('PCR2.1', 'Continental', 'PCR', true),
('EMS3120', 'Continental', 'EMS', true),
('EMS3125', 'Continental', 'EMS', true),
('EMS3132', 'Continental', 'EMS', true),
('AdBlue ACU', 'Continental', 'AdBlue', true),
('DPF ACU', 'Continental', 'DPF', true),
('SCR ACU', 'Continental', 'SCR', true)
ON CONFLICT (name) DO NOTHING;

-- Denso ACU 모델들
INSERT INTO acu_models (name, manufacturer, series, is_default) VALUES
('175800-4840', 'Denso', 'Denso', true),
('175800-4850', 'Denso', 'Denso', true),
('175800-4860', 'Denso', 'Denso', true),
('275700-6460', 'Denso', 'Denso', true),
('275700-6470', 'Denso', 'Denso', true),
('275700-6480', 'Denso', 'Denso', true),
('112500-1240', 'Denso', 'Denso', true),
('112500-1250', 'Denso', 'Denso', true),
('AdBlue ACU', 'Denso', 'AdBlue', true),
('DPF ACU', 'Denso', 'DPF', true),
('SCR ACU', 'Denso', 'SCR', true)
ON CONFLICT (name) DO NOTHING;

-- Siemens ACU 모델들
INSERT INTO acu_models (name, manufacturer, series, is_default) VALUES
('SIM271DE', 'Siemens', 'SIM', true),
('SIM271KE', 'Siemens', 'SIM', true),
('SIM2K-240', 'Siemens', 'SIM2K', true),
('SIM2K-241', 'Siemens', 'SIM2K', true),
('SIM2K-242', 'Siemens', 'SIM2K', true),
('PPD1.1', 'Siemens', 'PPD', true),
('PPD1.2', 'Siemens', 'PPD', true),
('AdBlue ACU', 'Siemens', 'AdBlue', true),
('DPF ACU', 'Siemens', 'DPF', true),
('SCR ACU', 'Siemens', 'SCR', true)
ON CONFLICT (name) DO NOTHING;

-- Cummins ACU 모델들
INSERT INTO acu_models (name, manufacturer, series, is_default) VALUES
('ISX ACU', 'Cummins', 'ISX', true),
('QSX ACU', 'Cummins', 'QSX', true),
('ISM ACU', 'Cummins', 'ISM', true),
('QSM ACU', 'Cummins', 'QSM', true),
('ISL ACU', 'Cummins', 'ISL', true),
('QSL ACU', 'Cummins', 'QSL', true),
('AdBlue ACU', 'Cummins', 'AdBlue', true),
('DPF ACU', 'Cummins', 'DPF', true),
('SCR ACU', 'Cummins', 'SCR', true)
ON CONFLICT (name) DO NOTHING;

-- Caterpillar ACU 모델들
INSERT INTO acu_models (name, manufacturer, series, is_default) VALUES
('C7 ACU', 'Caterpillar', 'C', true),
('C9 ACU', 'Caterpillar', 'C', true),
('C13 ACU', 'Caterpillar', 'C', true),
('C15 ACU', 'Caterpillar', 'C', true),
('C18 ACU', 'Caterpillar', 'C', true),
('AdBlue ACU', 'Caterpillar', 'AdBlue', true),
('DPF ACU', 'Caterpillar', 'DPF', true),
('SCR ACU', 'Caterpillar', 'SCR', true)
ON CONFLICT (name) DO NOTHING;

-- Visteon ACU 모델들
INSERT INTO acu_models (name, manufacturer, series, is_default) VALUES
('DCU-102', 'Visteon', 'DCU', true),
('DCU-103', 'Visteon', 'DCU', true),
('DCU-104', 'Visteon', 'DCU', true),
('EEC-VI', 'Visteon', 'EEC', true),
('EEC-VII', 'Visteon', 'EEC', true)
ON CONFLICT (name) DO NOTHING;

-- Magneti Marelli ACU 모델들
INSERT INTO acu_models (name, manufacturer, series, is_default) VALUES
('MJD8F3', 'Magneti Marelli', 'MJD', true),
('MJD8DF', 'Magneti Marelli', 'MJD', true),
('7SM', 'Magneti Marelli', 'SM', true),
('8SM', 'Magneti Marelli', 'SM', true)
ON CONFLICT (name) DO NOTHING;

-- Valeo ACU 모델들
INSERT INTO acu_models (name, manufacturer, series, is_default) VALUES
('V40', 'Valeo', 'V', true),
('V42', 'Valeo', 'V', true),
('V46', 'Valeo', 'V', true)
ON CONFLICT (name) DO NOTHING;

-- ZF ACU 모델들
INSERT INTO acu_models (name, manufacturer, series, is_default) VALUES
('EcoLife', 'ZF', 'Eco', true),
('EcoMid', 'ZF', 'Eco', true),
('TraXon', 'ZF', 'TraXon', true)
ON CONFLICT (name) DO NOTHING;

-- Hitachi ACU 모델들
INSERT INTO acu_models (name, manufacturer, series, is_default) VALUES
('EGI-Y4', 'Hitachi', 'EGI', true),
('EGI-Y5', 'Hitachi', 'EGI', true),
('EGI-Y6', 'Hitachi', 'EGI', true)
ON CONFLICT (name) DO NOTHING;

-- 기타 및 직접입력 옵션
INSERT INTO acu_models (name, manufacturer, series, is_default) VALUES
('기타', '기타', '기타', true),
('직접입력', '직접입력', '직접입력', true)
ON CONFLICT (name) DO NOTHING; 