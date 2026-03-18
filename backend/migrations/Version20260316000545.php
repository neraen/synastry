<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260316000545 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE daily_horoscope (id INT AUTO_INCREMENT NOT NULL, user_id INT NOT NULL, date DATE NOT NULL, title VARCHAR(255) NOT NULL, overview LONGTEXT NOT NULL, love LONGTEXT NOT NULL, energy LONGTEXT NOT NULL, advice LONGTEXT NOT NULL, natal_data JSON NOT NULL, transits_data JSON NOT NULL, generated_at DATETIME NOT NULL, created_at DATETIME NOT NULL, INDEX IDX_CDA5425CA76ED395 (user_id), UNIQUE INDEX user_date_unique (user_id, date), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE daily_horoscope ADD CONSTRAINT FK_CDA5425CA76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE daily_horoscope DROP FOREIGN KEY FK_CDA5425CA76ED395');
        $this->addSql('DROP TABLE daily_horoscope');
    }
}
