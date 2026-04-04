<?php

namespace App\EventListener;

use App\Service\Webservice\OpenAiService;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Reads the X-Ai-Model request header and sets the model on OpenAiService.
 * This allows the dev switch in the mobile app to toggle between models
 * without any backend restart.
 */
#[AsEventListener(event: KernelEvents::REQUEST, priority: 20)]
class AiModelListener
{
    public function __construct(
        private OpenAiService $openAiService,
    ) {}

    public function __invoke(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $model = $event->getRequest()->headers->get('X-Ai-Model');

        if ($model) {
            $this->openAiService->setModel($model);
        }
    }
}