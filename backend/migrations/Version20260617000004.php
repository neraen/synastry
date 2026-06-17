<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Phase 4 of the prompt-evaluation system: golden cases + runs, and linking
 * eval_result / llm_call_log to a run.
 */
final class Version20260617000004 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create eval_golden_case and eval_run; link eval_result and llm_call_log to runs.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE eval_golden_case (
                id INT AUTO_INCREMENT NOT NULL,
                name VARCHAR(120) NOT NULL,
                generation_type VARCHAR(40) NOT NULL,
                input_data JSON NOT NULL,
                expectations JSON DEFAULT NULL,
                active TINYINT(1) DEFAULT 1 NOT NULL,
                created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)',
                updated_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)',
                PRIMARY KEY(id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        SQL);

        $this->addSql(<<<'SQL'
            CREATE TABLE eval_run (
                id INT AUTO_INCREMENT NOT NULL,
                triggered_by_id INT DEFAULT NULL,
                run_type VARCHAR(20) DEFAULT 'golden' NOT NULL,
                label VARCHAR(160) DEFAULT NULL,
                status VARCHAR(20) NOT NULL,
                case_count INT DEFAULT 0 NOT NULL,
                avg_score DOUBLE PRECISION DEFAULT NULL,
                total_cost_usd NUMERIC(10, 6) DEFAULT '0' NOT NULL,
                error_message LONGTEXT DEFAULT NULL,
                started_at DATETIME DEFAULT NULL COMMENT '(DC2Type:datetime_immutable)',
                finished_at DATETIME DEFAULT NULL COMMENT '(DC2Type:datetime_immutable)',
                created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)',
                INDEX IDX_EVALRUN_TRIGGERED (triggered_by_id),
                PRIMARY KEY(id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        SQL);

        $this->addSql('ALTER TABLE eval_run ADD CONSTRAINT FK_EVALRUN_TRIGGERED FOREIGN KEY (triggered_by_id) REFERENCES user (id) ON DELETE SET NULL');

        // Link eval_result to run + golden case.
        $this->addSql('ALTER TABLE eval_result ADD eval_run_id INT DEFAULT NULL, ADD golden_case_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE eval_result ADD CONSTRAINT FK_EVALRES_RUN FOREIGN KEY (eval_run_id) REFERENCES eval_run (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE eval_result ADD CONSTRAINT FK_EVALRES_CASE FOREIGN KEY (golden_case_id) REFERENCES eval_golden_case (id) ON DELETE SET NULL');
        $this->addSql('CREATE INDEX IDX_EVALRES_RUN ON eval_result (eval_run_id)');
        $this->addSql('CREATE INDEX IDX_EVALRES_CASE ON eval_result (golden_case_id)');

        // Link llm_call_log to run (cost roll-up).
        $this->addSql('ALTER TABLE llm_call_log ADD eval_run_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE llm_call_log ADD CONSTRAINT FK_LLM_RUN FOREIGN KEY (eval_run_id) REFERENCES eval_run (id) ON DELETE CASCADE');
        $this->addSql('CREATE INDEX IDX_LLM_RUN ON llm_call_log (eval_run_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE llm_call_log DROP FOREIGN KEY FK_LLM_RUN');
        $this->addSql('DROP INDEX IDX_LLM_RUN ON llm_call_log');
        $this->addSql('ALTER TABLE llm_call_log DROP eval_run_id');

        $this->addSql('ALTER TABLE eval_result DROP FOREIGN KEY FK_EVALRES_RUN');
        $this->addSql('ALTER TABLE eval_result DROP FOREIGN KEY FK_EVALRES_CASE');
        $this->addSql('DROP INDEX IDX_EVALRES_RUN ON eval_result');
        $this->addSql('DROP INDEX IDX_EVALRES_CASE ON eval_result');
        $this->addSql('ALTER TABLE eval_result DROP eval_run_id, DROP golden_case_id');

        $this->addSql('ALTER TABLE eval_run DROP FOREIGN KEY FK_EVALRUN_TRIGGERED');
        $this->addSql('DROP TABLE eval_run');
        $this->addSql('DROP TABLE eval_golden_case');
    }
}
