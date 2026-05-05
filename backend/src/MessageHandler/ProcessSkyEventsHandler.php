<?php

namespace App\MessageHandler;

use App\Message\ProcessSkyEventsMessage;
use App\Service\AstroNotificationEngine;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
final class ProcessSkyEventsHandler
{
    public function __construct(
        private AstroNotificationEngine $engine,
    ) {}

    public function __invoke(ProcessSkyEventsMessage $message): void
    {
        $this->engine->processSkyEvents();
    }
}
