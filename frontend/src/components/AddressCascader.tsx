import React, { useState, useEffect, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { BhumiApi, HierarchyDivisionItem, HierarchyDistrictItem, HierarchyUpazilaItem, HierarchyMouzaItem } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';

export interface AddressSelection {
  division_bn: string;
  division_en?: string;
  district_bn: string;
  district_en?: string;
  upazila_bn: string;
  upazila_en?: string;
  mouza_id?: number | '';
  mouza_bn?: string;
  mouza_en?: string;
  jl_no?: string;
}

export interface AddressCascaderProps {
  selectedDivision?: string;
  selectedDistrict?: string;
  selectedUpazila?: string;
  selectedMouzaId?: number | string;
  onChange: (selection: AddressSelection) => void;
  showMouza?: boolean;
  isFilter?: boolean;
  required?: boolean;
  disabled?: boolean;
  lang?: 'bn' | 'en';
  layout?: 'grid' | 'inline' | 'stacked';
  className?: string;
}

export const AddressCascader: React.FC<AddressCascaderProps> = ({
  selectedDivision = '',
  selectedDistrict = '',
  selectedUpazila = '',
  selectedMouzaId = '',
  onChange,
  showMouza = true,
  isFilter = false,
  required = false,
  disabled = false,
  lang = 'bn',
  layout = 'grid',
  className = '',
}) => {
  const [tree, setTree] = useState<HierarchyDivisionItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    BhumiApi.getHierarchyTree()
      .then((items) => {
        if (mounted) {
          setTree(items || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const divisions = Array.isArray(tree) ? tree : [];

  const currentDivisionItem = useMemo(() => {
    if (!selectedDivision) return null;
    return divisions.find((d) => d.division_bn === selectedDivision || d.division_en === selectedDivision) || null;
  }, [divisions, selectedDivision]);

  const districts: HierarchyDistrictItem[] = useMemo(() => {
    if (currentDivisionItem) {
      return currentDivisionItem.districts || [];
    }
    // If filter mode and no division chosen, collect all districts
    if (isFilter) {
      return divisions.flatMap((d) => d.districts || []);
    }
    return [];
  }, [currentDivisionItem, divisions, isFilter]);

  const currentDistrictItem = useMemo(() => {
    if (!selectedDistrict) return null;
    return districts.find((d) => d.district_bn === selectedDistrict || d.district_en === selectedDistrict) || null;
  }, [districts, selectedDistrict]);

  const upazilas: HierarchyUpazilaItem[] = useMemo(() => {
    if (currentDistrictItem) {
      return currentDistrictItem.upazilas || [];
    }
    if (isFilter && currentDivisionItem) {
      return currentDivisionItem.districts.flatMap((d) => d.upazilas || []);
    }
    return [];
  }, [currentDistrictItem, currentDivisionItem, isFilter]);

  const currentUpazilaItem = useMemo(() => {
    if (!selectedUpazila) return null;
    return upazilas.find((u) => u.upazila_bn === selectedUpazila || u.upazila_en === selectedUpazila) || null;
  }, [upazilas, selectedUpazila]);

  const mouzas: HierarchyMouzaItem[] = useMemo(() => {
    if (currentUpazilaItem) {
      return currentUpazilaItem.mouzas || [];
    }
    return [];
  }, [currentUpazilaItem]);

  const handleDivisionChange = (divBn: string) => {
    const divItem = divisions.find((d) => d.division_bn === divBn);
    onChange({
      division_bn: divBn,
      division_en: divItem?.division_en || '',
      district_bn: '',
      district_en: '',
      upazila_bn: '',
      upazila_en: '',
      mouza_id: '',
      mouza_bn: '',
      mouza_en: '',
      jl_no: '',
    });
  };

  const handleDistrictChange = (distBn: string) => {
    const distItem = districts.find((d) => d.district_bn === distBn);
    onChange({
      division_bn: selectedDivision || (currentDivisionItem?.division_bn ?? ''),
      division_en: currentDivisionItem?.division_en ?? '',
      district_bn: distBn,
      district_en: distItem?.district_en || '',
      upazila_bn: '',
      upazila_en: '',
      mouza_id: '',
      mouza_bn: '',
      mouza_en: '',
      jl_no: '',
    });
  };

  const handleUpazilaChange = (upzBn: string) => {
    const upzItem = upazilas.find((u) => u.upazila_bn === upzBn);
    onChange({
      division_bn: selectedDivision || (currentDivisionItem?.division_bn ?? ''),
      division_en: currentDivisionItem?.division_en ?? '',
      district_bn: selectedDistrict || (currentDistrictItem?.district_bn ?? ''),
      district_en: currentDistrictItem?.district_en ?? '',
      upazila_bn: upzBn,
      upazila_en: upzItem?.upazila_en || '',
      mouza_id: '',
      mouza_bn: '',
      mouza_en: '',
      jl_no: '',
    });
  };

  const handleMouzaChange = (mouzaIdStr: string) => {
    const mId = mouzaIdStr ? Number(mouzaIdStr) : '';
    const mItem = mouzas.find((m) => m.id === mId);
    onChange({
      division_bn: selectedDivision || (currentDivisionItem?.division_bn ?? ''),
      division_en: currentDivisionItem?.division_en ?? '',
      district_bn: selectedDistrict || (currentDistrictItem?.district_bn ?? ''),
      district_en: currentDistrictItem?.district_en ?? '',
      upazila_bn: selectedUpazila || (currentUpazilaItem?.upazila_bn ?? ''),
      upazila_en: currentUpazilaItem?.upazila_en ?? '',
      mouza_id: mId,
      mouza_bn: mItem?.mouza_bn || '',
      mouza_en: mItem?.mouza_en || '',
      jl_no: mItem?.jl_no || '',
    });
  };

  const gridClass =
    layout === 'grid'
      ? `grid grid-cols-1 sm:grid-cols-2 ${showMouza ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-2.5`
      : layout === 'inline'
      ? 'flex flex-wrap items-center gap-2.5'
      : 'space-y-2.5';

  return (
    <div className={`address-cascader ${gridClass} ${className}`}>
      {/* 1. Division (বিভাগ) */}
      <div className={layout === 'inline' ? 'min-w-[140px]' : ''}>
        <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
          <MapPin className="w-3 h-3 text-[#006A4E]" />
          <span>{lang === 'bn' ? 'বিভাগ' : 'Division'}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>
        <select
          value={selectedDivision}
          onChange={(e) => handleDivisionChange(e.target.value)}
          disabled={disabled || loading}
          required={required}
          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:border-[#006A4E] focus:ring-1 focus:ring-[#006A4E] disabled:bg-slate-100 disabled:cursor-not-allowed"
        >
          <option value="">
            {isFilter ? (lang === 'bn' ? 'সকল বিভাগ' : 'All Divisions') : (lang === 'bn' ? '-- বিভাগ নির্বাচন করুন --' : '-- Select Division --')}
          </option>
          {divisions.map((div) => (
            <option key={div.division_bn} value={div.division_bn}>
              {lang === 'bn' ? div.division_bn : (div.division_en || div.division_bn)}
            </option>
          ))}
        </select>
      </div>

      {/* 2. District (জেলা) */}
      <div className={layout === 'inline' ? 'min-w-[140px]' : ''}>
        <label className="block text-[11px] font-bold text-slate-700 mb-1">
          <span>{lang === 'bn' ? 'জেলা' : 'District'}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>
        <select
          value={selectedDistrict}
          onChange={(e) => handleDistrictChange(e.target.value)}
          disabled={disabled || loading || (!selectedDivision && !isFilter)}
          required={required}
          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:border-[#006A4E] focus:ring-1 focus:ring-[#006A4E] disabled:bg-slate-100 disabled:cursor-not-allowed"
        >
          <option value="">
            {isFilter ? (lang === 'bn' ? 'সকল জেলা' : 'All Districts') : (lang === 'bn' ? '-- জেলা নির্বাচন করুন --' : '-- Select District --')}
          </option>
          {districts.map((dist) => (
            <option key={dist.district_bn} value={dist.district_bn}>
              {lang === 'bn' ? dist.district_bn : (dist.district_en || dist.district_bn)}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Upazila / Thana (উপজেলা / থানা) */}
      <div className={layout === 'inline' ? 'min-w-[140px]' : ''}>
        <label className="block text-[11px] font-bold text-slate-700 mb-1">
          <span>{lang === 'bn' ? 'উপজেলা / থানা' : 'Upazila / Thana'}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>
        <select
          value={selectedUpazila}
          onChange={(e) => handleUpazilaChange(e.target.value)}
          disabled={disabled || loading || (!selectedDistrict && !isFilter)}
          required={required}
          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:border-[#006A4E] focus:ring-1 focus:ring-[#006A4E] disabled:bg-slate-100 disabled:cursor-not-allowed"
        >
          <option value="">
            {isFilter ? (lang === 'bn' ? 'সকল উপজেলা' : 'All Upazilas') : (lang === 'bn' ? '-- উপজেলা নির্বাচন করুন --' : '-- Select Upazila --')}
          </option>
          {upazilas.map((upz) => (
            <option key={upz.upazila_bn} value={upz.upazila_bn}>
              {lang === 'bn' ? upz.upazila_bn : (upz.upazila_en || upz.upazila_bn)}
            </option>
          ))}
        </select>
      </div>

      {/* 4. Mouza / JL No (মৌজা ও জে.এল. নং) */}
      {showMouza && (
        <div className={layout === 'inline' ? 'min-w-[160px]' : ''}>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            <span>{lang === 'bn' ? 'মৌজা ও জে.এল. নং' : 'Mouza & J.L. No'}</span>
            {required && <span className="text-rose-500">*</span>}
          </label>
          <select
            value={selectedMouzaId ? String(selectedMouzaId) : ''}
            onChange={(e) => handleMouzaChange(e.target.value)}
            disabled={disabled || loading || !selectedUpazila}
            required={required}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:border-[#006A4E] focus:ring-1 focus:ring-[#006A4E] disabled:bg-slate-100 disabled:cursor-not-allowed"
          >
            <option value="">
              {isFilter ? (lang === 'bn' ? 'সকল মৌজা' : 'All Mouzas') : (lang === 'bn' ? '-- মৌজা নির্বাচন করুন --' : '-- Select Mouza --')}
            </option>
            {mouzas.map((m) => (
              <option key={m.id} value={m.id}>
                {lang === 'bn' ? m.mouza_bn : (m.mouza_en || m.mouza_bn)}
                {m.jl_no ? ` (জে.এল. নং: ${toBanglaDigits(m.jl_no, lang)})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};
