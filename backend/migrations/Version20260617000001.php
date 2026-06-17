<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Phase 1 of the prompt-evaluation system: token/cost ledger for every LLM call.
 */
final class Version20260617000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create llm_call_log table (token usage + estimated cost per LLM call).';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE llm_call_log (
                id INT AUTO_INCREMENT NOT NULL,
                user_id INT DEFAULT NULL,
                provider VARCHAR(20) NOT NULL,
                model VARCHAR(60) NOT NULL,
                generation_type VARCHAR(40) NOT NULL,
                reference_type VARCHAR(40) DEFAULT NULL,
                reference_id VARCHAR(64) DEFAULT NULL,
                input_tokens INT DEFAULT 0 NOT NULL,
                output_tokens INT DEFAULT 0 NOT NULL,
                cache_creation_input_tokens INT DEFAULT 0 NOT NULL,
                cache_read_input_tokens INT DEFAULT 0 NOT NULL,
                estimated_cost_usd NUMERIC(10, 6) DEFAULT '0' NOT NULL,
                latency_ms INT DEFAULT NULL,
                success TINYINT(1) DEFAULT 1 NOT NULL,
                created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)',
                INDEX idx_llm_type_created (generation_type, created_at),
                INDEX idx_llm_created (created_at),
                INDEX IDX_LLM_USER (user_id),
                PRIMARY KEY(id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        SQL);

        $this->addSql('ALTER TABLE llm_call_log ADD CONSTRAINT FK_LLM_USER FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE SET NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE llm_call_log DROP FOREIGN KEY FK_LLM_USER');
        $this->addSql('DROP TABLE llm_call_log');
    }
}
