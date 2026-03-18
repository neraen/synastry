<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260312184040 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE natal_chart (id INT AUTO_INCREMENT NOT NULL, user_id INT NOT NULL, birth_profile_id INT NOT NULL, planetary_positions JSON NOT NULL, interpretation LONGTEXT DEFAULT NULL, calculated_at DATETIME NOT NULL, created_at DATETIME NOT NULL, INDEX IDX_74B410E4A76ED395 (user_id), UNIQUE INDEX UNIQ_74B410E4FD32991D (birth_profile_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE natal_chart ADD CONSTRAINT FK_74B410E4A76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE natal_chart ADD CONSTRAINT FK_74B410E4FD32991D FOREIGN KEY (birth_profile_id) REFERENCES birth_profile (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE natal_chart DROP FOREIGN KEY FK_74B410E4A76ED395');
        $this->addSql('ALTER TABLE natal_chart DROP FOREIGN KEY FK_74B410E4FD32991D');
        $this->addSql('DROP TABLE natal_chart');
    }
}
