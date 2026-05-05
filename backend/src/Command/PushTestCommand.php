<?php

namespace App\Command;

use App\Service\ExpoPushService;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:push:test',
    description: 'Send a test push notification to an Expo push token',
)]
class PushTestCommand extends Command
{
    public function __construct(
        private ExpoPushService $pushService,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('token', InputArgument::REQUIRED, 'Expo push token (ExponentPushToken[...])')
            ->addArgument('message', InputArgument::OPTIONAL, 'Notification body', 'Test depuis Lunestia 🌙');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io    = new SymfonyStyle($input, $output);
        $token = $input->getArgument('token');
        $msg   = $input->getArgument('message');

        $io->info("Sending test push to: {$token}");

        $this->pushService->send([$token], 'Test Lunestia', $msg, ['type' => 'test']);

        $io->success('Push notification sent (check your device).');
        return Command::SUCCESS;
    }
}
