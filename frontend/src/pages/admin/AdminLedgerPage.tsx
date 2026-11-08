import React, { useEffect, useState } from 'react';
import { DatabaseBackup, RotateCcw, ShieldCheck } from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi, DatabaseBackupResponse, LedgerHealthCheckResponse } from '@/api/client';
import { toBanglaDigits } from '@/theme/tokens';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  AdminPage,
  ConfirmDialog,
  DetailList,
  EmptyState,
  Section,
  StatusBadge,
  notify,
} from '@/components/admin/kit';

interface BrokenLink {
  deed_id?: number | string;
  deed_no?: string;
  chain_index?: number | string;
  message_bn?: string;
  message_en?: string;
}

const shortHash = (h?: string | null) => (h ? `${h.slice(0, 10)}…${h.slice(-6)}` : '—');

export const AdminLedgerPage: React.FC = () => {
  const { lang, t, formatDate } = useAppUI();
  const n = (v: number | string) => toBanglaDigits(v, lang);

  const [health, setHealth] = useState<LedgerHealthCheckResponse | null>(null);
  const [checking, setChecking] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [backup, setBackup] = useState<DatabaseBackupResponse | null>(null);

  const runCheck = async (silent = false) => {
    setChecking(true);
    try {
      const res = await BhumiApi.runLedgerHealthCheck();
      setHealth(res);
      if (!silent) {
        if (res?.is_valid) notify.ok(t('সব রেকর্ড ঠিক আছে', 'All records valid'));
        else notify.err(res, lang, t('রেকর্ডে গরমিল পাওয়া গেছে', 'Records mismatch found'));
      }
    } catch (e) {
      notify.err(e, lang);
    } finally {
      setChecking(false);
    }
  };

  // The health check only reads and verifies the chain, so it is safe to run on open.
  useEffect(() => {
    runCheck(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const runBackup = async () => {
    try {
      const res = await BhumiApi.exportDatabaseBackup();
      setBackup(res);
      notify.ok(t('ব্যাকআপ নেওয়া হয়েছে', 'Backup created'));
    } catch (e) {
      notify.err(e, lang);
      throw e;
    }
  };

  const broken: BrokenLink[] = Array.isArray(health?.details?.broken_links) ? health!.details.broken_links : [];
  const sizeKb = backup ? Number(backup.file_size_kb ?? (backup.file_size_bytes || 0) / 1024) : 0;
  const sizeLabel = backup
    ? sizeKb >= 1024
      ? `${n((sizeKb / 1024).toFixed(1))} MB`
      : `${n(Math.round(sizeKb))} KB`
    : '—';

  return (
    <AdminPage className="max-w-4xl">
      <Section
        title={
          <span className="flex items-center gap-2">
            {t('নিরাপত্তা যাচাই', 'Security check')}
            {health && (
              <StatusBadge tone={health.is_valid ? 'green' : 'red'}>
                {health.is_valid ? t('নিরাপদ', 'Safe') : t('গরমিল', 'Mismatch')}
              </StatusBadge>
            )}
          </span>
        }
        action={
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => runCheck(false)} disabled={checking}>
            <RotateCcw className={cn('size-3.5', checking && 'animate-spin')} />
            {t('যাচাই করুন', 'Check')}
          </Button>
        }
        bodyClassName="space-y-3 p-4"
      >
        {!health ? (
          checking ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-8 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : (
            <EmptyState icon={ShieldCheck} text={t('এখনো যাচাই হয়নি', 'Not checked yet')} />
          )
        ) : (
          <>
            <DetailList
              items={[
                [t('যাচাইকৃত রেকর্ড', 'Records checked'), n(health.total_blocks_checked ?? 0)],
                [t('গরমিল', 'Mismatches'), n(broken.length)],
                [t('সময় লেগেছে', 'Time taken'), `${n(Math.round(Number(health.verification_time_ms) || 0))} ms`],
                [t('শেষ যাচাই', 'Last check'), health.verified_at ? formatDate(health.verified_at) : '—'],
                [t('শেষ হ্যাশ', 'Latest hash'), <span className="font-mono text-xs">{shortHash(health.latest_block_hash)}</span>],
              ]}
            />
            {broken.length > 0 && (
              <div className="overflow-hidden rounded-lg border border-rose-200">
                <div className="border-b border-rose-100 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                  {t('সমস্যাযুক্ত দলিল', 'Affected deeds')}
                </div>
                <ul className="divide-y divide-slate-100">
                  {broken.map((b, i) => (
                    <li key={`${b.deed_id ?? i}`} className="flex items-start gap-3 px-3 py-2 text-sm">
                      <span className="shrink-0 font-medium text-slate-800">
                        {b.deed_no || `#${b.deed_id ?? '—'}`}
                      </span>
                      <span className="min-w-0 flex-1 text-xs text-slate-500">
                        {t('ব্লক', 'Block')} {b.chain_index !== undefined ? n(b.chain_index) : '—'}
                        {(lang === 'bn' ? b.message_bn : b.message_en || b.message_bn) && (
                          <> · {lang === 'bn' ? b.message_bn : b.message_en || b.message_bn}</>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </Section>

      <Section
        title={t('ব্যাকআপ', 'Backup')}
        action={
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setBackupOpen(true)}>
            <DatabaseBackup className="size-3.5" />
            {t('ব্যাকআপ নিন', 'Create backup')}
          </Button>
        }
        bodyClassName="p-4"
      >
        {backup ? (
          <DetailList
            items={[
              [t('ফাইল', 'File'), <span className="font-mono text-xs">{backup.backup_filename || backup.filename || '—'}</span>],
              [t('আকার', 'Size'), sizeLabel],
              [t('যাচাই কোড', 'Checksum'), <span className="font-mono text-xs">{shortHash(backup.sha256_checksum)}</span>],
              [t('সময়', 'Time'), backup.generated_at ? formatDate(backup.generated_at) : '—'],
            ]}
          />
        ) : (
          <EmptyState icon={DatabaseBackup} text={t('এই সেশনে ব্যাকআপ নেওয়া হয়নি', 'No backup this session')} />
        )}
      </Section>

      <ConfirmDialog
        open={backupOpen}
        onOpenChange={setBackupOpen}
        title={t('ব্যাকআপ নেবেন?', 'Create backup?')}
        description={t('সার্ভারে একটি কপি সংরক্ষিত হবে', 'A copy is saved on server')}
        confirmLabel={t('ব্যাকআপ নিন', 'Create backup')}
        cancelLabel={t('বাতিল', 'Cancel')}
        onConfirm={runBackup}
      />
    </AdminPage>
  );
};
