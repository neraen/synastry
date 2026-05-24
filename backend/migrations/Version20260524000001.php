<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260524000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create lyra_conversation_log table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE lyra_conversation_log (
            id INT AUTO_INCREMENT NOT NULL,
            user_id INT NOT NULL,
            user_message LONGTEXT NOT NULL,
            assistant_response LONGTEXT DEFAULT NULL,
            message_count INT NOT NULL,
            created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
            INDEX idx_lyra_log_user (user_id),
            INDEX idx_lyra_log_created (created_at),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');

        $this->addSql('ALTER TABLE lyra_conversation_log ADD CONSTRAINT FK_lyra_log_user FOREIGN KEY (user_id) REFERENCES `user` (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE lyra_conversation_log DROP FOREIGN KEY FK_lyra_log_user');
        $this->addSql('DROP TABLE lyra_conversation_log');
    }
}
