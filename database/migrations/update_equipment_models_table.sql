-- Update equipment models table with English manufacturer names
-- First, delete existing data
DELETE FROM equipment_models;

-- Insert data with English manufacturer names matching the constants
INSERT INTO equipment_models (manufacturer, model) VALUES
-- KUBOTA models
('KUBOTA', 'M5-091'),
('KUBOTA', 'M5-111'),
('KUBOTA', 'M6-131'),
('KUBOTA', 'M7-151'),
('KUBOTA', 'M7-171'),
('KUBOTA', 'M8-201'),
('KUBOTA', 'MX5000'),
('KUBOTA', 'L3301'),
('KUBOTA', 'L3901'),
('KUBOTA', 'L4701'),
('KUBOTA', 'L5018'),
('KUBOTA', 'L6018'),

-- YANMAR models
('YANMAR', 'YM1500'),
('YANMAR', 'YM1700'),
('YANMAR', 'YM2000'),
('YANMAR', 'YM2200'),
('YANMAR', 'YM2500'),
('YANMAR', 'YM3000'),
('YANMAR', 'EG200'),
('YANMAR', 'EG300'),
('YANMAR', 'EG400'),
('YANMAR', 'AF220'),
('YANMAR', 'AF320'),

-- JOHNDEERE models
('JOHNDEERE', '5055E'),
('JOHNDEERE', '5065E'),
('JOHNDEERE', '5075E'),
('JOHNDEERE', '5085M'),
('JOHNDEERE', '5100M'),
('JOHNDEERE', '6110M'),
('JOHNDEERE', '6120M'),
('JOHNDEERE', '6130M'),
('JOHNDEERE', '6140M'),
('JOHNDEERE', '6155M'),
('JOHNDEERE', 'S650'),
('JOHNDEERE', 'S660'),
('JOHNDEERE', 'S670'),
('JOHNDEERE', 'S680'),
('JOHNDEERE', 'S690'),

-- NEWHOLLAND models
('NEWHOLLAND', 'T4.55'),
('NEWHOLLAND', 'T4.65'),
('NEWHOLLAND', 'T4.75'),
('NEWHOLLAND', 'T5.100'),
('NEWHOLLAND', 'T5.110'),
('NEWHOLLAND', 'T5.120'),
('NEWHOLLAND', 'T6.140'),
('NEWHOLLAND', 'T6.155'),
('NEWHOLLAND', 'T6.165'),
('NEWHOLLAND', 'T6.175'),
('NEWHOLLAND', 'CR8.80'),
('NEWHOLLAND', 'CR8.90'),
('NEWHOLLAND', 'CR9.80'),
('NEWHOLLAND', 'CR9.90'),
('NEWHOLLAND', 'CR10.90'),

-- 대동 models
('대동', 'DK551'),
('대동', 'DK751'),
('대동', 'DK901'),
('대동', 'DK1001'),
('대동', 'NX5510'),
('대동', 'NX6010'),
('대동', 'NX7010'),
('대동', 'RX6010'),
('대동', 'RX7010'),
('대동', 'RX8010'),

-- CASE models
('CASE', 'CX8070'),
('CASE', 'CX8080'),
('CASE', 'CX8090'),
('CASE', 'Axial-Flow 150'),
('CASE', 'Axial-Flow 250'),
('CASE', 'Magnum 280'),
('CASE', 'Magnum 310'),
('CASE', 'Magnum 340'),

-- 동양물산 models
('동양물산', 'TYM T433'),
('동양물산', 'TYM T503'),
('동양물산', 'TYM T603'),
('동양물산', 'TYM T723'),
('동양물산', 'TYM T1003'),
('동양물산', 'TYM T1203')

ON CONFLICT (manufacturer, model) DO NOTHING;

-- Success message
SELECT 'Equipment models updated with English manufacturer names!' AS message; 