<?php

namespace App\Exceptions;

use RuntimeException;

class ClaudeVisionException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly ?array $raw = null,
        public readonly ?int $statusCode = null,
    ) {
        parent::__construct($message);
    }
}
