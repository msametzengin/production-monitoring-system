-- CreateTable
CREATE TABLE `shifts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `startMinute` INTEGER NOT NULL,
    `endMinute` INTEGER NOT NULL,
    `plannedMinutes` INTEGER NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `shifts_code_key`(`code`),
    INDEX `shifts_isActive_sortOrder_idx`(`isActive`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `production_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `recordDate` DATE NOT NULL,
    `facilityProductId` INTEGER NOT NULL,
    `shiftId` INTEGER NOT NULL,
    `quantity` DECIMAL(14, 3) NOT NULL,
    `operatingMinutes` INTEGER NOT NULL,
    `source` ENUM('MANUAL', 'EXCEL_IMPORT') NOT NULL DEFAULT 'MANUAL',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `production_records_facilityProductId_recordDate_idx`(`facilityProductId`, `recordDate`),
    INDEX `production_records_shiftId_recordDate_idx`(`shiftId`, `recordDate`),
    UNIQUE INDEX `production_records_recordDate_facilityProductId_shiftId_key`(`recordDate`, `facilityProductId`, `shiftId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `production_records` ADD CONSTRAINT `production_records_facilityProductId_fkey` FOREIGN KEY (`facilityProductId`) REFERENCES `facility_products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_records` ADD CONSTRAINT `production_records_shiftId_fkey` FOREIGN KEY (`shiftId`) REFERENCES `shifts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
