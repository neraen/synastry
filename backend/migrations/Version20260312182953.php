<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260312182953 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE birth_profile (id INT AUTO_INCREMENT NOT NULL, user_id INT NOT NULL, first_name VARCHAR(100) DEFAULT NULL, birth_date DATE NOT NULL, birth_time TIME DEFAULT NULL, birth_city VARCHAR(255) NOT NULL, birth_country VARCHAR(100) DEFAULT NULL, latitude NUMERIC(10, 7) NOT NULL, longitude NUMERIC(10, 7) NOT NULL, timezone NUMERIC(4, 2) DEFAULT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, UNIQUE INDEX UNIQ_FA4A0679A76ED395 (user_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE birth_profile ADD CONSTRAINT FK_FA4A0679A76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE birth_profile DROP FOREIGN KEY FK_FA4A0679A76ED395');
        $this->addSql('DROP TABLE birth_profile');
    }
}
