<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260525000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create natal_chart_section table for persistent AI-generated natal chart content';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE natal_chart_section (
            id INT AUTO_INCREMENT NOT NULL,
            user_id INT NOT NULL,
            section VARCHAR(50) NOT NULL,
            chart_hash VARCHAR(16) NOT NULL,
            content JSON NOT NULL,
            generated_at DATETIME NOT NULL,
            UNIQUE INDEX user_section_unique (user_id, section),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');

        $this->addSql('ALTER TABLE natal_chart_section ADD CONSTRAINT FK_natal_chart_section_user FOREIGN KEY (user_id) REFERENCES `user` (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE natal_chart_section DROP FOREIGN KEY FK_natal_chart_section_user');
        $this->addSql('DROP TABLE natal_chart_section');
    }
}
