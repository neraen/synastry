<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260608000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add nullable topic column to chat_session (Lyra conversation subject). NULL = LIBRE.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE chat_session ADD topic VARCHAR(20) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE chat_session DROP topic');
    }
}
