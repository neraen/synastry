<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260516000002 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create content_feedback table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE content_feedback (
            id INT AUTO_INCREMENT NOT NULL,
            user_id INT NOT NULL,
            content_type VARCHAR(50) NOT NULL,
            content_ref VARCHAR(255) NOT NULL,
            is_positive TINYINT(1) NOT NULL,
            created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
            INDEX IDX_content_feedback_user (user_id),
            UNIQUE INDEX user_content_unique (user_id, content_type, content_ref),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');

        $this->addSql('ALTER TABLE content_feedback ADD CONSTRAINT FK_content_feedback_user FOREIGN KEY (user_id) REFERENCES `user` (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE content_feedback DROP FOREIGN KEY FK_content_feedback_user');
        $this->addSql('DROP TABLE content_feedback');
    }
}
