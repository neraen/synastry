<?php

namespace App\DTO;

class CompatibilityShareDTO
{
    public string $shareId;
    public string $shareUrl;
    public string $imageUrl;

    public function __construct(
        string $shareId,
        string $baseUrl = 'https://astromatch.app'
    ) {
        $this->shareId = $shareId;
        $this->shareUrl = "{$baseUrl}/share/{$shareId}";
        $this->imageUrl = "{$baseUrl}/api/share/{$shareId}/image";
    }

    public function toArray(): array
    {
        return [
            'shareId' => $this->shareId,
            'shareUrl' => $this->shareUrl,
            'imageUrl' => $this->imageUrl,
        ];
    }
}
