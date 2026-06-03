<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260603000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create user_psy_profile table for the persistent psychological digest';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE user_psy_profile (
            id INT AUTO_INCREMENT NOT NULL,
            user_id INT NOT NULL,
            version INT NOT NULL,
            genere_le DATE NOT NULL,
            data JSON NOT NULL,
            UNIQUE INDEX user_psy_profile_user_unique (user_id),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');

        $this->addSql('ALTER TABLE user_psy_profile ADD CONSTRAINT FK_user_psy_profile_user FOREIGN KEY (user_id) REFERENCES `user` (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE user_psy_profile DROP FOREIGN KEY FK_user_psy_profile_user');
        $this->addSql('DROP TABLE user_psy_profile');
    }
}
