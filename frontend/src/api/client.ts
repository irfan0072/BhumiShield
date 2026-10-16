import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 12000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bs_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Finding {
  rule_code: string;
  severity: 'SAFE' | 'WARNING' | 'HIGH';
  title_bn: string;
  title_en: string;
  detail_bn: string;
  detail_en: string;
  action_bn: string;
  action_en: string;
}

export interface RiskReportResponse {
  status: 'SAFE' | 'WARNING' | 'HIGH_RISK';
  badge_bn: string;
  badge_en: string;
  summary_bn: string;
  summary_en: string;
  next_step_bn: string;
  next_step_en: string;
  findings: Finding[];
  plot?: any;
  khatian_chain?: Array<{
    id: number;
    survey_type: string;
    khatian_no: string;
    recorded_area_decimal: number;
    survey_year: number;
    reconcile_status: string;
    anomaly_note_bn: string;
    anomaly_note_en: string;
    owners: Array<{
      person_id: number;
      name_bn: string;
      name_en: string;
      father_name_bn: string;
      nid_mock: string;
      share_fraction: string;
      share_area_decimal: number;
    }>;
  }>;
  active_mortgages?: Array<{
    id: number;
    bank_name_bn: string;
    bank_name_en: string;
    branch_name: string;
    loan_amount_bdt: number;
    status: string;
    created_at: string;
  }>;
  deed_history?: Array<{
    id: number;
    deed_no: string;
    deed_type: string;
    seller_name_bn: string;
    buyer_name_bn: string;
    area_decimal: number;
    share_fraction: string;
    declared_value_bdt: number;
    status: string;
    content_hash: string;
    prev_hash: string;
    chain_index: number;
    is_tampered_demo: number;
    created_at: string;
  }>;
  disclaimer_bn: string;
  disclaimer_en: string;
}

