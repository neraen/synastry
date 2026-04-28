<?php

namespace App\Tests\Controller\Api;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class SimpleWebTest extends WebTestCase
{
    public function testKernelBoots()
    {
        $client = static::createClient();
        $this->assertNotNull($client);
    }
}
