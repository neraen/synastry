<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Birth-time rectification: the resumable wizard state machine, plus the two
 * columns that let a birth time carry its provenance and its uncertainty.
 *
 * birth_time_source is nullable and left NULL on existing rows: an absent value
 * means "declared", so no backfill is needed and every profile written before
 * this migration keeps exactly the meaning it had.
 */
final class Version20260812000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create rectification_session and add birth time provenance to birth_profile.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE rectification_session (
                id INT AUTO_INCREMENT NOT NULL,
                user_id INT NOT NULL,
                step VARCHAR(30) NOT NULL,
                official_source_choice VARCHAR(20) DEFAULT NULL,
                known_time TIME DEFAULT NULL,
                document_reminder_at DATETIME DEFAULT NULL COMMENT '(DC2Type:datetime_immutable)',
                last_nudge_at DATETIME DEFAULT NULL COMMENT '(DC2Type:datetime_immutable)',
                window_answers JSON NOT NULL,
                window_start_hour DOUBLE PRECISION DEFAULT NULL,
                window_end_hour DOUBLE PRECISION DEFAULT NULL,
                events JSON NOT NULL,
                last_result JSON DEFAULT NULL,
                last_calculated_at DATETIME DEFAULT NULL COMMENT '(DC2Type:datetime_immutable)',
                dial_uncertainty_minutes INT DEFAULT NULL,
                asked_questions JSON NOT NULL,
                pending_question JSON DEFAULT NULL,
                created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)',
                updated_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)',
                PRIMARY KEY(id),
                UNIQUE INDEX UNIQ_rectification_user (user_id),
                INDEX idx_rectification_step_updated (step, updated_at),
                INDEX idx_rectification_reminder (document_reminder_at),
                CONSTRAINT FK_rectification_user FOREIGN KEY (user_id)
                    REFERENCES user (id) ON DELETE CASCADE
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        SQL);

        $this->addSql('ALTER TABLE birth_profile ADD birth_time_source VARCHAR(20) DEFAULT NULL');
        $this->addSql('ALTER TABLE birth_profile ADD birth_time_uncertainty_minutes INT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE rectification_session');
        $this->addSql('ALTER TABLE birth_profile DROP birth_time_source');
        $this->addSql('ALTER TABLE birth_profile DROP birth_time_uncertainty_minutes');
    }
}