function normalizeRiskBundle(raw: any): RiskReportResponse {
  if (raw && raw.findings && raw.status) {
    return raw as RiskReportResponse;
  }
  const rr = raw?.risk_report || raw || {};
  const verdict = rr.verdict || rr.status || 'SAFE';
  const status: 'SAFE' | 'WARNING' | 'HIGH_RISK' =
    verdict === 'HIGH_RISK' ? 'HIGH_RISK' : verdict === 'REVIEW' || verdict === 'WARNING' ? 'WARNING' : 'SAFE';

  const rawFlags = rr.flags || rr.findings || [];
  const findings: Finding[] =
    rawFlags.length > 0
      ? rawFlags.map((f: any) => ({
          rule_code: f.rule_id || f.rule_code || 'CHECK_RULE',
          severity:
            f.severity === 'HIGH_RISK' || f.severity === 'HIGH'
              ? 'HIGH'
              : f.severity === 'REVIEW' || f.severity === 'WARNING'
              ? 'WARNING'
              : 'SAFE',
          title_bn: f.title_bn || 'পর্যবেক্ষণ',
          title_en: f.title_en || 'Observation',
          detail_bn: f.message_bn || f.detail_bn || '',
          detail_en: f.message_en || f.detail_en || '',
          action_bn:
            f.severity === 'HIGH_RISK'
              ? 'এই লেনদেন স্থগিত রাখুন এবং মূল বালাম ও খতিয়ান যাচাই করুন।'
              : 'সংশ্লিষ্ট এসি ল্যান্ড বা সাব-রেজিস্ট্রারের ম্যানুয়াল অনুমোদন নিন।',
          action_en:
            f.severity === 'HIGH_RISK'
              ? 'Hold this transaction and inspect physical registry volumes.'
              : 'Obtain manual officer verification from AC Land / Sub-Registrar.',
        }))
      : [
          {
            rule_code: 'ALL_CHECKS_PASSED',
            severity: 'SAFE',
            title_bn: 'মালিকানা চেইন, ডিজিটাল স্বাক্ষর ও ব্যাংক বন্ধক যাচাই সফল',
            title_en: 'Ownership Lineage, Cryptographic Hash & Lien Checks Passed',
            detail_bn:
              'সিএস → এসএ → আরএস → বিএস খতিয়ান পরম্পরা, বিক্রেতার মালিকানা অংশ এবং লেজার স্বাক্ষরে কোনো অসামঞ্জস্য পাওয়া যায়নি।',
            detail_en:
              'CS -> SA -> RS -> BS khatian lineage, seller share fraction, and cryptographic ledger checks passed.',
            action_bn: 'আপনি নির্বিঘ্নে প্রাক-নিবন্ধন ও দলিল সম্পাদন প্রক্রিয়া এগিয়ে নিতে পারেন।',
            action_en: 'You may safely proceed with pre-registration and deed execution.',
          },
        ];

  const ownershipHistory = raw?.ownership_history || raw?.current_owners || [];
  const rawKhatians = raw?.khatian_chain || [];
  const khatianChain = rawKhatians.map((k: any) => {
    const kOwners = ownershipHistory
      .filter((o: any) => Number(o.khatian_id) === Number(k.id))
      .map((o: any) => ({
        person_id: Number(o.person_id),
        name_bn: o.owner_name_bn || o.name_bn || 'মালিক',
        name_en: o.owner_name_en || o.name_en || 'Owner',
        father_name_bn: o.father_name_bn || '',
        nid_mock: o.nid || o.nid_mock || '',
        share_fraction: o.share_fraction || '1/1',
        share_area_decimal: Number(o.area_decimal ?? o.share_area_decimal ?? 0),
      }));

    return {
      id: Number(k.id),
      survey_type: k.survey_type,
      khatian_no: k.khatian_no,
      recorded_area_decimal: Number(k.recorded_area_decimal),
      survey_year: Number(k.survey_year),
      reconcile_status: k.status === 'VALID' || k.reconcile_status === 'MATCHED' ? 'MATCHED' : k.status || 'ANOMALY',
      anomaly_note_bn: k.remarks_bn || k.anomaly_note_bn || '',
      anomaly_note_en: k.remarks_en || k.anomaly_note_en || '',
      owners: kOwners,
    };
  });

  const mortgages = (raw?.mortgages || raw?.active_mortgages || [])
    .filter((m: any) => m.status === 'ACTIVE')
    .map((m: any) => ({
      id: Number(m.id),
      bank_name_bn: m.bank_name_bn,
      bank_name_en: m.bank_name_en,
      branch_name: m.branch_bn || m.branch_name || 'প্রধান শাখা',
      loan_amount_bdt: Number(m.amount_bdt ?? m.loan_amount_bdt ?? 0),
      status: m.status,
      created_at: m.created_at,
    }));

  const deedHistory = (raw?.deeds || raw?.deed_history || []).map((d: any) => ({
    id: Number(d.id),
    deed_no: d.deed_no,
    deed_type: d.deed_type,
    seller_name_bn: d.seller_name_bn || '',
    buyer_name_bn: d.buyer_name_bn || '',
    area_decimal: Number(d.area_decimal),
    share_fraction: d.share_fraction || '1/1',
    declared_value_bdt: Number(d.price_bdt ?? d.declared_value_bdt ?? 0),
    status: d.status,
    content_hash: d.content_hash,
    prev_hash: d.prev_hash,
    chain_index: Number(d.chain_index),
    is_tampered_demo: d.ledger_valid === false ? 1 : Number(d.is_tampered_demo ?? 0),
    created_at: d.created_at,
  }));

  const nextStepsBn = Array.isArray(rr.next_steps_bn) ? rr.next_steps_bn.join(' • ') : rr.next_step_bn || '';
  const nextStepsEn = Array.isArray(rr.next_steps_en) ? rr.next_steps_en.join(' • ') : rr.next_step_en || '';

  return {
    status,
    badge_bn: rr.badge_bn || (status === 'SAFE' ? '✔ নিরাপদ' : status === 'WARNING' ? '⚠ সতর্কতা' : '✖ ঝুঁকিপূর্ণ'),
    badge_en: rr.badge_en || (status === 'SAFE' ? '✔ Safe & Verified' : status === 'WARNING' ? '⚠ Needs Review' : '✖ High Risk'),
    summary_bn: rr.summary_bn || '',
    summary_en: rr.summary_en || '',
    next_step_bn: nextStepsBn,
    next_step_en: nextStepsEn,
    findings,
    plot: raw?.plot,
    khatian_chain: khatianChain,
    active_mortgages: mortgages,
    deed_history: deedHistory,
    disclaimer_bn:
      rr.disclaimer_bn ||
      'বিশেষ দ্রষ্টব্য: ভূমি সুরক্ষা শুধুমাত্র সম্ভাব্য ঝুঁকি চিহ্নিত করে; চূড়ান্ত আইনি সিদ্ধান্ত সংশ্লিষ্ট সরকারি কর্মকর্তার।',
    disclaimer_en:
      rr.disclaimer_en ||
      'Disclaimer: BhumiShield flags risk for a human officer to decide. It never declares final legal truth.',
  };
}

