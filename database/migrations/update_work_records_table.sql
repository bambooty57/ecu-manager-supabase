ALTER TABLE public.work_records
ADD COLUMN total_price NUMERIC,
ADD COLUMN remapping_works JSONB;

COMMENT ON COLUMN public.work_records.total_price IS '작업에 대한 총 가격';
COMMENT ON COLUMN public.work_records.remapping_works IS 'ECU/ACU 리매핑 작업 상세 내역';

-- 기존 데이터에 대한 기본값 설정 (필요시)
-- UPDATE public.work_records SET total_price = 0 WHERE total_price IS NULL;
-- UPDATE public.work_records SET remapping_works = '[]'::jsonb WHERE remapping_works IS NULL; 