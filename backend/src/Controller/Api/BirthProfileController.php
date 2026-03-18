<?php

namespace App\Controller\Api;

use App\Entity\BirthProfile;
use App\Entity\User;
use App\Repository\NatalChartRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api')]
class BirthProfileController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private ValidatorInterface $validator,
        private NatalChartRepository $natalChartRepository,
    ) {}

    /**
     * Get current user's birth profile
     */
    #[Route('/birth-profile', name: 'api_birth_profile_get', methods: ['GET'])]
    public function getProfile(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        $profile = $user->getBirthProfile();

        if (!$profile) {
            return $this->json([
                'hasProfile' => false,
                'profile' => null,
            ]);
        }

        return $this->json([
            'hasProfile' => true,
            'profile' => $profile->toArray(),
        ]);
    }

    /**
     * Create or update birth profile
     */
    #[Route('/birth-profile', name: 'api_birth_profile_save', methods: ['POST', 'PUT'])]
    public function saveProfile(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        $data = json_decode($request->getContent(), true);

        if (!$data) {
            return $this->json([
                'error' => 'Invalid JSON payload'
            ], Response::HTTP_BAD_REQUEST);
        }

        // Validate required fields
        $requiredFields = ['birthDate', 'birthCity', 'latitude', 'longitude'];
        foreach ($requiredFields as $field) {
            if (empty($data[$field])) {
                return $this->json([
                    'error' => "Field '$field' is required"
                ], Response::HTTP_BAD_REQUEST);
            }
        }

        // Get or create profile
        $profile = $user->getBirthProfile();
        $isNew = false;

        if (!$profile) {
            $profile = new BirthProfile();
            $profile->setUser($user);
            $isNew = true;
        }

        // Update profile data
        if (isset($data['firstName'])) {
            $profile->setFirstName($data['firstName']);
        }

        // Parse birth date
        try {
            $birthDate = new \DateTime($data['birthDate']);
            $profile->setBirthDate($birthDate);
        } catch (\Exception $e) {
            return $this->json([
                'error' => 'Invalid birth date format. Use YYYY-MM-DD'
            ], Response::HTTP_BAD_REQUEST);
        }

        // Parse birth time (optional)
        if (!empty($data['birthTime'])) {
            try {
                $birthTime = new \DateTime($data['birthTime']);
                $profile->setBirthTime($birthTime);
            } catch (\Exception $e) {
                return $this->json([
                    'error' => 'Invalid birth time format. Use HH:MM'
                ], Response::HTTP_BAD_REQUEST);
            }
        }

        $profile->setBirthCity($data['birthCity']);

        if (isset($data['birthCountry'])) {
            $profile->setBirthCountry($data['birthCountry']);
        }

        // Validate coordinates
        $latitude = (float) $data['latitude'];
        $longitude = (float) $data['longitude'];

        if ($latitude < -90 || $latitude > 90) {
            return $this->json([
                'error' => 'Latitude must be between -90 and 90'
            ], Response::HTTP_BAD_REQUEST);
        }

        if ($longitude < -180 || $longitude > 180) {
            return $this->json([
                'error' => 'Longitude must be between -180 and 180'
            ], Response::HTTP_BAD_REQUEST);
        }

        $profile->setLatitude((string) $latitude);
        $profile->setLongitude((string) $longitude);

        // Handle timezone: if timezoneName is provided, calculate the correct offset for the birth date
        // This is crucial for DST (daylight saving time) - summer vs winter time
        if (!empty($data['timezoneName'])) {
            $profile->setTimezoneName($data['timezoneName']);
            // Calculate timezone offset for the specific birth date
            $calculatedTimezone = $this->calculateTimezoneOffset($data['timezoneName'], $birthDate);
            $profile->setTimezone((string) $calculatedTimezone);
        } elseif (isset($data['timezone'])) {
            $profile->setTimezone((string) $data['timezone']);
        }

        $profile->setUpdatedAt(new \DateTime());

        // Validate entity
        $errors = $this->validator->validate($profile);
        if (count($errors) > 0) {
            $errorMessages = [];
            foreach ($errors as $error) {
                $errorMessages[$error->getPropertyPath()] = $error->getMessage();
            }
            return $this->json([
                'error' => 'Validation failed',
                'details' => $errorMessages
            ], Response::HTTP_BAD_REQUEST);
        }

        // Invalidate cached natal chart when profile is updated
        // This forces recalculation with the new data (including correct timezone)
        if (!$isNew) {
            $existingChart = $this->natalChartRepository->findByBirthProfile($profile);
            if ($existingChart) {
                $this->entityManager->remove($existingChart);
            }
        }

        // Save
        $this->entityManager->persist($profile);
        $this->entityManager->flush();

        return $this->json([
            'message' => $isNew ? 'Birth profile created' : 'Birth profile updated',
            'profile' => $profile->toArray(),
        ], $isNew ? Response::HTTP_CREATED : Response::HTTP_OK);
    }

    /**
     * Delete birth profile
     */
    #[Route('/birth-profile', name: 'api_birth_profile_delete', methods: ['DELETE'])]
    public function deleteProfile(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        $profile = $user->getBirthProfile();

        if (!$profile) {
            return $this->json([
                'error' => 'No birth profile found'
            ], Response::HTTP_NOT_FOUND);
        }

        $this->entityManager->remove($profile);
        $this->entityManager->flush();

        return $this->json([
            'message' => 'Birth profile deleted'
        ]);
    }

    /**
     * Calculate timezone offset in hours for a specific date
     * Handles DST (daylight saving time) correctly
     *
     * @param string $timezoneName IANA timezone name (e.g., "Europe/Paris")
     * @param \DateTimeInterface $date The date for which to calculate the offset
     * @return float Offset in hours (e.g., 2.0 for UTC+2)
     */
    private function calculateTimezoneOffset(string $timezoneName, \DateTimeInterface $date): float
    {
        try {
            $timezone = new \DateTimeZone($timezoneName);
            // Create a DateTime at noon on the given date to get the offset
            $dateTime = new \DateTime($date->format('Y-m-d') . ' 12:00:00', $timezone);
            // Get offset in seconds
            $offsetSeconds = $timezone->getOffset($dateTime);
            // Convert to hours
            return $offsetSeconds / 3600;
        } catch (\Exception $e) {
            // Fallback to 0 if timezone is invalid
            return 0.0;
        }
    }
}