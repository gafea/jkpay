-- Add tags and reference URL to Benefit, migrate existing categoryName values.
ALTER TABLE "Benefit" ADD COLUMN "categoryTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Benefit" ADD COLUMN "referenceUrl" TEXT;

UPDATE "Benefit"
SET "categoryTags" = CASE
  WHEN "categoryName" IS NULL OR "categoryName" = '' THEN ARRAY[]::TEXT[]
  ELSE ARRAY["categoryName"]
END;

ALTER TABLE "Benefit" DROP COLUMN "categoryName";
