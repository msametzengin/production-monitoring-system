-- CreateTable
CREATE TABLE `import_batches` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `resource` ENUM('PRODUCTION', 'TARGET', 'DOWNTIME') NOT NULL,
    `status` ENUM('COMPLETED', 'PARTIAL', 'FAILED') NOT NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `totalRows` INTEGER NOT NULL,
    `validRows` INTEGER NOT NULL,
    `invalidRows` INTEGER NOT NULL,
    `importedRows` INTEGER NOT NULL DEFAULT 0,
    `errorSummary` JSON NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `import_batches_resource_createdAt_idx`(`resource`, `createdAt`),
    INDEX `import_batches_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
