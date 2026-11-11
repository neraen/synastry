<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Ton Ciel : avancement de la chasse aux astres et nom de la constellation,
 * portés par le profil de naissance (un ciel par profil).
 */
final class Version20261111000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add sky_discovered and constellation_name to birth_profile (Ton Ciel).';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE birth_profile ADD sky_discovered SMALLINT DEFAULT 0 NOT NULL, ADD constellation_name VARCHAR(40) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE birth_profile DROP sky_discovered, DROP constellation_name');
    }
}
