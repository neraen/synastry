<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260612000002 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create chat_report table — user reports of inappropriate AI responses (App Store guideline 1.2).';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE chat_report (id INT AUTO_INCREMENT NOT NULL, user_id INT NOT NULL, reported_message LONGTEXT NOT NULL, reason VARCHAR(500) DEFAULT NULL, created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', INDEX idx_chat_report_user (user_id), INDEX idx_chat_report_created (created_at), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE chat_report ADD CONSTRAINT FK_chat_report_user FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE chat_report DROP FOREIGN KEY FK_chat_report_user');
        $this->addSql('DROP TABLE chat_report');
    }
}
