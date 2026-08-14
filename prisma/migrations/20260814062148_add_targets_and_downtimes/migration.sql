-- CreateTable
CREATE TABLE `production_targets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `facilityProductId` INTEGER NOT NULL,
    `period` ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM') NOT NULL,
    `startDate` DATE NOT NULL,
    `endDate` DATE NOT NULL,
    `targetQuantity` DECIMAL(14, 3) NOT NULL,
    `notes` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `production_targets_facilityProductId_startDate_endDate_idx`(`facilityProductId`, `startDate`, `endDate`),
    INDEX `production_targets_isActive_startDate_endDate_idx`(`isActive`, `startDate`, `endDate`),
    UNIQUE INDEX `production_targets_facilityProductId_period_startDate_endDat_key`(`facilityProductId`, `period`, `startDate`, `endDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `downtime_reasons` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `category` ENUM('MAINTENANCE', 'BREAKDOWN', 'ENERGY', 'RAW_MATERIAL', 'PERSONNEL', 'CLEANING', 'PROCESS', 'OTHER') NOT NULL,
    `defaultType` ENUM('PLANNED', 'UNPLANNED') NOT NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `downtime_reasons_code_key`(`code`),
    INDEX `downtime_reasons_category_isActive_idx`(`category`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `downtime_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `facilityId` INTEGER NOT NULL,
    `downtimeReasonId` INTEGER NOT NULL,
    `type` ENUM('PLANNED', 'UNPLANNED') NOT NULL,
    `startedAt` DATETIME(3) NOT NULL,
    `endedAt` DATETIME(3) NOT NULL,
    `durationMinutes` INTEGER NOT NULL,
    `source` ENUM('MANUAL', 'EXCEL_IMPORT') NOT NULL DEFAULT 'MANUAL',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `downtime_records_facilityId_startedAt_idx`(`facilityId`, `startedAt`),
    INDEX `downtime_records_downtimeReasonId_startedAt_idx`(`downtimeReasonId`, `startedAt`),
    INDEX `downtime_records_type_startedAt_idx`(`type`, `startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `production_targets` ADD CONSTRAINT `production_targets_facilityProductId_fkey` FOREIGN KEY (`facilityProductId`) REFERENCES `facility_products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `downtime_records` ADD CONSTRAINT `downtime_records_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `downtime_records` ADD CONSTRAINT `downtime_records_downtimeReasonId_fkey` FOREIGN KEY (`downtimeReasonId`) REFERENCES `downtime_reasons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
