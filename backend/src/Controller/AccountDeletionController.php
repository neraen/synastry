<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

/**
 * Public account-deletion page.
 *
 * Google Play requires a web URL where users can learn how to delete their
 * account and data without reinstalling the app. Deletion itself stays in-app
 * (ProfileController::deleteAccount); this page explains it and offers an email
 * fallback for people who no longer have the app.
 */
class AccountDeletionController extends AbstractController
{
    #[Route('/suppression-compte', name: 'public_account_deletion', methods: ['GET'])]
    public function __invoke(): Response
    {
        return $this->render('public/account_deletion.html.twig', [
            'contact_email' => 'contact@lunestia.app',
        ]);
    }
}
