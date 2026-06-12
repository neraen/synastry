<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260613000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add nullable gender to birth_profile and partner_gender to synastry_history (female/male, null = unknown).';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE birth_profile ADD gender VARCHAR(10) DEFAULT NULL');
        $this->addSql('ALTER TABLE synastry_history ADD partner_gender VARCHAR(10) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE birth_profile DROP gender');
        $this->addSql('ALTER TABLE synastry_history DROP partner_gender');
    }
}
