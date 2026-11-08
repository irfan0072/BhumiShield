import React, { useState, useEffect, useCallback } from 'react';
import { api, BhumiApi } from '@/api/client';
import {
  AdminPage,
  PageToolbar,
  Section,
  DataTable,
  LoadingRows,
  EmptyRow,
  EmptyState,
  DetailList,
  DetailSheet,
  FormDialog,
  Field,
  StatusBadge,
  notify,
  inputCls,
} from '@/components/admin/kit';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  FolderOpen,
  Upload,
  Download,
  Eye,
  FilePlus2,
  RotateCw,
} from 'lucide-react';
import { CitizenSectionCommonProps, useCitizenFmt } from './shared';

function stripSymbols(msg: string): string {
  return String(msg || '').replace(/^[✔✖🔒🔓⚡]+\s*/g, '');
}

export const DocsSection: React.FC<CitizenSectionCommonProps> = ({
  vault,
  selectedPlotId,
  setSelectedPlotId,
}) => {
  const { t, lang, fmtNum, pick } = useCitizenFmt();
  const plots = vault.owned_plots || [];

  const activePlot =
    plots.find((p) => Number(p.plot_id) === Number(selectedPlotId)) || plots[0] || null;

  const [docsData, setDocsData] = useState<any | null>(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [inspectDoc, setInspectDoc] = useState<any | null>(null);
  const [requestingType, setRequestingType] = useState<string | null>(null);

  // Upload FormDialog state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [docType, setDocType] = useState('KHATIAN_PORCHA');
  const [docTitleBn, setDocTitleBn] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileBase64, setFileBase64] = useState('');
  const [uploading, setUploading] = useState(false);

  const loadDocs = useCallback(async () => {
    if (!activePlot?.plot_id) {
      setDocsData(null);
      return;
    }
    setDocsLoading(true);
    try {
      const res = await BhumiApi.getPlotDocuments(activePlot.plot_id);
      setDocsData(res);
    } catch (e: any) {
      notify.err(e, lang, t('কাগজপত্র লোড করা যায়নি।', 'Failed to load documents.'));
    } finally {
      setDocsLoading(false);
    }
  }, [activePlot?.plot_id, lang, t]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFileBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async () => {
    if (!activePlot?.plot_id) return;
    if (!fileBase64) {
      notify.err(null, lang, t('অনুগ্রহ করে একটি ফাইল নির্বাচন করুন।', 'Please select a file to upload.'));
      return;
    }
    setUploading(true);
    try {
      const res = await api.post(
        `/plots/${encodeURIComponent(String(activePlot.plot_id))}/documents`,
        {
          document_type: docType,
          doc_type: docType,
          file_name: fileName || 'document.pdf',
          base64_data: fileBase64,
          title_bn: docTitleBn.trim() || t('নাগরিক আপলোডকৃত কাগজপত্র', 'Citizen Uploaded Document'),
          title_en: docTitleBn.trim() || 'Citizen Uploaded Document',
        }
      );
      const data = res.data?.data ?? res.data;
      notify.ok(
        stripSymbols(
          lang === 'bn'
            ? data?.message_bn || t('কাগজপত্র আপলোড সম্পন্ন হয়েছে।', 'Document uploaded.')
            : data?.message_en || t('কাগজপত্র আপলোড সম্পন্ন হয়েছে।', 'Document uploaded.')
        )
      );
      setUploadOpen(false);
      setDocTitleBn('');
      setFileName('');
      setFileBase64('');
      loadDocs();
    } catch (err: any) {
      notify.err(err, lang, t('আপলোড ব্যর্থ হয়েছে।', 'Upload failed.'));
    } finally {
      setUploading(false);
    }
  };

  const handleRequestMissing = async (doc: any) => {
    if (!activePlot?.plot_id) return;
    setRequestingType(doc.document_type);
    try {
      const res = await BhumiApi.requestMissingDocument(
        activePlot.plot_id,
        doc.document_type
      );
      notify.ok(
        stripSymbols(
          lang === 'bn'
            ? res?.message_bn || t('কাগজপত্রের আবেদন জমা হয়েছে।', 'Document request submitted.')
            : res?.message_en || t('কাগজপত্রের আবেদন জমা হয়েছে।', 'Document request submitted.')
        )
      );
      loadDocs();
    } catch (err: any) {
      notify.err(err, lang, t('আবেদন করা যায়নি।', 'Request failed.'));
    } finally {
      setRequestingType(null);
    }
  };

  const handleDownload = async (doc: any) => {
    if (!activePlot?.plot_id || !doc?.id) return;
    try {
      const res = await api.get(
        `/plots/${encodeURIComponent(String(activePlot.plot_id))}/documents/${doc.id}/download`
      );
      const payload = res.data?.data ?? res.data;
      if (payload?.base64_content) {
        const mime = payload.mime_type || 'application/pdf';
        const link = document.createElement('a');
        link.href = `data:${mime};base64,${payload.base64_content}`;
        link.download = payload.file_name || doc.file_name || `plot-${activePlot.dag_no}-doc.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        notify.ok(t('ডাউনলোড শুরু হয়েছে।', 'Download started.'));
      }
    } catch (err: any) {
      notify.err(err, lang, t('ডাউনলোড করা যায়নি।', 'Download failed.'));
    }
  };

  if (vault.isOperatorNoVault || plots.length === 0) {
    return (
      <AdminPage fill>
        <Section title={t('কাগজপত্র', 'Documents')} fill bodyClassName="flex items-center justify-center">
          <EmptyState
            icon={FolderOpen}
            text={t(
              'এই অ্যাকাউন্টে নিজের জমি নেই — খতিয়ান ও পর্চা দেখতে জমির মালিকানা প্রয়োজন।',
              'No personal land in this account — plot ownership is required to view documents.'
            )}
          />
        </Section>
      </AdminPage>
    );
  }

  const items: any[] = docsData?.items || [];

  return (
    <AdminPage fill>
      <PageToolbar
        filters={
          <Select
            value={String(activePlot?.plot_id || '')}
            onValueChange={(val) => setSelectedPlotId(Number(val))}
          >
            <SelectTrigger className="h-8 w-64 text-xs">
              <SelectValue placeholder={t('জমি নির্বাচন করুন', 'Select plot')} />
            </SelectTrigger>
            <SelectContent>
              {plots.map((p) => (
                <SelectItem key={p.plot_id} value={String(p.plot_id)} className="text-xs">
                  {t('দাগ', 'Plot')} {fmtNum(p.dag_no_bn || p.dag_no)} · {pick(p, 'mouza')} (
                  {fmtNum(p.area_decimal ?? p.share_area_decimal ?? 0)} {t('শতক', 'dec')})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadDocs}
              disabled={docsLoading}
              className="h-8 gap-1.5 text-xs"
            >
              <RotateCw className={`size-3.5 ${docsLoading ? 'animate-spin' : ''}`} />
              {t('রিফ্রেশ', 'Refresh')}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setUploadOpen(true)}
              className="h-8 gap-1.5 text-xs"
            >
              <Upload className="size-3.5" />
              {t('কাগজপত্র আপলোড', 'Upload')}
            </Button>
          </>
        }
      />

      <Section
        title={`${t('দাগ', 'Plot')} ${fmtNum(activePlot?.dag_no_bn || activePlot?.dag_no)} — ${t('কাগজপত্রের তালিকা', 'Documents')} (${fmtNum(items.length)})`}
        fill
      >
        <DataTable
          headers={[
            t('কাগজপত্রের নাম', 'Document Title'),
            t('ধরন', 'Type'),
            t('অবস্থা', 'Status'),
            t('কাজ', 'Action'),
          ]}
          alignRight={[3]}
        >
          {docsLoading ? (
            <LoadingRows cols={4} rows={5} />
          ) : items.length === 0 ? (
            <EmptyRow cols={4} text={t('কোনো কাগজপত্র পাওয়া যায়নি', 'No documents found')} />
          ) : (
            items.map((doc, idx) => {
              const isReady =
                doc.status === 'VERIFIED' ||
                doc.status === 'UPLOADED' ||
                Boolean(doc.id && doc.file_name);
              return (
                <tr key={`${doc.id ?? doc.document_type ?? 'doc'}-${idx}`}>
                  <td>
                    <div className="font-medium text-foreground">
                      {lang === 'bn' ? doc.title_bn : doc.title_en || doc.title_bn}
                    </div>
                    {doc.file_name && (
                      <div className="text-xs text-muted-foreground font-mono">
                        {doc.file_name}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="font-mono text-xs text-slate-600">{doc.document_type}</span>
                  </td>
                  <td>
                    {doc.status === 'VERIFIED' ||
                    ['L2', 'L3'].includes(String(doc.trust_level || '').toUpperCase()) ? (
                      <StatusBadge tone="green">{t('যাচাইকৃত', 'Verified')}</StatusBadge>
                    ) : isReady ? (
                      <StatusBadge tone="blue">{t('সংরক্ষিত', 'Uploaded')}</StatusBadge>
                    ) : (
                      <StatusBadge tone="amber">{t('নেই', 'Missing')}</StatusBadge>
                    )}
                  </td>
                  <td className="text-right">
                    {isReady ? (
                      <div className="inline-flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setInspectDoc(doc)}
                          className="h-7 px-2 text-xs"
                        >
                          <Eye className="size-3.5 mr-1" />
                          {t('দেখুন', 'View')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(doc)}
                          className="h-7 px-2 text-xs"
                        >
                          <Download className="size-3.5 mr-1" />
                          {t('ডাউনলোড', 'Download')}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={requestingType === doc.document_type}
                        onClick={() => handleRequestMissing(doc)}
                        className="h-7 px-2.5 text-xs"
                      >
                        <FilePlus2 className="size-3.5 mr-1 text-amber-600" />
                        {requestingType === doc.document_type
                          ? t('পাঠানো হচ্ছে...', 'Sending...')
                          : t('কপির আবেদন', 'Request Copy')}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </DataTable>
      </Section>

      {/* Document Preview DetailSheet */}
      <DetailSheet
        open={Boolean(inspectDoc)}
        onOpenChange={(v) => {
          if (!v) setInspectDoc(null);
        }}
        title={
          inspectDoc
            ? lang === 'bn'
              ? inspectDoc.title_bn
              : inspectDoc.title_en || inspectDoc.title_bn
            : t('কাগজপত্র বিবরণ', 'Document Details')
        }
        subtitle={inspectDoc?.file_name || inspectDoc?.document_type}
        footer={
          inspectDoc ? (
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setInspectDoc(null)}
                className="h-8 text-xs"
              >
                {t('বন্ধ করুন', 'Close')}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleDownload(inspectDoc)}
                className="h-8 gap-1.5 text-xs"
              >
                <Download className="size-3.5" />
                {t('ডাউনলোড', 'Download')}
              </Button>
            </div>
          ) : undefined
        }
      >
        {inspectDoc && (
          <DetailList
            items={[
              [
                t('কাগজপত্রের নাম', 'Title'),
                lang === 'bn' ? inspectDoc.title_bn : inspectDoc.title_en || inspectDoc.title_bn,
              ],
              [
                t('ধরন', 'Document Type'),
                <span className="font-mono text-xs">{inspectDoc.document_type}</span>,
              ],
              [t('ফাইলের নাম', 'File Name'), inspectDoc.file_name || '—'],
              [
                t('ফাইলের আকার', 'Size'),
                inspectDoc.file_size_bytes
                  ? `${Math.max(1, Math.round(inspectDoc.file_size_bytes / 1024))} KB`
                  : '—',
              ],
              [
                t('অবস্থা', 'Status'),
                <StatusBadge tone="green">
                  {inspectDoc.status === 'VERIFIED'
                    ? t('যাচাইকৃত', 'Verified')
                    : t('সংরক্ষিত', 'Saved')}
                </StatusBadge>,
              ],
              [
                t('ডিজিটাল হ্যাশ', 'SHA-256 Hash'),
                <span className="font-mono text-xs break-all text-muted-foreground">
                  {inspectDoc.file_hash || '—'}
                </span>,
              ],
            ]}
          />
        )}
      </DetailSheet>

      {/* Upload Document FormDialog */}
      <FormDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        title={t('কাগজপত্র আপলোড', 'Upload Document')}
        description={`${t('দাগ', 'Plot')} ${fmtNum(activePlot?.dag_no_bn || activePlot?.dag_no)} · ${pick(activePlot, 'mouza')}`}
        submitLabel={t('আপলোড করুন', 'Upload')}
        cancelLabel={t('বাতিল', 'Cancel')}
        busy={uploading}
        onSubmit={handleUploadSubmit}
      >
        <Field label={t('কাগজপত্রের ধরন', 'Document Type')}>
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="KHATIAN_PORCHA" className="text-xs">
                {t('খতিয়ান পর্চা', 'Khatian Porcha')}
              </SelectItem>
              <SelectItem value="REGISTERED_DEED" className="text-xs">
                {t('নিবন্ধিত দলিল', 'Registered Deed')}
              </SelectItem>
              <SelectItem value="DCR_RECEIPT" className="text-xs">
                {t('ডিসিআর রসিদ', 'DCR Receipt')}
              </SelectItem>
              <SelectItem value="LD_TAX_RECEIPT" className="text-xs">
                {t('ভূমি উন্নয়ন কর দাখিলা', 'LD Tax Dakhila')}
              </SelectItem>
              <SelectItem value="OTHER" className="text-xs">
                {t('অন্যান্য কাগজপত্র', 'Other Document')}
              </SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label={t('শিরোনাম (ঐচ্ছিক)', 'Title (optional)')}>
          <input
            type="text"
            value={docTitleBn}
            onChange={(e) => setDocTitleBn(e.target.value)}
            placeholder={t('যেমন: বিএস খতিয়ান পর্চা', 'e.g. BS Khatian Porcha')}
            className={inputCls}
          />
        </Field>

        <Field
          label={t('ফাইল নির্বাচন করুন', 'Select File')}
          hint={t('সর্বোচ্চ ১০ মেগাবাইট (PDF বা ছবি)', 'Max 10 MB (PDF or Image)')}
        >
          <input
            type="file"
            accept=".pdf,image/*"
            onChange={handleFileChange}
            className="block w-full text-xs text-muted-foreground file:mr-2.5 file:py-1.5 file:px-3 file:rounded-md file:border file:border-border file:text-xs file:font-medium file:bg-muted file:text-foreground hover:file:bg-muted/80 cursor-pointer"
            required
          />
        </Field>
      </FormDialog>
    </AdminPage>
  );
};
export default DocsSection;
