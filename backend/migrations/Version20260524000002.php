<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260524000002 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create sandbox_result table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE sandbox_result (
            id INT AUTO_INCREMENT NOT NULL,
            user_id INT NOT NULL,
            type VARCHAR(32) NOT NULL,
            input_data JSON DEFAULT NULL,
            output_data JSON DEFAULT NULL,
            created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
            INDEX idx_sandbox_created (created_at),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');

        $this->addSql('ALTER TABLE sandbox_result ADD CONSTRAINT FK_sandbox_user FOREIGN KEY (user_id) REFERENCES `user` (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE sandbox_result DROP FOREIGN KEY FK_sandbox_user');
        $this->addSql('DROP TABLE sandbox_result');
    }
}
