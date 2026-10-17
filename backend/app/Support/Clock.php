<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Clock Service for Deterministic Simulation and Time Progression.
 * Supports advancing test time across the 12-month simulation window.
 */
class Clock
{
    private static ?\DateTimeImmutable $testNow = null;

    public static function setTestNow(\DateTimeImmutable|string|null $time): void
    {
        if ($time === null) {
            self::$testNow = null;
        } elseif (is_string($time)) {
            self::$testNow = new \DateTimeImmutable($time);
        } else {
            self::$testNow = $time;
        }
    }

    public static function now(): \DateTimeImmutable
    {
        return self::$testNow ?? new \DateTimeImmutable();
    }

    public static function iso(): string
    {
        return self::now()->format('c');
    }

    public static function advanceDays(int $days = 1): void
    {
        self::$testNow = self::now()->modify("+{$days} days");
    }

    public static function advanceHours(int $hours = 1): void
    {
        self::$testNow = self::now()->modify("+{$hours} hours");
    }

    public static function reset(): void
    {
        self::$testNow = null;
    }
}
