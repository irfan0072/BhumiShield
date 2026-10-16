<?php

declare(strict_types=1);

namespace App\Services;

/**
 * Mock NID Verification Service (100% synthetic dummy data only, never calls external government systems).
 */
final class MockNidService
{
    public static function verify(?array $personRecord, ?string $submittedNid = null, ?string $submittedName = null): array
    {
        if (!$personRecord) {
            return [
                'verified' => false,
                'reason_code' => 'PERSON_NOT_FOUND',
                'message_bn' => 'জাতীয় পরিচয়পত্র (ডেমো রেজিস্ট্রি)-তে এই ব্যক্তির কোনো তথ্য পাওয়া যায়নি।',
                'message_en' => 'No matching citizen found in the Mock NID Registry.',
            ];
        }

        $expectedNid = trim((string) ($personRecord['nid'] ?? ''));
        if ($submittedNid !== null && trim($submittedNid) !== '' && trim($submittedNid) !== $expectedNid) {
            return [
                'verified' => false,
                'reason_code' => 'NID_NUMBER_MISMATCH',
                'expected_nid' => $expectedNid,
                'submitted_nid' => trim($submittedNid),
                'message_bn' => "প্রদত্ত এনআইডি নম্বর ({$submittedNid}) ডেমো এনআইডি রেজিস্ট্রির তথ্যের ({$expectedNid}) সাথে মিলছে না।",
                'message_en' => "Submitted NID ({$submittedNid}) does not match Mock NID Registry record ({$expectedNid}).",
            ];
        }

        if ($submittedName !== null && trim($submittedName) !== '') {
            $sub = mb_strtolower(trim($submittedName));
            $bn = mb_strtolower(trim((string) ($personRecord['name_bn'] ?? '')));
            $en = mb_strtolower(trim((string) ($personRecord['name_en'] ?? '')));
            if ($sub !== $bn && $sub !== $en) {
                return [
                    'verified' => false,
                    'reason_code' => 'NID_NAME_MISMATCH',
                    'expected_name_bn' => $personRecord['name_bn'] ?? '',
                    'expected_name_en' => $personRecord['name_en'] ?? '',
                    'submitted_name' => $submittedName,
                    'message_bn' => 'প্রদত্ত নামের সাথে ডেমো এনআইডি রেজিস্ট্রির নাম মিলছে না।',
                    'message_en' => 'Submitted name does not match the Mock NID Registry record.',
                ];
            }
        }

        return [
            'verified' => true,
            'reason_code' => 'VERIFIED',
            'nid' => $expectedNid,
            'name_bn' => $personRecord['name_bn'] ?? '',
            'name_en' => $personRecord['name_en'] ?? '',
            'is_deceased' => ((int) ($personRecord['is_deceased'] ?? 0)) === 1,
            'message_bn' => 'ডেমো এনআইডি যাচাই সফল হয়েছে।',
            'message_en' => 'Mock NID verification succeeded.',
        ];
    }
}
