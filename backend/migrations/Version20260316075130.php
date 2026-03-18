<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260316075130 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE compatibility_share (id INT AUTO_INCREMENT NOT NULL, user_id INT NOT NULL, share_id VARCHAR(8) NOT NULL, user_one_name VARCHAR(100) NOT NULL, user_two_name VARCHAR(100) NOT NULL, compatibility_score NUMERIC(5, 2) NOT NULL, summary LONGTEXT NOT NULL, user_one_positions JSON NOT NULL, user_two_positions JSON NOT NULL, compatibility_details JSON DEFAULT NULL, synastry_history_id INT NOT NULL, created_at DATETIME NOT NULL, expires_at DATETIME NOT NULL, UNIQUE INDEX UNIQ_6DC6DFF82AE63FDB (share_id), INDEX IDX_6DC6DFF8A76ED395 (user_id), INDEX idx_share_id (share_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE compatibility_share ADD CONSTRAINT FK_6DC6DFF8A76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE compatibility_share DROP FOREIGN KEY FK_6DC6DFF8A76ED395');
        $this->addSql('DROP TABLE compatibility_share');
    }
}
