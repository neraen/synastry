<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260516000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add displayName, createdAt, lastLoginAt to User';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE user ADD display_name VARCHAR(255) DEFAULT NULL, ADD created_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\', ADD last_login_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\'');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE user DROP display_name, DROP created_at, DROP last_login_at');
    }
}
