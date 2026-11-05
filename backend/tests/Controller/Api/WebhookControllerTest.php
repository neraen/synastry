<?php

namespace App\Tests\Controller\Api;

use App\Controller\Api\WebhookController;
use App\Service\PremiumService;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\Request;

class WebhookControllerTest extends TestCase
{
    private const SECRET = 'test-secret';

    private PremiumService&MockObject $premiumService;

    protected function setUp(): void
    {
        $this->premiumService = $this->createMock(PremiumService::class);
    }

    private function post(array $event, ?string $secret = self::SECRET, ?string $authorization = 'Bearer ' . self::SECRET): int
    {
        $controller = new WebhookController($this->premiumService, new NullLogger(), $secret);
        $controller->setContainer(new Container());

        $server = $authorization !== null ? ['HTTP_AUTHORIZATION' => $authorization] : [];
        $request = Request::create('/api/webhooks/revenuecat', 'POST', [], [], [], $server, json_encode(['event' => $event]));

        return $controller->revenueCat($request)->getStatusCode();
    }

    private function futureMs(): int
    {
        return (time() + 86400) * 1000;
    }

    public function testRejectsEveryEventWhenSecretIsNotConfigured(): void
    {
        $this->premiumService->expects($this->never())->method('activate');

        $status = $this->post(['type' => 'INITIAL_PURCHASE', 'app_user_id' => '1'], null, null);

        $this->assertSame(503, $status);
    }

    public function testRejectsWrongSecret(): void
    {
        $this->premiumService->expects($this->never())->method('activate');

        $status = $this->post(['type' => 'INITIAL_PURCHASE', 'app_user_id' => '1'], self::SECRET, 'Bearer wrong');

        $this->assertSame(401, $status);
    }

    public function testInitialPurchaseActivates(): void
    {
        $this->premiumService->expects($this->once())->method('activate')->with('1', $this->isInstanceOf(\DateTimeInterface::class));

        $this->assertSame(200, $this->post(['type' => 'INITIAL_PURCHASE', 'app_user_id' => '1', 'expiration_at_ms' => $this->futureMs()]));
    }

    public function testTurningOffAutoRenewKeepsAccessUntilExpiry(): void
    {
        $this->premiumService->expects($this->never())->method('deactivate');
        $this->premiumService->expects($this->once())->method('renew')->with('1', $this->isInstanceOf(\DateTimeInterface::class));

        $this->post(['type' => 'CANCELLATION', 'app_user_id' => '1', 'cancel_reason' => 'UNSUBSCRIBE', 'expiration_at_ms' => $this->futureMs()]);
    }

    public function testBillingErrorCancellationKeepsAccessUntilExpiration(): void
    {
        $this->premiumService->expects($this->never())->method('deactivate');

        $this->post(['type' => 'CANCELLATION', 'app_user_id' => '1', 'cancel_reason' => 'BILLING_ERROR', 'expiration_at_ms' => $this->futureMs()]);
    }

    public function testRefundRevokesImmediately(): void
    {
        $this->premiumService->expects($this->once())->method('deactivate')->with('1');

        $this->post(['type' => 'CANCELLATION', 'app_user_id' => '1', 'cancel_reason' => 'CUSTOMER_SUPPORT', 'expiration_at_ms' => $this->futureMs()]);
    }

    public function testBillingIssueDoesNotRemoveAccess(): void
    {
        $this->premiumService->expects($this->never())->method('deactivate');

        $this->assertSame(200, $this->post(['type' => 'BILLING_ISSUE', 'app_user_id' => '1']));
    }

    public function testExpirationDeactivates(): void
    {
        $this->premiumService->expects($this->once())->method('deactivate')->with('1');

        $this->post(['type' => 'EXPIRATION', 'app_user_id' => '1']);
    }

    public function testDeprecatedSubscriberAliasGrantsNothing(): void
    {
        $this->premiumService->expects($this->never())->method('activate');

        $this->assertSame(200, $this->post(['type' => 'SUBSCRIBER_ALIAS', 'app_user_id' => '1']));
    }
}
