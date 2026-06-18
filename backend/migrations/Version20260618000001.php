<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Actu astro pivot: collective dated events (astro_event) and the deterministic
 * "humeur du jour" corpus (mood_corpus). Both are global caches (not per user).
 */
final class Version20260618000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create astro_event and mood_corpus for the Actu astro feature.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE astro_event (
                id INT AUTO_INCREMENT NOT NULL,
                locale VARCHAR(10) NOT NULL,
                type VARCHAR(40) NOT NULL,
                planet VARCHAR(20) DEFAULT NULL,
                planet2 VARCHAR(20) DEFAULT NULL,
                aspect_type VARCHAR(20) DEFAULT NULL,
                sign VARCHAR(20) DEFAULT NULL,
                sign_fr VARCHAR(20) DEFAULT NULL,
                degree INT DEFAULT NULL,
                sign2_fr VARCHAR(20) DEFAULT NULL,
                degree2 INT DEFAULT NULL,
                longitude DOUBLE PRECISION DEFAULT NULL,
                longitude2 DOUBLE PRECISION DEFAULT NULL,
                exact_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)',
                month_key VARCHAR(7) NOT NULL,
                fingerprint VARCHAR(32) NOT NULL,
                metadata JSON NOT NULL,
                title VARCHAR(255) DEFAULT NULL,
                body LONGTEXT DEFAULT NULL,
                generated_at DATETIME DEFAULT NULL COMMENT '(DC2Type:datetime_immutable)',
                created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)',
                PRIMARY KEY(id),
                UNIQUE INDEX locale_fingerprint_unique (locale, fingerprint),
                INDEX idx_locale_month (locale, month_key)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        SQL);

        $this->addSql(<<<'SQL'
            CREATE TABLE mood_corpus (
                id INT AUTO_INCREMENT NOT NULL,
                locale VARCHAR(10) NOT NULL,
                moon_sign_index INT NOT NULL,
                moon_phase VARCHAR(20) NOT NULL,
                tone VARCHAR(40) DEFAULT NULL,
                text LONGTEXT NOT NULL,
                generated_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)',
                created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)',
                PRIMARY KEY(id),
                UNIQUE INDEX locale_sign_phase_unique (locale, moon_sign_index, moon_phase)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE astro_event');
        $this->addSql('DROP TABLE mood_corpus');
    }
}
