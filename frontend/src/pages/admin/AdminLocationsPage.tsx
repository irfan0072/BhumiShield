import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Building2,
  Layers,
  Compass,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  Search,
  ChevronRight,
  ChevronDown,
  FolderTree,
  Shield,
  CheckCircle2,
  AlertTriangle,
  X,
  Lock,
  ExternalLink,
  Tag,
  Landmark,
} from 'lucide-react';
import { useAppUI } from '@/i18n';
import {
  BhumiApi,
  HierarchyDivisionItem,
  HierarchyDistrictItem,
  HierarchyUpazilaItem,
  HierarchyMouzaItem,
} from '@/api/client';
import { toBanglaDigits } from '@/theme/tokens';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const AdminLocationsPage: React.FC<{
  onNavigateSubPage?: (subPage: string) => void;
}> = ({ onNavigateSubPage }) => {
  const { lang, t } = useAppUI();

  // Primary Data State
  const [tree, setTree] = useState<HierarchyDivisionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTier, setActiveTier] = useState<'mouzas' | 'upazilas' | 'districts' | 'divisions' | 'tree'>('mouzas');

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [upazilaFilter, setUpazilaFilter] = useState('');

  // Notification State
  const [notice, setNotice] = useState<{ msg: string; err?: boolean } | null>(null);

  // Dialog States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);

  // Active Item for Edit / Delete
  const [editingMouza, setEditingMouza] = useState<any | null>(null);
  const [deletingMouza, setDeletingMouza] = useState<any | null>(null);

  // Form State for Add / Edit Mouza
  const [formDivisionBn, setFormDivisionBn] = useState('');
  const [formDivisionEn, setFormDivisionEn] = useState('');
  const [formDistrictBn, setFormDistrictBn] = useState('');
  const [formDistrictEn, setFormDistrictEn] = useState('');
  const [formUpazilaBn, setFormUpazilaBn] = useState('');
  const [formUpazilaEn, setFormUpazilaEn] = useState('');
  const [formMouzaBn, setFormMouzaBn] = useState('');
  const [formMouzaEn, setFormMouzaEn] = useState('');
  const [formJlNo, setFormJlNo] = useState('');
  const [formLat, setFormLat] = useState('23.8580');
  const [formLng, setFormLng] = useState('90.3180');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Form State for Rename Tier
  const [renameTierType, setRenameTierType] = useState<'division' | 'district' | 'upazila'>('district');
  const [renameOldNameBn, setRenameOldNameBn] = useState('');
  const [renameNewNameBn, setRenameNewNameBn] = useState('');
  const [renameNewNameEn, setRenameNewNameEn] = useState('');

  // Tree Node Expansion in Tree Explorer
  const [expandedDivisions, setExpandedDivisions] = useState<Record<string, boolean>>({});
  const [expandedDistricts, setExpandedDistricts] = useState<Record<string, boolean>>({});
  const [expandedUpazilas, setExpandedUpazilas] = useState<Record<string, boolean>>({});

  // 1. Fetch Hierarchy Tree
  const fetchTree = async () => {
    try {
      setLoading(true);
      const res = await BhumiApi.getHierarchyTree();
      const list = Array.isArray(res) ? res : [];
      setTree(list);

      // Auto-expand first division
      if (list.length > 0 && Object.keys(expandedDivisions).length === 0) {
        setExpandedDivisions({ [list[0].division_bn]: true });
      }
    } catch (err: any) {
      console.error('Failed to fetch hierarchy tree:', err);
      setNotice({
        msg: t('ভৌগোলিক অবস্থান তালিকা লোড করতে সমস্যা হয়েছে।', 'Failed to load location hierarchy.'),
        err: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTree();
  }, []);

  // 2. Flattened Data Structures
  const allDivisions = useMemo(() => {
    return tree.map((div) => {
      let upazilasCount = 0;
      let mouzasCount = 0;
      let plotsCount = 0;

      (div.districts || []).forEach((dist) => {
        upazilasCount += (dist.upazilas || []).length;
        (dist.upazilas || []).forEach((upz) => {
          mouzasCount += (upz.mouzas || []).length;
          (upz.mouzas || []).forEach((m) => {
            plotsCount += Number(m.plots_count || 0);
          });
        });
      });

      return {
        division_bn: div.division_bn,
        division_en: div.division_en,
        districts_count: (div.districts || []).length,
        upazilas_count: upazilasCount,
        mouzas_count: mouzasCount,
        plots_count: plotsCount,
      };
    });
  }, [tree]);

  const allDistricts = useMemo(() => {
    const list: any[] = [];
    tree.forEach((div) => {
      (div.districts || []).forEach((dist) => {
        let mouzasCount = 0;
        let plotsCount = 0;
        (dist.upazilas || []).forEach((upz) => {
          mouzasCount += (upz.mouzas || []).length;
          (upz.mouzas || []).forEach((m) => {
            plotsCount += Number(m.plots_count || 0);
          });
        });

        list.push({
          division_bn: div.division_bn,
          division_en: div.division_en,
          district_bn: dist.district_bn,
          district_en: dist.district_en,
          upazilas_count: (dist.upazilas || []).length,
          mouzas_count: mouzasCount,
          plots_count: plotsCount,
        });
      });
    });
    return list;
  }, [tree]);

  const allUpazilas = useMemo(() => {
    const list: any[] = [];
    tree.forEach((div) => {
      (div.districts || []).forEach((dist) => {
        (dist.upazilas || []).forEach((upz) => {
          let plotsCount = 0;
          (upz.mouzas || []).forEach((m) => {
            plotsCount += Number(m.plots_count || 0);
          });

          list.push({
            division_bn: div.division_bn,
            division_en: div.division_en,
            district_bn: dist.district_bn,
            district_en: dist.district_en,
            upazila_bn: upz.upazila_bn,
            upazila_en: upz.upazila_en,
            mouzas_count: (upz.mouzas || []).length,
            plots_count: plotsCount,
          });
        });
      });
    });
    return list;
  }, [tree]);

  const allMouzas = useMemo(() => {
    const list: any[] = [];
    tree.forEach((div) => {
      (div.districts || []).forEach((dist) => {
        (dist.upazilas || []).forEach((upz) => {
          (upz.mouzas || []).forEach((m) => {
            list.push({
              id: m.id,
              mouza_bn: m.mouza_bn,
              mouza_en: m.mouza_en,
              jl_no: m.jl_no,
              latitude: m.latitude,
              longitude: m.longitude,
              plots_count: Number(m.plots_count || 0),
              upazila_bn: upz.upazila_bn,
              upazila_en: upz.upazila_en,
              district_bn: dist.district_bn,
              district_en: dist.district_en,
              division_bn: div.division_bn,
              division_en: div.division_en,
            });
          });
        });
      });
    });
    return list;
  }, [tree]);

  const totalPlotsCount = useMemo(() => {
    return allMouzas.reduce((sum, m) => sum + (Number(m.plots_count) || 0), 0);
  }, [allMouzas]);

  // Available options for Cascading Filters
  const availableDistrictsForFilter = useMemo(() => {
    if (!divisionFilter) return allDistricts;
    return allDistricts.filter((d) => d.division_bn === divisionFilter);
  }, [allDistricts, divisionFilter]);

  const availableUpazilasForFilter = useMemo(() => {
    let list = allUpazilas;
    if (divisionFilter) list = list.filter((u) => u.division_bn === divisionFilter);
    if (districtFilter) list = list.filter((u) => u.district_bn === districtFilter);
    return list;
  }, [allUpazilas, divisionFilter, districtFilter]);

  // Filtered Mouzas for Table View
  const filteredMouzas = useMemo(() => {
    return allMouzas.filter((m) => {
      const matchDiv = divisionFilter ? m.division_bn === divisionFilter : true;
      const matchDist = districtFilter ? m.district_bn === districtFilter : true;
      const matchUpz = upazilaFilter ? m.upazila_bn === upazilaFilter : true;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch = q
        ? m.mouza_bn.toLowerCase().includes(q) ||
          (m.mouza_en || '').toLowerCase().includes(q) ||
          String(m.jl_no).includes(q) ||
          m.upazila_bn.toLowerCase().includes(q) ||
          m.district_bn.toLowerCase().includes(q)
        : true;
      return matchDiv && matchDist && matchUpz && matchSearch;
    });
  }, [allMouzas, divisionFilter, districtFilter, upazilaFilter, searchQuery]);

  // Filtered Upazilas for Table View
  const filteredUpazilas = useMemo(() => {
    return allUpazilas.filter((u) => {
      const matchDiv = divisionFilter ? u.division_bn === divisionFilter : true;
      const matchDist = districtFilter ? u.district_bn === districtFilter : true;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch = q
        ? u.upazila_bn.toLowerCase().includes(q) ||
          (u.upazila_en || '').toLowerCase().includes(q) ||
          u.district_bn.toLowerCase().includes(q)
        : true;
      return matchDiv && matchDist && matchSearch;
    });
  }, [allUpazilas, divisionFilter, districtFilter, searchQuery]);

  // Filtered Districts for Table View
  const filteredDistricts = useMemo(() => {
    return allDistricts.filter((d) => {
      const matchDiv = divisionFilter ? d.division_bn === divisionFilter : true;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch = q
        ? d.district_bn.toLowerCase().includes(q) ||
          (d.district_en || '').toLowerCase().includes(q)
        : true;
      return matchDiv && matchSearch;
    });
  }, [allDistricts, divisionFilter, searchQuery]);

  // Filtered Divisions for Table View
  const filteredDivisions = useMemo(() => {
    return allDivisions.filter((div) => {
      const q = searchQuery.trim().toLowerCase();
      return q
        ? div.division_bn.toLowerCase().includes(q) ||
            (div.division_en || '').toLowerCase().includes(q)
        : true;
    });
  }, [allDivisions, searchQuery]);

  // Handlers for Add Mouza
  const handleOpenAddMouza = () => {
    setFormDivisionBn(divisionFilter || allDivisions[0]?.division_bn || 'ঢাকা');
    setFormDivisionEn(allDivisions[0]?.division_en || 'Dhaka');
    setFormDistrictBn(districtFilter || allDistricts[0]?.district_bn || 'ঢাকা');
    setFormDistrictEn(allDistricts[0]?.district_en || 'Dhaka');
    setFormUpazilaBn(upazilaFilter || allUpazilas[0]?.upazila_bn || 'সাভার');
    setFormUpazilaEn(allUpazilas[0]?.upazila_en || 'Savar');
    setFormMouzaBn('');
    setFormMouzaEn('');
    setFormJlNo('');
    setFormLat('23.8580');
    setFormLng('90.3180');
    setShowAddModal(true);
  };

  const handleSaveAddMouza = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMouzaBn.trim() || !formJlNo.trim()) {
      setNotice({ msg: t('মৌজার নাম ও জে.এল. নম্বর অবশ্যই পূরণ করতে হবে।', 'Mouza name and JL No are required.'), err: true });
      return;
    }

    try {
      setFormSubmitting(true);
      await BhumiApi.createHierarchyMouza({
        division_bn: formDivisionBn,
        division_en: formDivisionEn || formDivisionBn,
        district_bn: formDistrictBn,
        district_en: formDistrictEn || formDistrictBn,
        upazila_bn: formUpazilaBn,
        upazila_en: formUpazilaEn || formUpazilaBn,
        mouza_bn: formMouzaBn,
        mouza_en: formMouzaEn || formMouzaBn,
        jl_no: formJlNo,
        latitude: parseFloat(formLat) || 23.8580,
        longitude: parseFloat(formLng) || 90.3180,
      });

      setShowAddModal(false);
      setNotice({
        msg: t(`নতুন মৌজা '${formMouzaBn}' (জে.এল. ${toBanglaDigits(formJlNo)}) সফলভাবে যোগ করা হয়েছে।`, `Mouza '${formMouzaBn}' added successfully.`),
      });
      fetchTree();
    } catch (err: any) {
      setNotice({
        msg: err?.response?.data?.message_bn || t('মৌজা যোগ করতে সমস্যা হয়েছে।', 'Failed to add mouza.'),
        err: true,
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handlers for Edit Mouza
  const handleOpenEditMouza = (mouza: any) => {
    setEditingMouza(mouza);
    setFormDivisionBn(mouza.division_bn);
    setFormDivisionEn(mouza.division_en || '');
    setFormDistrictBn(mouza.district_bn);
    setFormDistrictEn(mouza.district_en || '');
    setFormUpazilaBn(mouza.upazila_bn);
    setFormUpazilaEn(mouza.upazila_en || '');
    setFormMouzaBn(mouza.mouza_bn);
    setFormMouzaEn(mouza.mouza_en || '');
    setFormJlNo(mouza.jl_no);
    setFormLat(String(mouza.latitude || '23.8580'));
    setFormLng(String(mouza.longitude || '90.3180'));
    setShowEditModal(true);
  };

  const handleSaveEditMouza = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMouza) return;

    try {
      setFormSubmitting(true);
      await BhumiApi.updateHierarchyMouza(editingMouza.id, {
        division_bn: formDivisionBn,
        division_en: formDivisionEn || formDivisionBn,
        district_bn: formDistrictBn,
        district_en: formDistrictEn || formDistrictBn,
        upazila_bn: formUpazilaBn,
        upazila_en: formUpazilaEn || formUpazilaBn,
        mouza_bn: formMouzaBn,
        mouza_en: formMouzaEn || formMouzaBn,
        jl_no: formJlNo,
        latitude: parseFloat(formLat) || 23.8580,
        longitude: parseFloat(formLng) || 90.3180,
      });

      setShowEditModal(false);
      setNotice({
        msg: t(`মৌজা '${formMouzaBn}' তথ্য সফলভাবে আপডেট করা হয়েছে।`, `Mouza '${formMouzaBn}' updated successfully.`),
      });
      fetchTree();
    } catch (err: any) {
      setNotice({
        msg: err?.response?.data?.message_bn || t('তথ্য আপডেট করতে সমস্যা হয়েছে।', 'Failed to update mouza.'),
        err: true,
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handlers for Delete Mouza
  const handleOpenDeleteMouza = (mouza: any) => {
    setDeletingMouza(mouza);
    setShowDeleteModal(true);
  };

  const handleConfirmDeleteMouza = async () => {
    if (!deletingMouza) return;
    try {
      setFormSubmitting(true);
      await BhumiApi.deleteHierarchyMouza(deletingMouza.id);
      setShowDeleteModal(false);
      setNotice({
        msg: t(`মৌজা '${deletingMouza.mouza_bn}' সফলভাবে মুছে ফেলা হয়েছে।`, `Mouza '${deletingMouza.mouza_bn}' deleted.`),
      });
      fetchTree();
    } catch (err: any) {
      setNotice({
        msg: err?.response?.data?.message_bn || t('মৌজা অপসারণ করা সম্ভব হয়নি। এতে প্লট সংযুক্ত থাকতে পারে।', 'Cannot delete mouza.'),
        err: true,
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handlers for Tier Rename
  const handleOpenRename = (tier: 'division' | 'district' | 'upazila', currentBn: string, currentEn?: string) => {
    setRenameTierType(tier);
    setRenameOldNameBn(currentBn);
    setRenameNewNameBn(currentBn);
    setRenameNewNameEn(currentEn || currentBn);
    setShowRenameModal(true);
  };

  const handleSaveRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameNewNameBn.trim()) return;

    try {
      setFormSubmitting(true);
      await BhumiApi.renameHierarchyTier({
        tier: renameTierType.toUpperCase() as any,
        old_bn: renameOldNameBn,
        new_bn: renameNewNameBn,
        new_en: renameNewNameEn || renameNewNameBn,
      });

      setShowRenameModal(false);
      setNotice({
        msg: t(`'${renameOldNameBn}' সফলভাবে '${renameNewNameBn}' নামে পরিবর্তন করা হয়েছে।`, `Tier renamed to '${renameNewNameBn}'.`),
      });
      fetchTree();
    } catch (err: any) {
      setNotice({
        msg: err?.response?.data?.message_bn || t('নাম পরিবর্তন করতে সমস্যা হয়েছে।', 'Failed to rename tier.'),
        err: true,
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-2.5 sm:p-3.5 gap-2 min-h-0 overflow-hidden bg-background text-foreground">
      {/* Notification Banner */}
      {notice && (
        <Alert
          className={`shrink-0 py-1.5 px-3 border ${
            notice.err
              ? 'bg-rose-50/90 border-rose-200 text-rose-900'
              : 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-xs font-semibold">
              {notice.err ? <AlertTriangle className="size-3.5 text-rose-600 shrink-0" /> : <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />}
              <AlertDescription className="text-xs leading-none">{notice.msg}</AlertDescription>
            </div>
            <button
              onClick={() => setNotice(null)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer ml-3 font-bold text-xs"
            >
              ✕
            </button>
          </div>
        </Alert>
      )}

      {/* 1. UNIFIED COMPACT CONTROLS: TABS & ACTION BUTTONS + FILTER TOOLBAR */}
      <Card className="shrink-0 border border-border/80 shadow-2xs p-2 sm:p-2.5 space-y-2">
        {/* Tier Switcher & Action Buttons Row (Right section of the tabs, before search/filters) */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => setActiveTier('mouzas')}
              className={`h-7 px-2.5 rounded-md text-xs font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                activeTier === 'mouzas'
                  ? 'bg-white dark:bg-card text-[#006A4E] shadow-2xs font-black'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Compass className="size-3 text-[#006A4E]" />
              <span>{t('মৌজা স্তর', 'Mouzas')}</span>
              <span className="text-[10px] bg-emerald-100/80 text-emerald-800 px-1 rounded-full font-mono font-bold ml-0.5">
                {toBanglaDigits(filteredMouzas.length, lang)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTier('upazilas')}
              className={`h-7 px-2.5 rounded-md text-xs font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                activeTier === 'upazilas'
                  ? 'bg-white dark:bg-card text-blue-600 shadow-2xs font-black'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Building2 className="size-3 text-blue-600" />
              <span>{t('উপজেলা স্তর', 'Upazilas')}</span>
              <span className="text-[10px] bg-blue-100/80 text-blue-800 px-1 rounded-full font-mono font-bold ml-0.5">
                {toBanglaDigits(filteredUpazilas.length, lang)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTier('districts')}
              className={`h-7 px-2.5 rounded-md text-xs font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                activeTier === 'districts'
                  ? 'bg-white dark:bg-card text-amber-600 shadow-2xs font-black'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Building2 className="size-3 text-amber-600" />
              <span>{t('জেলা স্তর', 'Districts')}</span>
              <span className="text-[10px] bg-amber-100/80 text-amber-800 px-1 rounded-full font-mono font-bold ml-0.5">
                {toBanglaDigits(filteredDistricts.length, lang)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTier('divisions')}
              className={`h-7 px-2.5 rounded-md text-xs font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                activeTier === 'divisions'
                  ? 'bg-white dark:bg-card text-emerald-700 shadow-2xs font-black'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Landmark className="size-3 text-emerald-700" />
              <span>{t('বিভাগ স্তর', 'Divisions')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTier('tree')}
              className={`h-7 px-2.5 rounded-md text-xs font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                activeTier === 'tree'
                  ? 'bg-white dark:bg-card text-purple-600 shadow-2xs font-black'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FolderTree className="size-3 text-purple-600" />
              <span>{t('হায়ারার্কি ট্রি', 'Tree')}</span>
            </button>
          </div>

          {/* Action Buttons & Filter Reset moved directly to the right section of the tabs */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {(divisionFilter || districtFilter || upazilaFilter || searchQuery) && (
              <button
                onClick={() => {
                  setDivisionFilter('');
                  setDistrictFilter('');
                  setUpazilaFilter('');
                  setSearchQuery('');
                }}
                className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer shrink-0 mr-1 whitespace-nowrap"
              >
                ✕ {t('রিসেট', 'Reset')}
              </button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={fetchTree}
              disabled={loading}
              className="h-7 px-2.5 text-xs font-semibold gap-1 cursor-pointer shrink-0"
            >
              <RotateCcw className={`size-3 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{t('রিফ্রেশ', 'Refresh')}</span>
            </Button>

            <Button
              size="sm"
              onClick={handleOpenAddMouza}
              className="h-7 px-3 text-xs font-bold gap-1 bg-[#006A4E] hover:bg-[#00553e] text-white shadow-2xs cursor-pointer shrink-0"
            >
              <Plus className="size-3.5" />
              <span>{t('নতুন মৌজা', 'Add Mouza')}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenRename('district', allDistricts[0]?.district_bn || 'ঢাকা')}
              className="h-7 px-2 text-xs font-semibold gap-1 cursor-pointer shrink-0"
              title={t('টায়ার পুনঃনামকরণ', 'Rename Tier')}
            >
              <Tag className="size-3 text-slate-600" />
              <span className="hidden md:inline">{t('পুনঃনামকরণ', 'Rename')}</span>
            </Button>
          </div>
        </div>

        {/* Compact Single-Row Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
          {/* Division Select */}
          <Select
            value={divisionFilter || 'ALL'}
            onValueChange={(val) => {
              setDivisionFilter(val === 'ALL' ? '' : val);
              setDistrictFilter('');
              setUpazilaFilter('');
            }}
          >
            <SelectTrigger className="h-7.5 text-xs font-medium bg-background border-border">
              <SelectValue placeholder={t('সকল বিভাগ', 'All Divisions')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('সকল বিভাগ', 'All Divisions')}</SelectItem>
              {allDivisions.map((div) => (
                <SelectItem key={div.division_bn} value={div.division_bn}>
                  {div.division_bn} ({div.division_en})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* District Select */}
          <Select
            value={districtFilter || 'ALL'}
            onValueChange={(val) => {
              setDistrictFilter(val === 'ALL' ? '' : val);
              setUpazilaFilter('');
            }}
          >
            <SelectTrigger className="h-7.5 text-xs font-medium bg-background border-border">
              <SelectValue placeholder={t('সকল জেলা', 'All Districts')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('সকল জেলা', 'All Districts')}</SelectItem>
              {availableDistrictsForFilter.map((dist) => (
                <SelectItem key={`${dist.division_bn}-${dist.district_bn}`} value={dist.district_bn}>
                  {dist.district_bn} ({dist.district_en})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Upazila Select */}
          <Select
            value={upazilaFilter || 'ALL'}
            onValueChange={(val) => setUpazilaFilter(val === 'ALL' ? '' : val)}
          >
            <SelectTrigger className="h-7.5 text-xs font-medium bg-background border-border">
              <SelectValue placeholder={t('সকল উপজেলা', 'All Upazilas')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('সকল উপজেলা', 'All Upazilas')}</SelectItem>
              {availableUpazilasForFilter.map((upz) => (
                <SelectItem key={`${upz.district_bn}-${upz.upazila_bn}`} value={upz.upazila_bn}>
                  {upz.upazila_bn} ({upz.upazila_en})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('মৌজা বা জেএল খুঁজুন...', 'Search Mouza / JL...')}
              className="h-7.5 pl-7.5 text-xs bg-background border-border font-medium"
            />
          </div>
        </div>
      </Card>

      {/* 3. SCROLL-LOCKED TABLE AREA (Only the list inside scrolls!) */}
      <Card className="flex-1 min-h-0 flex flex-col border border-border/80 shadow-xs overflow-hidden">
        {/* TIER 1: MOUZAS TABLE */}
        {activeTier === 'mouzas' && (
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur-xs border-b">
                <TableRow className="text-[11px] hover:bg-transparent">
                  <TableHead className="w-10 text-center py-2">#</TableHead>
                  <TableHead className="py-2">{t('মৌজার নাম (বাংলা ও ইংরেজি)', 'Mouza Name')}</TableHead>
                  <TableHead className="text-center py-2">{t('জে.এল. নং', 'J.L. No')}</TableHead>
                  <TableHead className="py-2">{t('উপজেলা / থানা', 'Upazila')}</TableHead>
                  <TableHead className="py-2">{t('জেলা ও বিভাগ', 'District & Division')}</TableHead>
                  <TableHead className="text-center py-2">{t('সংযুক্ত প্লট', 'Attached Plots')}</TableHead>
                  <TableHead className="py-2">{t('স্থানাঙ্ক (GPS)', 'Coordinates')}</TableHead>
                  <TableHead className="text-right pr-4 py-2">{t('অ্যাকশন', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMouzas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-xs">
                      {t('কোনো মৌজা খুঁজে পাওয়া যায়নি। ফিল্টার পরিবর্তন করুন।', 'No mouzas match your search criteria.')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMouzas.map((m, idx) => (
                    <TableRow key={m.id} className="hover:bg-muted/30 text-xs transition">
                      <TableCell className="text-center font-mono text-muted-foreground py-2">
                        {toBanglaDigits(idx + 1, lang)}
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="font-bold text-foreground flex items-center gap-1.5">
                          <Compass className="size-3 text-[#006A4E] shrink-0" />
                          <span>{m.mouza_bn}</span>
                        </div>
                        {m.mouza_en && (
                          <div className="text-[10px] text-muted-foreground font-mono pl-4.5 leading-tight">
                            {m.mouza_en}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center py-2">
                        <Badge variant="outline" className="font-mono font-bold bg-slate-50 text-slate-800 border-slate-300 text-[10px] px-1.5 py-0 h-5">
                          {toBanglaDigits(m.jl_no, lang)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-foreground py-2">
                        {m.upazila_bn}
                        {m.upazila_en && <span className="text-[10px] text-muted-foreground block font-mono leading-tight">{m.upazila_en}</span>}
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="font-semibold text-foreground leading-tight">{m.district_bn}</div>
                        <div className="text-[10px] text-muted-foreground">{m.division_bn}</div>
                      </TableCell>
                      <TableCell className="text-center py-2">
                        {m.plots_count > 0 ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onNavigateSubPage && onNavigateSubPage('khatians')}
                            className="h-5.5 px-2 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-full cursor-pointer"
                            title={t('প্লট তালিকায় দেখুন', 'View in Khatians & Plots')}
                          >
                            <Lock className="size-2.5 mr-1 text-emerald-700" />
                            <span>{toBanglaDigits(m.plots_count, lang)} {t('প্লট', 'Plots')}</span>
                            <ExternalLink className="size-2 ml-1" />
                          </Button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {t('০ প্লট', '0 Plots')}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground py-2">
                        {m.latitude && m.longitude ? (
                          <span>{m.latitude.toFixed(4)}, {m.longitude.toFixed(4)}</span>
                        ) : (
                          <span>—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-4 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditMouza(m)}
                            className="h-6.5 w-6.5 p-0 cursor-pointer"
                            title={t('সম্পাদনা', 'Edit Mouza')}
                          >
                            <Edit2 className="size-3 text-slate-700" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDeleteMouza(m)}
                            className={`h-6.5 w-6.5 p-0 cursor-pointer ${
                              m.plots_count > 0
                                ? 'text-slate-300 hover:text-slate-400'
                                : 'text-rose-600 hover:text-rose-700 hover:bg-rose-50'
                            }`}
                            title={
                              m.plots_count > 0
                                ? t('সংযুক্ত প্লট থাকায় ডিলিট সুরক্ষিত', 'Protected: Has attached plots')
                                : t('মৌজা অপসারণ', 'Delete Mouza')
                            }
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* TIER 2: UPAZILAS TABLE */}
        {activeTier === 'upazilas' && (
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur-xs border-b">
                <TableRow className="text-[11px] hover:bg-transparent">
                  <TableHead className="w-10 text-center py-2">#</TableHead>
                  <TableHead className="py-2">{t('উপজেলা / থানা নাম', 'Upazila Name')}</TableHead>
                  <TableHead className="py-2">{t('সংশ্লিষ্ট জেলা', 'District')}</TableHead>
                  <TableHead className="py-2">{t('বিভাগ', 'Division')}</TableHead>
                  <TableHead className="text-center py-2">{t('অধীনস্থ মৌজা সংখ্যা', 'Subordinate Mouzas')}</TableHead>
                  <TableHead className="text-center py-2">{t('সংযুক্ত প্লট সংখ্যা', 'Attached Plots')}</TableHead>
                  <TableHead className="text-right pr-4 py-2">{t('অ্যাকশন', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUpazilas.map((u, idx) => (
                  <TableRow key={`${u.district_bn}-${u.upazila_bn}`} className="hover:bg-muted/30 text-xs transition">
                    <TableCell className="text-center font-mono text-muted-foreground py-2">
                      {toBanglaDigits(idx + 1, lang)}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="font-bold text-foreground flex items-center gap-1.5">
                        <Building2 className="size-3 text-amber-600 shrink-0" />
                        <span>{u.upazila_bn}</span>
                      </div>
                      {u.upazila_en && (
                        <div className="text-[10px] text-muted-foreground font-mono pl-4.5 leading-tight">
                          {u.upazila_en}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground py-2">{u.district_bn}</TableCell>
                    <TableCell className="text-muted-foreground py-2">{u.division_bn}</TableCell>
                    <TableCell className="text-center py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDivisionFilter(u.division_bn);
                          setDistrictFilter(u.district_bn);
                          setUpazilaFilter(u.upazila_bn);
                          setActiveTier('mouzas');
                        }}
                        className="h-5.5 px-2 text-[10px] font-bold text-purple-800 bg-purple-50 border border-purple-200 rounded-full hover:bg-purple-100 cursor-pointer"
                      >
                        {toBanglaDigits(u.mouzas_count, lang)} {t('টি মৌজা', 'Mouzas')}
                        <ChevronRight className="size-2.5 ml-0.5" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-center font-mono font-semibold py-2">
                      {toBanglaDigits(u.plots_count, lang)}
                    </TableCell>
                    <TableCell className="text-right pr-4 py-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenRename('upazila', u.upazila_bn, u.upazila_en)}
                        className="h-6.5 text-[11px] font-semibold gap-1 cursor-pointer"
                      >
                        <Tag className="size-2.5" />
                        <span>{t('নাম পরিবর্তন', 'Rename')}</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* TIER 3: DISTRICTS TABLE */}
        {activeTier === 'districts' && (
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur-xs border-b">
                <TableRow className="text-[11px] hover:bg-transparent">
                  <TableHead className="w-10 text-center py-2">#</TableHead>
                  <TableHead className="py-2">{t('জেলা নাম', 'District Name')}</TableHead>
                  <TableHead className="py-2">{t('বিভাগ', 'Division')}</TableHead>
                  <TableHead className="text-center py-2">{t('উপজেলা সংখ্যা', 'Upazilas')}</TableHead>
                  <TableHead className="text-center py-2">{t('মৌজা সংখ্যা', 'Mouzas')}</TableHead>
                  <TableHead className="text-center py-2">{t('মোট প্লট', 'Total Plots')}</TableHead>
                  <TableHead className="text-right pr-4 py-2">{t('অ্যাকশন', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDistricts.map((d, idx) => (
                  <TableRow key={`${d.division_bn}-${d.district_bn}`} className="hover:bg-muted/30 text-xs transition">
                    <TableCell className="text-center font-mono text-muted-foreground py-2">
                      {toBanglaDigits(idx + 1, lang)}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="font-bold text-foreground flex items-center gap-1.5">
                        <Building2 className="size-3 text-blue-600 shrink-0" />
                        <span>{d.district_bn}</span>
                      </div>
                      {d.district_en && (
                        <div className="text-[10px] text-muted-foreground font-mono pl-4.5 leading-tight">
                          {d.district_en}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground py-2">{d.division_bn}</TableCell>
                    <TableCell className="text-center font-mono py-2">
                      {toBanglaDigits(d.upazilas_count, lang)}
                    </TableCell>
                    <TableCell className="text-center py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDivisionFilter(d.division_bn);
                          setDistrictFilter(d.district_bn);
                          setActiveTier('mouzas');
                        }}
                        className="h-5.5 px-2 text-[10px] font-bold text-purple-800 bg-purple-50 border border-purple-200 rounded-full hover:bg-purple-100 cursor-pointer"
                      >
                        {toBanglaDigits(d.mouzas_count, lang)} {t('মৌজা', 'Mouzas')}
                        <ChevronRight className="size-2.5 ml-0.5" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-center font-mono font-semibold py-2">
                      {toBanglaDigits(d.plots_count, lang)}
                    </TableCell>
                    <TableCell className="text-right pr-4 py-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenRename('district', d.district_bn, d.district_en)}
                        className="h-6.5 text-[11px] font-semibold gap-1 cursor-pointer"
                      >
                        <Tag className="size-2.5" />
                        <span>{t('নাম পরিবর্তন', 'Rename')}</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* TIER 4: DIVISIONS TABLE */}
        {activeTier === 'divisions' && (
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur-xs border-b">
                <TableRow className="text-[11px] hover:bg-transparent">
                  <TableHead className="w-10 text-center py-2">#</TableHead>
                  <TableHead className="py-2">{t('প্রশাসনিক বিভাগ', 'Division Name')}</TableHead>
                  <TableHead className="text-center py-2">{t('জেলা সংখ্যা', 'Districts')}</TableHead>
                  <TableHead className="text-center py-2">{t('উপজেলা সংখ্যা', 'Upazilas')}</TableHead>
                  <TableHead className="text-center py-2">{t('মৌজা সংখ্যা', 'Mouzas')}</TableHead>
                  <TableHead className="text-center py-2">{t('মোট প্লট', 'Total Plots')}</TableHead>
                  <TableHead className="text-right pr-4 py-2">{t('অ্যাকশন', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDivisions.map((div, idx) => (
                  <TableRow key={div.division_bn} className="hover:bg-muted/30 text-xs transition">
                    <TableCell className="text-center font-mono text-muted-foreground py-2">
                      {toBanglaDigits(idx + 1, lang)}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="font-bold text-foreground flex items-center gap-1.5">
                        <Landmark className="size-3.5 text-emerald-700 shrink-0" />
                        <span>{div.division_bn}</span>
                      </div>
                      {div.division_en && (
                        <div className="text-[10px] text-muted-foreground font-mono pl-5 leading-tight">
                          {div.division_en}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-mono font-semibold py-2">
                      {toBanglaDigits(div.districts_count, lang)}
                    </TableCell>
                    <TableCell className="text-center font-mono py-2">
                      {toBanglaDigits(div.upazilas_count, lang)}
                    </TableCell>
                    <TableCell className="text-center py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDivisionFilter(div.division_bn);
                          setActiveTier('mouzas');
                        }}
                        className="h-5.5 px-2 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full hover:bg-emerald-100 cursor-pointer"
                      >
                        {toBanglaDigits(div.mouzas_count, lang)} {t('মৌজা', 'Mouzas')}
                        <ChevronRight className="size-2.5 ml-0.5" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-center font-mono font-semibold py-2">
                      {toBanglaDigits(div.plots_count, lang)}
                    </TableCell>
                    <TableCell className="text-right pr-4 py-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenRename('division', div.division_bn, div.division_en)}
                        className="h-6.5 text-[11px] font-semibold gap-1 cursor-pointer"
                      >
                        <Tag className="size-2.5" />
                        <span>{t('নাম পরিবর্তন', 'Rename')}</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* TIER 5: TREE EXPLORER VIEW */}
        {activeTier === 'tree' && (
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 scrollbar-thin">
            <div className="flex items-center justify-between pb-1.5 border-b text-xs text-muted-foreground">
              <span>{t('শাখাসমূহ প্রসারিত করতে ক্লিক করুন:', 'Click to expand or collapse:')}</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const allDiv: Record<string, boolean> = {};
                    const allDist: Record<string, boolean> = {};
                    const allUpz: Record<string, boolean> = {};
                    tree.forEach((div) => {
                      allDiv[div.division_bn] = true;
                      (div.districts || []).forEach((dist) => {
                        allDist[`${div.division_bn}-${dist.district_bn}`] = true;
                        (dist.upazilas || []).forEach((upz) => {
                          allUpz[`${dist.district_bn}-${upz.upazila_bn}`] = true;
                        });
                      });
                    });
                    setExpandedDivisions(allDiv);
                    setExpandedDistricts(allDist);
                    setExpandedUpazilas(allUpz);
                  }}
                  className="h-6 px-2 text-[10px] font-semibold"
                >
                  {t('সব খুলুন', 'Expand All')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setExpandedDivisions({});
                    setExpandedDistricts({});
                    setExpandedUpazilas({});
                  }}
                  className="h-6 px-2 text-[10px] font-semibold"
                >
                  {t('সব বন্ধ', 'Collapse All')}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              {tree.map((div) => {
                const isDivOpen = !!expandedDivisions[div.division_bn];
                return (
                  <div key={div.division_bn} className="border border-border/80 rounded-lg overflow-hidden bg-card text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedDivisions((prev) => ({
                          ...prev,
                          [div.division_bn]: !prev[div.division_bn],
                        }))
                      }
                      className="w-full p-2 bg-muted/40 hover:bg-muted/70 flex items-center justify-between text-left transition cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        {isDivOpen ? <ChevronDown className="size-3.5 text-emerald-700" /> : <ChevronRight className="size-3.5 text-muted-foreground" />}
                        <Landmark className="size-3.5 text-emerald-700" />
                        <span className="font-bold text-foreground">{div.division_bn}</span>
                        {div.division_en && <span className="text-[10px] text-muted-foreground font-mono">({div.division_en})</span>}
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0 h-4">
                        {(div.districts || []).length} {t('জেলা', 'Districts')}
                      </Badge>
                    </button>

                    {isDivOpen && (
                      <div className="p-2 pl-4 space-y-1.5 border-t border-border/60 bg-muted/10">
                        {(div.districts || []).map((dist) => {
                          const distKey = `${div.division_bn}-${dist.district_bn}`;
                          const isDistOpen = !!expandedDistricts[distKey];
                          return (
                            <div key={dist.district_bn} className="border border-border/60 rounded-md overflow-hidden bg-background">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedDistricts((prev) => ({
                                    ...prev,
                                    [distKey]: !prev[distKey],
                                  }))
                                }
                                className="w-full p-1.5 bg-muted/30 hover:bg-muted/60 flex items-center justify-between text-left transition cursor-pointer"
                              >
                                <div className="flex items-center gap-1.5">
                                  {isDistOpen ? <ChevronDown className="size-3 text-blue-600" /> : <ChevronRight className="size-3 text-muted-foreground" />}
                                  <Building2 className="size-3 text-blue-600" />
                                  <span className="font-semibold text-foreground">{dist.district_bn}</span>
                                  {dist.district_en && <span className="text-[10px] text-muted-foreground font-mono">({dist.district_en})</span>}
                                </div>
                                <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-800 border-blue-200 h-4 px-1">
                                  {(dist.upazilas || []).length} {t('উপজেলা', 'Upazilas')}
                                </Badge>
                              </button>

                              {isDistOpen && (
                                <div className="p-1.5 pl-4 space-y-1 border-t border-border/40 bg-muted/5">
                                  {(dist.upazilas || []).map((upz) => {
                                    const upzKey = `${dist.district_bn}-${upz.upazila_bn}`;
                                    const isUpzOpen = !!expandedUpazilas[upzKey];
                                    return (
                                      <div key={upz.upazila_bn} className="border border-border/40 rounded bg-card">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setExpandedUpazilas((prev) => ({
                                              ...prev,
                                              [upzKey]: !prev[upzKey],
                                            }))
                                          }
                                          className="w-full p-1.5 hover:bg-muted/40 flex items-center justify-between text-left transition cursor-pointer"
                                        >
                                          <div className="flex items-center gap-1.5">
                                            {isUpzOpen ? <ChevronDown className="size-3 text-amber-600" /> : <ChevronRight className="size-3 text-muted-foreground" />}
                                            <span className="font-medium text-foreground">{upz.upazila_bn}</span>
                                            {upz.upazila_en && <span className="text-[10px] text-muted-foreground font-mono">({upz.upazila_en})</span>}
                                          </div>
                                          <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-800 border-amber-200 h-4 px-1">
                                            {(upz.mouzas || []).length} {t('মৌজা', 'Mouzas')}
                                          </Badge>
                                        </button>

                                        {isUpzOpen && (
                                          <div className="p-1.5 pl-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 border-t border-border/30 bg-muted/10">
                                            {(upz.mouzas || []).map((m) => (
                                              <div
                                                key={m.id}
                                                className="p-1.5 rounded border border-border/60 bg-background flex items-center justify-between text-[11px]"
                                              >
                                                <div className="flex items-center gap-1 min-w-0">
                                                  <Compass className="size-2.5 text-[#006A4E] shrink-0" />
                                                  <span className="font-bold truncate text-foreground">{m.mouza_bn}</span>
                                                  <span className="text-[9px] text-muted-foreground font-mono">
                                                    (JL {toBanglaDigits(m.jl_no, lang)})
                                                  </span>
                                                </div>
                                                <button
                                                  onClick={() => handleOpenEditMouza(m)}
                                                  className="p-0.5 hover:bg-muted rounded text-slate-600 shrink-0"
                                                >
                                                  <Edit2 className="size-2.5" />
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* 4. MODALS (Add, Edit, Delete, Rename) */}

      {/* ADD MOUZA MODAL */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-[#006A4E]">
              <Plus className="size-5" />
              <span>{t('নতুন মৌজা ও এলাকা নিবন্ধন', 'Register New Mouza')}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t('প্রশাসনিক কাঠামোর অধীনে নতুন মৌজা ও জে.এল. নম্বর যুক্ত করুন।', 'Add mouza under division, district, and upazila.')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAddMouza} className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Division */}
              <div className="space-y-1">
                <Label className="text-xs font-bold">{t('বিভাগ (বাংলা)', 'Division (Bangla)')} *</Label>
                <Input
                  value={formDivisionBn}
                  onChange={(e) => setFormDivisionBn(e.target.value)}
                  placeholder="যেমন: ঢাকা"
                  className="text-xs h-8"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">{t('বিভাগ (ইংরেজি)', 'Division (English)')}</Label>
                <Input
                  value={formDivisionEn}
                  onChange={(e) => setFormDivisionEn(e.target.value)}
                  placeholder="e.g. Dhaka"
                  className="text-xs font-mono h-8"
                />
              </div>

              {/* District */}
              <div className="space-y-1">
                <Label className="text-xs font-bold">{t('জেলা (বাংলা)', 'District (Bangla)')} *</Label>
                <Input
                  value={formDistrictBn}
                  onChange={(e) => setFormDistrictBn(e.target.value)}
                  placeholder="যেমন: ঢাকা"
                  className="text-xs h-8"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">{t('জেলা (ইংরেজি)', 'District (English)')}</Label>
                <Input
                  value={formDistrictEn}
                  onChange={(e) => setFormDistrictEn(e.target.value)}
                  placeholder="e.g. Dhaka"
                  className="text-xs font-mono h-8"
                />
              </div>

              {/* Upazila */}
              <div className="space-y-1">
                <Label className="text-xs font-bold">{t('উপজেলা / থানা (বাংলা)', 'Upazila (Bangla)')} *</Label>
                <Input
                  value={formUpazilaBn}
                  onChange={(e) => setFormUpazilaBn(e.target.value)}
                  placeholder="যেমন: সাভার"
                  className="text-xs h-8"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">{t('উপজেলা / থানা (ইংরেজি)', 'Upazila (English)')}</Label>
                <Input
                  value={formUpazilaEn}
                  onChange={(e) => setFormUpazilaEn(e.target.value)}
                  placeholder="e.g. Savar"
                  className="text-xs font-mono h-8"
                />
              </div>

              {/* Mouza Name */}
              <div className="space-y-1">
                <Label className="text-xs font-bold">{t('মৌজার নাম (বাংলা)', 'Mouza Name (Bangla)')} *</Label>
                <Input
                  value={formMouzaBn}
                  onChange={(e) => setFormMouzaBn(e.target.value)}
                  placeholder="যেমন: বিরুলিয়া"
                  className="text-xs font-bold h-8"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">{t('মৌজার নাম (ইংরেজি)', 'Mouza Name (English)')}</Label>
                <Input
                  value={formMouzaEn}
                  onChange={(e) => setFormMouzaEn(e.target.value)}
                  placeholder="e.g. Birulia"
                  className="text-xs font-mono h-8"
                />
              </div>

              {/* JL No */}
              <div className="space-y-1">
                <Label className="text-xs font-bold">{t('জে.এল. নম্বর', 'J.L. No')} *</Label>
                <Input
                  value={formJlNo}
                  onChange={(e) => setFormJlNo(e.target.value)}
                  placeholder="যেমন: ১২"
                  className="text-xs font-mono font-bold h-8"
                  required
                />
              </div>

              {/* Coordinates */}
              <div className="space-y-1">
                <Label className="text-xs font-bold">{t('স্থানাঙ্ক (GPS)', 'Coordinates')}</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  <Input
                    value={formLat}
                    onChange={(e) => setFormLat(e.target.value)}
                    placeholder="Latitude"
                    className="text-xs font-mono h-8"
                  />
                  <Input
                    value={formLng}
                    onChange={(e) => setFormLng(e.target.value)}
                    placeholder="Longitude"
                    className="text-xs font-mono h-8"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddModal(false)}
                className="text-xs cursor-pointer h-8"
              >
                {t('বাতিল', 'Cancel')}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={formSubmitting}
                className="bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold cursor-pointer h-8"
              >
                {formSubmitting ? t('সংরক্ষণ হচ্ছে...', 'Saving...') : t('সংরক্ষণ করুন', 'Save Mouza')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT MOUZA MODAL */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-[#006A4E]">
              <Edit2 className="size-5" />
              <span>{t('মৌজা তথ্য সম্পাদনা', 'Edit Mouza Details')}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t('মৌজার নাম, জে.এল. নম্বর ও স্থানাঙ্ক পরিবর্তন করুন।', 'Update mouza name, JL No, and coordinates.')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEditMouza} className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-xs font-bold">{t('বিভাগ (বাংলা)', 'Division (Bangla)')}</Label>
                <Input
                  value={formDivisionBn}
                  onChange={(e) => setFormDivisionBn(e.target.value)}
                  className="text-xs h-8"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">{t('বিভাগ (ইংরেজি)', 'Division (English)')}</Label>
                <Input
                  value={formDivisionEn}
                  onChange={(e) => setFormDivisionEn(e.target.value)}
                  className="text-xs font-mono h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">{t('জেলা (বাংলা)', 'District (Bangla)')}</Label>
                <Input
                  value={formDistrictBn}
                  onChange={(e) => setFormDistrictBn(e.target.value)}
                  className="text-xs h-8"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">{t('জেলা (ইংরেজি)', 'District (English)')}</Label>
                <Input
                  value={formDistrictEn}
                  onChange={(e) => setFormDistrictEn(e.target.value)}
                  className="text-xs font-mono h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">{t('উপজেলা / থানা (বাংলা)', 'Upazila (Bangla)')}</Label>
                <Input
                  value={formUpazilaBn}
                  onChange={(e) => setFormUpazilaBn(e.target.value)}
                  className="text-xs h-8"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">{t('উপজেলা / থানা (ইংরেজি)', 'Upazila (English)')}</Label>
                <Input
                  value={formUpazilaEn}
                  onChange={(e) => setFormUpazilaEn(e.target.value)}
                  className="text-xs font-mono h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">{t('মৌজার নাম (বাংলা)', 'Mouza Name (Bangla)')} *</Label>
                <Input
                  value={formMouzaBn}
                  onChange={(e) => setFormMouzaBn(e.target.value)}
                  className="text-xs font-bold h-8"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">{t('মৌজার নাম (ইংরেজি)', 'Mouza Name (English)')}</Label>
                <Input
                  value={formMouzaEn}
                  onChange={(e) => setFormMouzaEn(e.target.value)}
                  className="text-xs font-mono h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">{t('জে.এল. নম্বর', 'J.L. No')} *</Label>
                <Input
                  value={formJlNo}
                  onChange={(e) => setFormJlNo(e.target.value)}
                  className="text-xs font-mono font-bold h-8"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">{t('স্থানাঙ্ক (GPS)', 'Coordinates')}</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  <Input
                    value={formLat}
                    onChange={(e) => setFormLat(e.target.value)}
                    placeholder="Latitude"
                    className="text-xs font-mono h-8"
                  />
                  <Input
                    value={formLng}
                    onChange={(e) => setFormLng(e.target.value)}
                    placeholder="Longitude"
                    className="text-xs font-mono h-8"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowEditModal(false)}
                className="text-xs cursor-pointer h-8"
              >
                {t('বাতিল', 'Cancel')}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={formSubmitting}
                className="bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold cursor-pointer h-8"
              >
                {formSubmitting ? t('আপডেট হচ্ছে...', 'Updating...') : t('আপডেট নিশ্চিত করুন', 'Save Changes')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE MOUZA CONFIRMATION */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-rose-600">
              <AlertTriangle className="size-5" />
              <span>{t('মৌজা অপসারণ নিশ্চিতকরণ', 'Confirm Mouza Deletion')}</span>
            </DialogTitle>
          </DialogHeader>

          {deletingMouza && (
            <div className="space-y-2.5 py-1">
              <div className="p-2.5 bg-muted/40 rounded-lg border text-xs space-y-0.5">
                <div className="font-bold text-foreground">
                  {deletingMouza.mouza_bn} ({t('জেএল', 'JL')} {toBanglaDigits(deletingMouza.jl_no, lang)})
                </div>
                <div className="text-muted-foreground text-[11px]">
                  {deletingMouza.upazila_bn}, {deletingMouza.district_bn}, {deletingMouza.division_bn}
                </div>
              </div>

              {deletingMouza.plots_count > 0 ? (
                <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-xs flex items-start gap-2">
                  <Lock className="size-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">
                      {t('অপসারণ নিষিদ্ধ: সক্রিয় প্লট সংযুক্ত রয়েছে', 'Deletion Blocked: Active plots attached')}
                    </span>
                    <span className="text-[11px] leading-tight block mt-0.5">
                      {t(
                        `এই মৌজার অধীনে ${toBanglaDigits(deletingMouza.plots_count, lang)}টি সক্রিয় দাগ নিবন্ধিত রয়েছে। ডাটাবেইজের অখণ্ডতা রক্ষায় প্লট থাকা অবস্থায় মৌজা মুছে ফেলা যাবে না।`,
                        `This mouza contains ${deletingMouza.plots_count} active plots. You must remove those plots first.`
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t(
                    'আপনি কি নিশ্চিত যে আপনি এই মৌজাটি ডাটাবেইজ থেকে স্থায়ীভাবে অপসারণ করতে চান?',
                    'Are you sure you want to permanently delete this mouza record?'
                  )}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteModal(false)}
              className="text-xs cursor-pointer h-8"
            >
              {t('বাতিল', 'Cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={formSubmitting || (deletingMouza && deletingMouza.plots_count > 0)}
              onClick={handleConfirmDeleteMouza}
              className="text-xs font-bold cursor-pointer h-8"
            >
              {formSubmitting ? t('মুছে ফেলা হচ্ছে...', 'Deleting...') : t('মুছে ফেলুন', 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RENAME TIER MODAL */}
      <Dialog open={showRenameModal} onOpenChange={setShowRenameModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-[#006A4E]">
              <Tag className="size-5" />
              <span>{t('ভৌগোলিক স্তর পুনঃনামকরণ', 'Rename Administrative Tier')}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t(
                'বিভাগ, জেলা বা উপজেলার নাম পরিবর্তন করলে অধীনস্থ সকল মৌজা এক ক্লিকে আপডেট হবে।',
                'Renaming a division, district, or upazila atomically updates all underlying mouzas.'
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRename} className="space-y-3 pt-1">
            <div className="space-y-2.5">
              <div className="space-y-1">
                <Label className="text-xs font-bold">{t('স্তরের ধরন', 'Tier Type')}</Label>
                <Select
                  value={renameTierType}
                  onValueChange={(val: any) => {
                    setRenameTierType(val);
                    if (val === 'division') setRenameOldNameBn(allDivisions[0]?.division_bn || '');
                    if (val === 'district') setRenameOldNameBn(allDistricts[0]?.district_bn || '');
                    if (val === 'upazila') setRenameOldNameBn(allUpazilas[0]?.upazila_bn || '');
                  }}
                >
                  <SelectTrigger className="text-xs font-medium bg-background border-border h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="division">{t('বিভাগ (Division)', 'Division')}</SelectItem>
                    <SelectItem value="district">{t('জেলা (District)', 'District')}</SelectItem>
                    <SelectItem value="upazila">{t('উপজেলা / থানা (Upazila)', 'Upazila')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">{t('বর্তমান নাম নির্বাচন করুন', 'Select Current Name')}</Label>
                <Select
                  value={renameOldNameBn}
                  onValueChange={(val) => {
                    setRenameOldNameBn(val);
                    setRenameNewNameBn(val);
                  }}
                >
                  <SelectTrigger className="text-xs font-medium bg-background border-border h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {renameTierType === 'division' &&
                      allDivisions.map((div) => (
                        <SelectItem key={div.division_bn} value={div.division_bn}>
                          {div.division_bn} ({div.division_en})
                        </SelectItem>
                      ))}
                    {renameTierType === 'district' &&
                      allDistricts.map((dist) => (
                        <SelectItem key={`${dist.division_bn}-${dist.district_bn}`} value={dist.district_bn}>
                          {dist.district_bn} ({dist.district_en})
                        </SelectItem>
                      ))}
                    {renameTierType === 'upazila' &&
                      allUpazilas.map((upz) => (
                        <SelectItem key={`${upz.district_bn}-${upz.upazila_bn}`} value={upz.upazila_bn}>
                          {upz.upazila_bn} ({upz.upazila_en}) - {upz.district_bn}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">{t('নতুন নাম (বাংলা)', 'New Name (Bangla)')} *</Label>
                <Input
                  value={renameNewNameBn}
                  onChange={(e) => setRenameNewNameBn(e.target.value)}
                  className="text-xs font-bold h-8"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">{t('নতুন নাম (ইংরেজি)', 'New Name (English)')}</Label>
                <Input
                  value={renameNewNameEn}
                  onChange={(e) => setRenameNewNameEn(e.target.value)}
                  className="text-xs font-mono h-8"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowRenameModal(false)}
                className="text-xs cursor-pointer h-8"
              >
                {t('বাতিল', 'Cancel')}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={formSubmitting}
                className="bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold cursor-pointer h-8"
              >
                {formSubmitting ? t('আপডেট হচ্ছে...', 'Updating...') : t('পুনঃনামকরণ নিশ্চিত করুন', 'Confirm Rename')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
