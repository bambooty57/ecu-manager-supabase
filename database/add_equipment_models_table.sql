-- Equipment models table creation
CREATE TABLE IF NOT EXISTS equipment_models (
    id SERIAL PRIMARY KEY,
    manufacturer TEXT NOT NULL,
    model TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(manufacturer, model)
);

-- Enable RLS
ALTER TABLE equipment_models ENABLE ROW LEVEL SECURITY;

-- Allow all access policy (for testing)
CREATE POLICY "Allow all access" ON equipment_models FOR ALL USING (true);

-- Insert default model data from constants
INSERT INTO equipment_models (manufacturer, model) VALUES
-- Kubota models
('구보다', 'M5-091'),
('구보다', 'M5-111'),
('구보다', 'M6-131'),
('구보다', 'M7-151'),
('구보다', 'M7-171'),
('구보다', 'M8-201'),
('구보다', 'MX5000'),
('구보다', 'L3301'),
('구보다', 'L3901'),
('구보다', 'L4701'),
('구보다', 'L5018'),
('구보다', 'L6018'),

-- Yanmar models
('얀마', 'YM1500'),
('얀마', 'YM1700'),
('얀마', 'YM2000'),
('얀마', 'YM2200'),
('얀마', 'YM2500'),
('얀마', 'YM3000'),
('얀마', 'EG200'),
('얀마', 'EG300'),
('얀마', 'EG400'),
('얀마', 'AF220'),
('얀마', 'AF320'),

-- John Deere models
('존디어', '5055E'),
('존디어', '5065E'),
('존디어', '5075E'),
('존디어', '5085M'),
('존디어', '5100M'),
('존디어', '6110M'),
('존디어', '6120M'),
('존디어', '6130M'),
('존디어', '6140M'),
('존디어', '6155M'),
('존디어', 'S650'),
('존디어', 'S660'),
('존디어', 'S670'),
('존디어', 'S680'),
('존디어', 'S690'),

-- New Holland models
('뉴홀랜드', 'T4.55'),
('뉴홀랜드', 'T4.65'),
('뉴홀랜드', 'T4.75'),
('뉴홀랜드', 'T5.100'),
('뉴홀랜드', 'T5.110'),
('뉴홀랜드', 'T5.120'),
('뉴홀랜드', 'T6.140'),
('뉴홀랜드', 'T6.155'),
('뉴홀랜드', 'T6.165'),
('뉴홀랜드', 'T6.175'),
('뉴홀랜드', 'CR8.80'),
('뉴홀랜드', 'CR8.90'),
('뉴홀랜드', 'CR9.80'),
('뉴홀랜드', 'CR9.90'),
('뉴홀랜드', 'CR10.90'),

-- Daedong models
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

-- International models
('국제', 'CX8070'),
('국제', 'CX8080'),
('국제', 'CX8090'),
('국제', 'Axial-Flow 150'),
('국제', 'Axial-Flow 250'),
('국제', 'Magnum 280'),
('국제', 'Magnum 310'),
('국제', 'Magnum 340'),

-- Dongyang models
('동양', 'TYM T433'),
('동양', 'TYM T503'),
('동양', 'TYM T603'),
('동양', 'TYM T723'),
('동양', 'TYM T1003'),
('동양', 'TYM T1203')

ON CONFLICT (manufacturer, model) DO NOTHING;

-- Success message
SELECT 'Equipment models table created successfully!' AS message; 