-- CreateTable
CREATE TABLE `facilities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `location` VARCHAR(150) NULL,
    `description` TEXT NULL,
    `dailyCapacity` DECIMAL(12, 2) NULL,
    `capacityUnit` ENUM('TON', 'KILOGRAM', 'CUBIC_METER', 'UNIT') NOT NULL DEFAULT 'TON',
    `plannedDailyMinutes` INTEGER NOT NULL DEFAULT 1440,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `facilities_code_key`(`code`),
    INDEX `facilities_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
