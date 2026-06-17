<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Phase 3 of the prompt-evaluation system: human (admin) ratings.
 */
final class Version20260617000003 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create admin_rating table (human evaluation scores).';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE admin_rating (
                id INT AUTO_INCREMENT NOT NULL,
                admin_id INT NOT NULL,
                eval_result_id INT DEFAULT NULL,
                generation_type VARCHAR(40) NOT NULL,
                reference_type VARCHAR(40) DEFAULT NULL,
                reference_id VARCHAR(64) DEFAULT NULL,
                score SMALLINT NOT NULL,
                notes LONGTEXT DEFAULT NULL,
                created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)',
                INDEX idx_adminrating_type (generation_type),
                INDEX IDX_ADMINRATING_ADMIN (admin_id),
                INDEX IDX_ADMINRATING_RESULT (eval_result_id),
                PRIMARY KEY(id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        SQL);

        $this->addSql('ALTER TABLE admin_rating ADD CONSTRAINT FK_ADMINRATING_ADMIN FOREIGN KEY (admin_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE admin_rating ADD CONSTRAINT FK_ADMINRATING_RESULT FOREIGN KEY (eval_result_id) REFERENCES eval_result (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE admin_rating DROP FOREIGN KEY FK_ADMINRATING_ADMIN');
        $this->addSql('ALTER TABLE admin_rating DROP FOREIGN KEY FK_ADMINRATING_RESULT');
        $this->addSql('DROP TABLE admin_rating');
    }
}
