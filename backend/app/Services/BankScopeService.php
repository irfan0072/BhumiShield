<?php
declare(strict_types=1);
namespace App\Services;
final class BankScopeService
{
    public static function assertCanManage(?array $actor, string $bankName): void
    {
        if (($actor['role'] ?? '') === 'admin') return;
        $normalize = static fn(string $s): string => trim(preg_replace('/[^a-z0-9]+/', ' ', strtolower($s)) ?? '');
        $office = trim((preg_split('/[,—–]/u', (string) ($actor['office_en'] ?? '')) ?: [''])[0]);
        $assigned = $normalize($office);
        $requested = $normalize($bankName);
        if (!in_array($actor['role'] ?? '', ['bank_officer', 'bank_manager'], true) || strlen($assigned) < 8 || !preg_match('/\bbank\b/', $assigned) || $assigned !== $requested) {
            throw new \RuntimeException(json_encode(['status'=>403,'code'=>'UNAUTHORIZED_BANK_SCOPE','message_bn'=>'শুধু আপনার নির্ধারিত ব্যাংকের বন্ধক পরিচালনা করতে পারবেন।','message_en'=>'Only liens of your assigned bank may be managed.'], JSON_UNESCAPED_UNICODE));
        }
    }
}
