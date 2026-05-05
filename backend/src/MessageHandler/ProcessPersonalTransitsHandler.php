<?php

namespace App\MessageHandler;

use App\Message\ProcessPersonalTransitsMessage;
use App\Service\AstroNotificationEngine;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
final class ProcessPersonalTransitsHandler
{
    public function __construct(
        private AstroNotificationEngine $engine,
    ) {}

    public function __invoke(ProcessPersonalTransitsMessage $message): void
    {
        $this->engine->processPersonalTransits();
    }
}
