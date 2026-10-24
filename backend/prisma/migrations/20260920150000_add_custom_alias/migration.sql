ALTER TABLE "Url" ADD COLUMN "customAlias" TEXT;

CREATE UNIQUE INDEX "Url_customAlias_key" ON "Url"("customAlias");
