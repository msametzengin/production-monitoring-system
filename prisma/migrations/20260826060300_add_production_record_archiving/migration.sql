-- AlterTable
ALTER TABLE `production_records` ADD COLUMN `archivedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `production_records_archivedAt_recordDate_idx` ON `production_records`(`archivedAt`, `recordDate`);
