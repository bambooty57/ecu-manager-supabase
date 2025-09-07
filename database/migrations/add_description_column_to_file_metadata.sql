-- file_metadata 테이블에 description 컬럼 추가
-- 파일 설명을 저장하기 위한 컬럼

ALTER TABLE file_metadata 
ADD COLUMN description TEXT;

-- description 컬럼에 대한 코멘트 추가
COMMENT ON COLUMN file_metadata.description IS '파일에 대한 사용자 설명';
