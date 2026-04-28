<?php

namespace App\Tests\Entity;

use App\Entity\BirthProfile;
use App\Entity\User;
use PHPUnit\Framework\TestCase;

class UserTest extends TestCase
{
    public function testGetRolesAlwaysIncludesUserRole()
    {
        $user = new User();
        $this->assertEquals(['ROLE_USER'], $user->getRoles());

        $user->setRoles(['ROLE_ADMIN']);
        // ROLE_USER is always appended in getRoles()
        $this->assertContains('ROLE_USER', $user->getRoles());
        $this->assertContains('ROLE_ADMIN', $user->getRoles());
    }

    public function testIsPremiumWithoutDate()
    {
        $user = new User();
        $this->assertFalse($user->isPremium());

        $user->setIsPremium(true);
        $this->assertTrue($user->isPremium());
    }

    public function testIsPremiumWithExpirationDate()
    {
        $user = new User();
        $user->setIsPremium(true);

        // Future date
        $user->setPremiumUntil(new \DateTime('+1 month'));
        $this->assertTrue($user->isPremium());

        // Past date
        $user->setPremiumUntil(new \DateTime('-1 day'));
        $this->assertFalse($user->isPremium());
    }

    public function testSetBirthProfileUpdatesBothSidesOfRelation()
    {
        $user = new User();
        $profile = new BirthProfile();

        $user->setBirthProfile($profile);

        $this->assertSame($profile, $user->getBirthProfile());
        $this->assertTrue($user->hasBirthProfile());
        $this->assertSame($user, $profile->getUser());

        // Test unset
        $user->setBirthProfile(null);
        $this->assertNull($user->getBirthProfile());
        $this->assertFalse($user->hasBirthProfile());
        $this->assertNull($profile->getUser());
    }
}
