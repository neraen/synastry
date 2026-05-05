<?php

namespace App\MessageHandler;

use App\Message\ProcessDailyRemindersMessage;
use App\Service\AstroNotificationEngine;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
final class ProcessDailyRemindersHandler
{
    public function __construct(
        private AstroNotificationEngine $engine,
    ) {}

    public function __invoke(ProcessDailyRemindersMessage $message): void
    {
        $this->engine->processDailyReminders();
    }
}
