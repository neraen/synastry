<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260505000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add push notification tables: user_push_token, user_notification_preferences, notification_log';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE user_push_token (
            id INT AUTO_INCREMENT NOT NULL,
            user_id INT NOT NULL,
            token VARCHAR(255) NOT NULL,
            platform VARCHAR(20) NOT NULL DEFAULT \'ios\',
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            UNIQUE INDEX UNIQ_USER_PUSH_TOKEN_token (token),
            INDEX IDX_USER_PUSH_TOKEN_user (user_id),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB');

        $this->addSql('CREATE TABLE user_notification_preferences (
            id INT AUTO_INCREMENT NOT NULL,
            user_id INT NOT NULL,
            enabled TINYINT(1) NOT NULL DEFAULT 1,
            transits_enabled TINYINT(1) NOT NULL DEFAULT 1,
            sky_events_enabled TINYINT(1) NOT NULL DEFAULT 1,
            daily_reminder_enabled TINYINT(1) NOT NULL DEFAULT 0,
            preferred_hour INT NOT NULL DEFAULT 8,
            timezone VARCHAR(60) NOT NULL DEFAULT \'Europe/Paris\',
            UNIQUE INDEX UNIQ_NOTIF_PREFS_user (user_id),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB');

        $this->addSql('CREATE TABLE notification_log (
            id INT AUTO_INCREMENT NOT NULL,
            user_id INT NOT NULL,
            type VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            body LONGTEXT NOT NULL,
            trigger_data JSON NOT NULL,
            sent_at DATETIME NOT NULL,
            INDEX idx_notif_user_type (user_id, type),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB');

        $this->addSql('ALTER TABLE user_push_token ADD CONSTRAINT FK_USER_PUSH_TOKEN_user FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE user_notification_preferences ADD CONSTRAINT FK_NOTIF_PREFS_user FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE notification_log ADD CONSTRAINT FK_NOTIF_LOG_user FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE user_push_token DROP FOREIGN KEY FK_USER_PUSH_TOKEN_user');
        $this->addSql('ALTER TABLE user_notification_preferences DROP FOREIGN KEY FK_NOTIF_PREFS_user');
        $this->addSql('ALTER TABLE notification_log DROP FOREIGN KEY FK_NOTIF_LOG_user');
        $this->addSql('DROP TABLE user_push_token');
        $this->addSql('DROP TABLE user_notification_preferences');
        $this->addSql('DROP TABLE notification_log');
    }
}
