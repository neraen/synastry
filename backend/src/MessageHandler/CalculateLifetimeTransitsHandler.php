<?php

namespace App\MessageHandler;

use App\Entity\NatalTransitCache;
use App\Message\CalculateLifetimeTransitsMessage;
use App\Repository\NatalTransitCacheRepository;
use App\Repository\UserRepository;
use App\Service\PlanetaryCalculator;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
final class CalculateLifetimeTransitsHandler
{
    public function __construct(
        private UserRepository $userRepository,
        private NatalTransitCacheRepository $cacheRepository,
        private EntityManagerInterface $entityManager,
    ) {}

    public function __invoke(CalculateLifetimeTransitsMessage $message): void
    {
        $user = $this->userRepository->find($message->userId);

        if (!$user || !$user->hasBirthProfile()) {
            return;
        }

        $birthDate = $user->getBirthProfile()->getBirthDate();

        for ($age = 0; $age <= 80; $age++) {
            // Calculate target date: birth date + age years (approximated as 365.25 days/year)
            $targetDate = (clone $birthDate)->modify(sprintf('+%d days', (int)($age * 365.25)));

            $transitCalculator = new PlanetaryCalculator(
                $targetDate->format('Y-m-d'),
                '12:00',
                0.0,
                0.0,
                'Transit'
            );
            $positions = $transitCalculator->getPlanetaryPositionsForApi();

            // Upsert: update existing cache entry or create a new one
            $cache = $this->cacheRepository->findByUserAndAge($user, $age);
            if ($cache === null) {
                $cache = new NatalTransitCache();
                $cache->setUser($user);
                $cache->setAge($age);
            }

            $cache->setPlanetPositions($positions);
            $cache->setCalculatedAt(new \DateTime());

            $this->entityManager->persist($cache);
        }

        $this->entityManager->flush();
    }
}