export const BhumiApi = {
  // Auth & RBAC Middleware Endpoints
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }).then((r) => {
      const u = r.data.user;
      if (u) {
        u.nid_mock = u.nid || u.nid_mock || '9900001001';
        u.phone_mock = u.phone_dummy || u.phone_mock || '01700-001001';
        u.office_name = u.office_bn || u.office_name || '';
      }
      return r.data;
    }),
  register: (payload: any) =>
    api.post('/auth/register', payload).then((r) => {
      const u = r.data.user;
      if (u) {
        u.nid_mock = u.nid || u.nid_mock || '9900001001';
        u.phone_mock = u.phone_dummy || u.phone_mock || '01700-001001';
        u.office_name = u.office_bn || u.office_name || '';
      }
      return r.data;
    }),
  getMe: () => api.get('/auth/me').then((r) => r.data),
  updateProfile: (payload: any) => api.put('/auth/profile', payload).then((r) => r.data),
  switchDemoRole: (role: string) =>
    api.post('/auth/switch-demo-role', { role }).then((r) => {
      const u = r.data.user;
      if (u) {
        u.nid_mock = u.nid || u.nid_mock || '9900001001';
        u.phone_mock = u.phone_dummy || u.phone_mock || '01700-001001';
        u.office_name = u.office_bn || u.office_name || '';
      }
      return r.data;
    }),
  getPermissions: () => api.get('/auth/permissions').then((r) => r.data),

  // Users CRUD (Admin)
  listUsers: () =>
    api.get('/admin/users').then((r) => {
      const items = r.data.items || r.data || [];
      return items.map((u: any) => ({
        ...u,
        nid_mock: u.nid || u.nid_mock || '',
        phone_mock: u.phone_dummy || u.phone_mock || '',
        office_name: u.office_bn || u.office_name || '',
      }));
    }),
  createUser: (payload: any) => api.post('/admin/users', payload).then((r) => r.data),
  updateUser: (id: number, payload: any) => api.put(`/admin/users/${id}`, payload).then((r) => r.data),
  deleteUser: (id: number) => api.delete(`/admin/users/${id}`).then((r) => r.data),

  // Site Settings & Enterprise Analytics
  getSettings: () => api.get('/settings').then((r) => r.data),
  updateSettings: (settings: Record<string, string>) =>
    api.put('/settings', { settings }).then((r) => r.data),
  getStatsSummary: () => api.get('/analytics/summary').then((r) => r.data),

  // Citizen Vault, Sale Lock & Disputes
  getMyVault: (nid?: string) =>
    api.get('/citizen/my-properties', { params: nid ? { nid } : {} }).then((r) => {
      const data = r.data;
      return {
        found: true,
        person: {
          ...data.person,
          nid_mock: data.person?.nid || data.person?.nid_mock || '9900001001',
        },
        owned_plots: (data.owned_plots || []).map((op: any) => ({
          ...op,
          share_area_decimal: Number(op.area_decimal ?? op.share_area_decimal ?? 0),
        })),
        deeds: data.deeds || [],
      };
    }),
  togglePlotSaleLock: (plotId: number, reason_bn?: string) =>
    api.post(`/citizen/plots/${plotId}/toggle-lock`, { reason_bn }).then((r) => r.data),
  listDisputes: (plotId?: number) =>
    api
      .get('/citizen/disputes', { params: plotId ? { plot_id: plotId } : {} })
      .then((r) => r.data.items || r.data || []),
  fileDispute: (payload: {
    plot_id: number;
    complainant_name_bn?: string;
    complainant_nid?: string;
    dispute_type: string;
    description_bn: string;
  }) => api.post('/citizen/disputes', payload).then((r) => r.data),

  // Sub-Registrar Controlling Endpoints
  listRegistrarDeeds: (status?: string) =>
    api
      .get('/registrar/deeds', { params: status ? { status } : {} })
      .then((r) => r.data.items || r.data || []),
  updateRegistrarDeedStatus: (
    deedId: number,
    payload: { status: string; officer_note?: string }
  ) =>
    api
      .post(`/registrar/deeds/${deedId}/status`, {
        status: payload.status === 'REGISTERED' ? 'PENDING_MUTATION' : payload.status,
        notes_bn: payload.officer_note,
      })
      .then((r) => r.data),
  calculateFees: (declared_value_bdt: number, deed_type = 'SALE') =>
    api
      .get('/registrar/calculate-fees', {
        params: { price_bdt: declared_value_bdt, deed_type },
      })
      .then((r) => {
        const d = r.data;
        if (d.breakdown) return d;
        return {
          declared_value_bdt: d.price_bdt,
          deed_type: d.deed_type,
          breakdown: {
            stamp_duty_bdt: d.stamp_duty_bdt,
            registration_fee_bdt: d.registration_fee_bdt,
            local_govt_tax_bdt: d.local_govt_tax_bdt,
            ait_gain_tax_bdt: d.ait_source_tax_bdt,
          },
          total_payable_bdt: d.total_govt_fees_bdt,
        };
      }),

  // AC Land Controlling Endpoints
  listFlaggedKhatians: () =>
    api.get('/acland/flagged-khatians').then((r) => {
      const items = r.data.items || r.data || [];
      return items.map((k: any) => ({
        ...k,
        reconcile_status: k.status,
        anomaly_note_bn: k.remarks_bn || '',
        anomaly_note_en: k.remarks_en || '',
      }));
    }),
  reconcileKhatian: (
    plotId: number,
    payload: { resolution_note_bn: string; updated_area_decimal?: number }
  ) =>
    api
      .post(`/acland/khatians/${plotId}/reconcile`, {
        order_notes_bn: payload.resolution_note_bn,
        reconciled_area_decimal: payload.updated_area_decimal,
      })
      .then((r) => r.data),
  resolveDispute: (
    disputeId: number,
    payload: { status: string; resolution_note_bn: string }
  ) =>
    api
      .post(`/acland/disputes/${disputeId}/resolve`, {
        status: payload.status === 'RESOLVED_DISMISSED' ? 'RESOLVED' : payload.status,
        resolution_notes_bn: payload.resolution_note_bn,
      })
      .then((r) => r.data),

  // Bank Officer Controlling Endpoints
  getMortgageNoc: (lienId: number) =>
    api.get(`/mortgages/${lienId}/noc`).then((r) => {
      const d = r.data;
      return {
        noc_no: d.noc_no,
        issued_at: d.released_at,
        noc_hash: d.noc_hash,
        signature: d.ed25519_signature || d.signature,
        qr_data_uri: d.qr_svg_data_uri || d.qr_data_uri,
        lien: {
          bank_name_bn: d.bank_name_bn,
          bank_name_en: d.bank_name_en,
          branch_name: d.branch_bn,
          status: d.status,
          borrower_name_bn: d.borrower_name_bn,
          borrower_nid: d.borrower_nid,
          mouza_bn: d.mouza_bn,
          dag_no: d.dag_no,
          loan_amount_bdt: d.amount_bdt,
        },
      };
    }),

  // Core Domain Endpoints
  getLocations: () =>
    api.get('/locations').then((r) => r.data.locations || r.data || []),
  getPlots: (mouza_id?: number) =>
    api.get('/locations').then((r) => {
      const plots = (r.data.plots || []).map((p: any) => ({
        ...p,
        mouza_id: Number(p.location_id ?? p.mouza_id ?? 1),
        land_type: p.land_type_bn || p.land_type || 'ভিটা',
      }));
      if (mouza_id) {
        return plots.filter((p: any) => Number(p.mouza_id) === Number(mouza_id));
      }
      return plots;
    }),
  getPersons: () =>
    api.get('/persons').then((r) => {
      const items = r.data.items || r.data || [];
      return items.map((p: any) => ({
        ...p,
        nid_mock: p.nid || p.nid_mock || '',
      }));
    }),
  checkBeforeBuy: async (payload: {
    plot_id: number;
    seller_nid?: string;
    seller_id?: number;
    proposed_area_decimal?: number;
    deed_type?: string;
  }): Promise<RiskReportResponse> => {
    const r = await api.get(`/plots/${payload.plot_id}/check-before-you-buy`, {
      params: {
        requested_area_decimal: payload.proposed_area_decimal,
        seller_id: payload.seller_id,
      },
    });
    return normalizeRiskBundle(r.data);
  },
  verifyDeedByCode: (deedNo: string) =>
    api.get(`/verify/deed/${encodeURIComponent(deedNo)}`).then((r) => {
      const d = r.data;
      if (d.cryptographic_proof) return d;
      const ver = d.verification || {};
      return {
        verified: Boolean(ver.is_valid),
        badge_bn: ver.is_valid
          ? '✔ দলিলের ডিজিটাল স্বাক্ষর ও হ্যাশ চেইন সম্পূর্ণ অক্ষত'
          : '✖ সতর্কতা: এই দলিলের তথ্য পরিবর্তন (Tamper) করা হয়েছে!',
        badge_en: ver.is_valid
          ? '✔ Cryptographic Ed25519 Signature & Hash Chain Verified'
          : '✖ ALERT: Deed Content Was Tampered After Registration!',
        message_bn: (d.reasons_bn || [])[0] || '',
        message_en: (d.reasons_en || [])[0] || '',
        qr_data_uri: d.qr_svg_data_uri,
        deed: {
          ...d.deed,
          mouza_bn: d.location?.mouza_bn || '',
          mouza_en: d.location?.mouza_en || '',
          dag_no: d.plot?.dag_no || '',
          seller_name_bn: d.seller?.name_bn || '',
          seller_nid: d.seller?.nid || '',
          buyer_name_bn: d.buyer?.name_bn || '',
          buyer_nid: d.buyer?.nid || '',
        },
        cryptographic_proof: {
          stored_content_hash: ver.stored_hash,
          recomputed_content_hash: ver.recomputed_hash,
          hash_matches: Boolean(ver.hash_valid),
          prev_hash: ver.prev_hash,
          signature_valid: Boolean(ver.signature_valid),
        },
      };
    }),
  createDeed: (payload: {
    deed_type: string;
    plot_id: number;
    seller_id: number;
    buyer_id: number;
    area_decimal: number;
    share_fraction: string;
    declared_value_bdt: number;
  }) =>
    api
      .post('/registrar/register-deed', {
        deed_type: payload.deed_type,
        plot_id: payload.plot_id,
        seller_id: payload.seller_id,
        buyer_id: payload.buyer_id,
        requested_area_decimal: payload.area_decimal,
        price_bdt: payload.declared_value_bdt,
      })
      .then((r) => {
        const d = r.data;
        return {
          message_bn: d.message_bn,
          message_en: d.message_en,
          qr_data_uri: d.qr_svg_data_uri,
          deed: {
            deed_no: d.deed_no,
            status: d.status === 'PENDING_MUTATION' ? 'REGISTERED' : d.status,
            chain_index: d.chain_index,
            content_hash: d.content_hash,
          },
        };
      }),
  tamperDeedDemo: (_deedNo: string, newArea: number) =>
    api.post('/ledger/tamper/1', { new_area_decimal: newArea }).then((r) => r.data),
  restoreDeedDemo: (_deedNo: string) =>
    Promise.all([api.post('/ledger/restore/1'), api.post('/ledger/restore/5')]).then(
      ([r1]) => r1.data
    ),
  getLedgerState: () =>
    api.get('/ledger/verify').then((r) => {
      const d = r.data;
      const sample = d.chain_sample || [];
      return {
        chain_intact: Boolean(d.is_valid),
        daily_merkle_root: d.merkle_root,
        total_blocks: d.total_deeds,
        verified_count: d.verified_count,
        broken_blocks: sample
          .filter((b: any) => !b.is_valid)
          .map((b: any) => ({
            chain_index: b.chain_index,
            deed_no: b.deed_no,
            stored_hash: b.stored_hash,
            recomputed_hash: b.recomputed_hash,
          })),
        chain_sample: sample,
      };
    }),
  getMutations: () =>
    api.get('/mutations').then((r) => {
      const items = r.data.items || r.data || [];
      return items.map((m: any) => ({
        ...m,
        share_fraction: '1/2',
        decision_note_bn: m.decision_reason_bn || '',
      }));
    }),
  decideMutation: (mutationId: number, status: 'APPROVED' | 'REJECTED', decision_note_bn: string) =>
    api
      .post(`/mutations/${mutationId}/decide`, {
        decision: status,
        reason_bn: decision_note_bn,
      })
      .then((r) => r.data),
  getMortgages: () =>
    api.get('/mortgages').then((r) => {
      const items = r.data.items || r.data || [];
      return items.map((m: any) => ({
        ...m,
        branch_name: m.branch_bn || m.branch_name || 'প্রধান শাখা',
        loan_amount_bdt: Number(m.amount_bdt ?? m.loan_amount_bdt ?? 0),
      }));
    }),
  createMortgage: (payload: {
    plot_id: number;
    borrower_id: number;
    bank_name_bn: string;
    bank_name_en: string;
    branch_name: string;
    loan_amount_bdt: number;
  }) =>
    api
      .post('/mortgages', {
        plot_id: payload.plot_id,
        borrower_id: payload.borrower_id,
        bank_name_bn: payload.bank_name_bn,
        bank_name_en: payload.bank_name_en,
        branch_bn: payload.branch_name,
        requested_loan_bdt: payload.loan_amount_bdt,
        area_mortgaged_decimal: 12.0,
      })
      .then((r) => r.data),
  releaseMortgage: (lienId: number) =>
    api.post(`/mortgages/${lienId}/release`).then((r) => r.data),
  getDemoScenarios: () =>
    api.get('/scenarios').then((r) => {
      const items = r.data.items || r.data || [];
      return items.map((sc: any) => ({
        ...sc,
        code: String(sc.scenario_no ?? sc.code ?? sc.id),
        badge_type:
          sc.expected_verdict === 'SAFE'
            ? 'SAFE'
            : sc.expected_verdict === 'REVIEW'
            ? 'WARNING'
            : 'HIGH_RISK',
      }));
    }),
  runDemoScenario: async (code: string) => {
    const scenarios = await BhumiApi.getDemoScenarios();
    const match =
      scenarios.find((s: any) => String(s.code) === String(code)) || scenarios[0];
    const report = await BhumiApi.checkBeforeBuy({
      plot_id: Number(match.plot_id),
      seller_id: Number(match.seller_id),
      proposed_area_decimal: Number(match.requested_area_decimal),
    });
    return { scenario: match, report };
  },
  getAuditLogs: () =>
    api.get('/audit-log').then((r) => {
      const items = r.data.items || r.data || [];
      return items.map((l: any) => ({
        id: l.id,
        action: l.action,
        actor_role: `${l.actor_username} (${l.actor_role})`,
        target_ref: `${l.entity_type}#${l.entity_id}`,
        detail: l.details?.note_bn || JSON.stringify(l.details || {}),
        entry_hash: l.entry_hash,
        created_at: l.created_at,
      }));
    }),
  getOcrSample: () =>
    api.post('/ocr/khatian-demo', { preset_id: 'bs_4101' }).then((r) => {
      const d = r.data;
      if (d.extracted_fields && !Array.isArray(d.extracted_fields)) return d;
      const fieldsObj: Record<string, any> = {};
      (d.extracted_fields || []).forEach((f: any) => {
        fieldsObj[f.label_en || f.field_key] = {
          value: f.extracted_value_bn,
          confidence: f.confidence,
          low_confidence: f.needs_human_confirmation,
        };
      });
      return { extracted_fields: fieldsObj };
    }),
};
