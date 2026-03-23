<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260322120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add premium fields (is_premium, premium_until) to user table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE user ADD is_premium TINYINT(1) NOT NULL DEFAULT 0');
        $this->addSql('ALTER TABLE user ADD premium_until DATETIME DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE user DROP COLUMN is_premium');
        $this->addSql('ALTER TABLE user DROP COLUMN premium_until');
    }
}