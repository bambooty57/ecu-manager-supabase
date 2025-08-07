-- Add a 'type' column to the equipment_models table
ALTER TABLE equipment_models ADD COLUMN type TEXT NOT NULL DEFAULT 'ECU';

-- Update existing rows to have a default type if any were created before the default was set
UPDATE equipment_models SET type = 'ECU' WHERE type IS NULL;

-- Remove the default value after updating existing rows
ALTER TABLE equipment_models ALTER COLUMN type DROP DEFAULT;

-- To maintain data integrity, it's better to recreate the unique constraint
-- First, drop the old unique constraint
ALTER TABLE equipment_models DROP CONSTRAINT equipment_models_manufacturer_model_key;

-- Then, create a new unique constraint including the 'type' column
ALTER TABLE equipment_models ADD CONSTRAINT equipment_models_manufacturer_model_type_key UNIQUE (manufacturer, model, type);

-- Success message
SELECT 'Type column added and unique constraint updated successfully!' AS message; 