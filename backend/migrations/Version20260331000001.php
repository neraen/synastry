<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260331000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create natal_transit_cache table for Miroir Temporel feature';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE natal_transit_cache (id INT AUTO_INCREMENT NOT NULL, user_id INT NOT NULL, age SMALLINT NOT NULL, planet_positions JSON NOT NULL, calculated_at DATETIME NOT NULL, UNIQUE INDEX user_age_unique (user_id, age), INDEX IDX_natal_transit_cache_user (user_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE natal_transit_cache ADD CONSTRAINT FK_natal_transit_cache_user FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE natal_transit_cache DROP FOREIGN KEY FK_natal_transit_cache_user');
        $this->addSql('DROP TABLE natal_transit_cache');
    }
}