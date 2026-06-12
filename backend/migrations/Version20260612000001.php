<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260612000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add apple_refresh_token to user — stored to revoke Sign in with Apple on account deletion (App Store 5.1.1(v)).';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE user ADD apple_refresh_token LONGTEXT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE user DROP apple_refresh_token');
    }
}
