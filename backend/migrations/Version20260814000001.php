<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Blind validation corpus for the rectification engine (spec §10).
 *
 * One row per test run against a birth time the user already knew. This is the
 * table the module's only honest accuracy figure is computed from, and the
 * corpus the technique weights will be refitted on.
 */
final class Version20260814000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create blind_validation for rectification accuracy measurement.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE blind_validation (
                id INT AUTO_INCREMENT NOT NULL,
                user_id INT NOT NULL,
                known_time TIME NOT NULL,
                estimated_time TIME DEFAULT NULL,
                error_minutes INT DEFAULT NULL,
                status VARCHAR(20) NOT NULL,
                coherence INT NOT NULL,
                uncertainty_minutes INT DEFAULT NULL,
                event_count INT NOT NULL,
                day_dated_count INT NOT NULL,
                window_hours DOUBLE PRECISION NOT NULL,
                created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)',
                PRIMARY KEY(id),
                INDEX idx_blind_created (created_at),
                INDEX idx_blind_segment (event_count, day_dated_count),
                INDEX IDX_blind_user (user_id),
                CONSTRAINT FK_blind_user FOREIGN KEY (user_id)
                    REFERENCES user (id) ON DELETE CASCADE
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE blind_validation');
    }
}
