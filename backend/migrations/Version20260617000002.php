<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Phase 2 of the prompt-evaluation system: scored results + per-criterion scores.
 */
final class Version20260617000002 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create eval_result and eval_score tables (scoring engine output).';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE eval_result (
                id INT AUTO_INCREMENT NOT NULL,
                user_id INT DEFAULT NULL,
                source VARCHAR(20) NOT NULL,
                generation_type VARCHAR(40) NOT NULL,
                reference_type VARCHAR(40) DEFAULT NULL,
                reference_id VARCHAR(64) DEFAULT NULL,
                input_data JSON DEFAULT NULL,
                output_data JSON DEFAULT NULL,
                deterministic_score DOUBLE PRECISION DEFAULT NULL,
                judge_score DOUBLE PRECISION DEFAULT NULL,
                composite_score DOUBLE PRECISION DEFAULT NULL,
                passed TINYINT(1) DEFAULT NULL,
                judge_model VARCHAR(60) DEFAULT NULL,
                judge_cost_usd NUMERIC(10, 6) DEFAULT NULL,
                created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)',
                INDEX idx_evalres_type_created (generation_type, created_at),
                INDEX idx_evalres_source (source),
                INDEX IDX_EVALRES_USER (user_id),
                PRIMARY KEY(id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        SQL);

        $this->addSql(<<<'SQL'
            CREATE TABLE eval_score (
                id INT AUTO_INCREMENT NOT NULL,
                eval_result_id INT NOT NULL,
                category VARCHAR(20) NOT NULL,
                criterion VARCHAR(60) NOT NULL,
                score DOUBLE PRECISION NOT NULL,
                max_score DOUBLE PRECISION NOT NULL,
                rationale LONGTEXT DEFAULT NULL,
                INDEX IDX_EVALSCORE_RESULT (eval_result_id),
                PRIMARY KEY(id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        SQL);

        $this->addSql('ALTER TABLE eval_result ADD CONSTRAINT FK_EVALRES_USER FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE eval_score ADD CONSTRAINT FK_EVALSCORE_RESULT FOREIGN KEY (eval_result_id) REFERENCES eval_result (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE eval_score DROP FOREIGN KEY FK_EVALSCORE_RESULT');
        $this->addSql('ALTER TABLE eval_result DROP FOREIGN KEY FK_EVALRES_USER');
        $this->addSql('DROP TABLE eval_score');
        $this->addSql('DROP TABLE eval_result');
    }
}
