import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import {
  MapPin,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Tag,
  Search,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Info,
  ShieldCheck,
  Building2,
  Phone,
  Compass,
  Ruler,
  HelpCircle,
  X,
  ChevronDown,
  Globe,
  PieChart,
  RotateCcw,
  BookOpen,
  FileText,
  Eye,
  ShieldAlert,
  ArrowRight,
  SlidersHorizontal
} from 'lucide-react';

interface CadastralMapPageProps {
  onNavigate?: (tab: string) => void;
}

// -----------------------------------------------------------------------------
// ADMINISTRATIVE GEOGRAPHY DATA (Cascading Hierarchy)
// -----------------------------------------------------------------------------

interface AdministrativeHierarchy {
  [division: string]: {
    [district: string]: {
      [upazila: string]: {
        [mouza: string]: {
          jlNo: string;
          sheets: string[];
          center: { lat: number; lng: number };
        };
      };
    };
  };
}

const ADMIN_DATA: AdministrativeHierarchy = {
  ঢাকা: {
    ঢাকা: {
      সাভার: {
        'বিরুলিয়া (JL-12)': {
          jlNo: '১২',
          sheets: ['০১', '০২'],
          center: { lat: 23.8587, lng: 90.3181 },
        },
        'আশুলিয়া (JL-01)': {
          jlNo: '০১',
          sheets: ['০১'],
          center: { lat: 23.9012, lng: 90.3245 },
        },
        'শিমুলিয়া (JL-15)': {
          jlNo: '১৫',
          sheets: ['০১', '০২'],
          center: { lat: 23.9421, lng: 90.2812 },
        },
      },
      ধানমন্ডি: {
        'ধানমন্ডি (JL-20)': {
          jlNo: '২০',
          sheets: ['০১'],
          center: { lat: 23.7461, lng: 90.3742 },
        },
      },
      তেজগাঁও: {
        'তেজগাঁও শিল্পাঞ্চল (JL-04)': {
          jlNo: '০৪',
          sheets: ['০১'],
          center: { lat: 23.7692, lng: 90.3981 },
        },
      },
    },
    গাজীপুর: {
      'গাজীপুর সদর': {
        'বাসন (JL-24)': {
          jlNo: '২৪',
          sheets: ['০১', '০২'],
          center: { lat: 23.9921, lng: 90.4102 },
        },
        'কাশিমপুর (JL-18)': {
          jlNo: '১৮',
          sheets: ['০১'],
          center: { lat: 24.0123, lng: 90.3456 },
        },
      },
    },
    নারায়ণগঞ্জ: {
      সোনারগাঁও: {
        'পানাম (JL-07)': {
          jlNo: '০৭',
          sheets: ['০১'],
          center: { lat: 23.6489, lng: 90.5982 },
        },
        'মোগরাপাড়া (JL-11)': {
          jlNo: '১১',
          sheets: ['০১'],
          center: { lat: 23.6214, lng: 90.6123 },
        },
      },
    },
  },
  চট্টগ্রাম: {
    চট্টগ্রাম: {
      পাঁচলাইশ: {
        'ষোলশহর (JL-18)': {
          jlNo: '১৮',
          sheets: ['০১'],
          center: { lat: 22.3682, lng: 91.8291 },
        },
      },
    },
  },
  রাজশাহী: {
    রাজশাহী: {
      বোয়ালিয়া: {
        'রানীবাজার (JL-09)': {
          jlNo: '০৯',
          sheets: ['০১'],
          center: { lat: 24.3636, lng: 88.6241 },
        },
      },
    },
  },
  খুলনা: {
    খুলনা: {
      খালিশপুর: {
        'বৈকালী (JL-15)': {
          jlNo: '১৫',
          sheets: ['০১'],
          center: { lat: 22.8421, lng: 89.5412 },
        },
      },
    },
  },
  বরিশাল: {
    বরিশাল: {
      'বরিশাল সদর': {
        'আমানতগঞ্জ (JL-11)': {
          jlNo: '১১',
          sheets: ['০১'],
          center: { lat: 22.7012, lng: 90.3542 },
        },
      },
    },
  },
  সিলেট: {
    সিলেট: {
      কোতোয়ালী: {
        'জিন্দাবাজার (JL-14)': {
          jlNo: '১৪',
          sheets: ['০১'],
          center: { lat: 24.8949, lng: 91.8687 },
        },
      },
    },
  },
  রংপুর: {
    রংপুর: {
      'রংপুর সদর': {
        'মাহিগঞ্জ (JL-08)': {
          jlNo: '০৮',
          sheets: ['০১'],
          center: { lat: 25.7439, lng: 89.2752 },
        },
      },
    },
  },
  ময়মনসিংহ: {
    ময়মনসিংহ: {
      'ময়মনসিংহ সদর': {
        'চরপাড়া (JL-22)': {
          jlNo: '২২',
          sheets: ['০১'],
          center: { lat: 24.7471, lng: 90.4203 },
        },
      },
    },
  },
};

// -----------------------------------------------------------------------------
// PLOT DETAIL INTERFACE & SYNTHETIC CADASTRAL PARCELS
// -----------------------------------------------------------------------------

export interface CadastralParcel {
  id: number;
  dagNo: string;
  dagNoBn: string;
  khatianNo: string;
  khatianNoBn: string;
  mouzaBn: string;
  jlNo: string;
  sheetNo: string;
  landClassBn: string;
  areaDecimal: number;
  areaKatha: number;
  zoningCategory: string;
  zoningColor: string;
  ownerMasked: string;
  nidMasked: string;
  status: 'SAFE' | 'FOR_SALE' | 'SALE_LOCKED' | 'MORTGAGED' | 'DISPUTED';
  statusLabelBn: string;
  askingPriceBdt?: number;
  // SVG polygon geometry (relative viewBox coordinates 0..1000)
  svgPath: string;
  labelCoord: { x: number; y: number };
}

// 20 realistic cadastral parcels for Birulia Mouza (CS/RS/BS cadastral survey grid)
const BIRULIA_PARCELS: CadastralParcel[] = [
  {
    id: 1,
    dagNo: '101',
    dagNoBn: '১০১',
    khatianNo: '1204',
    khatianNoBn: '১২০৪',
    mouzaBn: 'বিরুলিয়া',
    jlNo: '১২',
    sheetNo: '০১',
    landClassBn: 'ভিটা (আবাসিক)',
    areaDecimal: 20.0,
    areaKatha: 12.1,
    zoningCategory: 'পরিকল্পিত আবাসন জোন',
    zoningColor: '#fde68a',
    ownerMasked: 'মোঃ রফিকুল ইসলাম',
    nidMasked: '****৫৮৯১',
    status: 'FOR_SALE',
    statusLabelBn: 'বিক্রির জন্য সক্রিয়',
    askingPriceBdt: 4500000,
    svgPath: 'M 40,40 L 220,50 L 240,210 L 50,190 Z',
    labelCoord: { x: 130, y: 125 },
  },
  {
    id: 2,
    dagNo: '102',
    dagNoBn: '১০২',
    khatianNo: '1205',
    khatianNoBn: '১২০৫',
    mouzaBn: 'বিরুলিয়া',
    jlNo: '১২',
    sheetNo: '০১',
    landClassBn: 'নাল (কৃষি)',
    areaDecimal: 15.0,
    areaKatha: 9.1,
    zoningCategory: 'কৃষি সুরক্ষা জোন',
    zoningColor: '#a7f3d0',
    ownerMasked: 'বেগম নাজমুন নাহার',
    nidMasked: '****৩৪১২',
    status: 'SAFE',
    statusLabelBn: 'নিষ্কণ্টক ও যাচাইকৃত',
    svgPath: 'M 220,50 L 420,35 L 440,200 L 240,210 Z',
    labelCoord: { x: 330, y: 120 },
  },
  {
    id: 3,
    dagNo: '103',
    dagNoBn: '১০৩',
    khatianNo: '1206',
    khatianNoBn: '১২০৬',
    mouzaBn: 'বিরুলিয়া',
    jlNo: '১২',
    sheetNo: '০১',
    landClassBn: 'চালা (উঁচু জমি)',
    areaDecimal: 24.5,
    areaKatha: 14.8,
    zoningCategory: 'কৃষি সুরক্ষা জোন',
    zoningColor: '#a7f3d0',
    ownerMasked: 'আব্দুল কাদের চৌধুরী',
    nidMasked: '****৭৮২১',
    status: 'MORTGAGED',
    statusLabelBn: 'সোনালী ব্যাংক বন্ধক বিদ্যমান',
    svgPath: 'M 420,35 L 610,60 L 600,220 L 440,200 Z',
    labelCoord: { x: 515, y: 125 },
  },
  {
    id: 4,
    dagNo: '104',
    dagNoBn: '১০৪',
    khatianNo: '1207',
    khatianNoBn: '১২০৭',
    mouzaBn: 'বিরুলিয়া',
    jlNo: '১২',
    sheetNo: '০১',
    landClassBn: 'বাগান',
    areaDecimal: 16.0,
    areaKatha: 9.7,
    zoningCategory: 'বনায়ন ও সবুজ বেষ্টনী',
    zoningColor: '#bbf7d0',
    ownerMasked: 'ফারহানা আহমেদ',
    nidMasked: '****১২০৯',
    status: 'SAFE',
    statusLabelBn: 'নিষ্কণ্টক ও যাচাইকৃত',
    svgPath: 'M 610,60 L 800,45 L 820,210 L 600,220 Z',
    labelCoord: { x: 705, y: 130 },
  },
  {
    id: 5,
    dagNo: '105',
    dagNoBn: '১০৫',
    khatianNo: '1208',
    khatianNoBn: '১২০৮',
    mouzaBn: 'বিরুলিয়া',
    jlNo: '১২',
    sheetNo: '০১',
    landClassBn: 'জলাশয় / পুকুর',
    areaDecimal: 32.0,
    areaKatha: 19.4,
    zoningCategory: 'সংবেদনশীল জলাভূমি ও নদী জোন',
    zoningColor: '#bae6fd',
    ownerMasked: 'মোঃ জালাল উদ্দিন ও ওয়ারিশগণ',
    nidMasked: '****৯৯০১',
    status: 'SALE_LOCKED',
    statusLabelBn: 'মালিক কর্তৃক বিক্রয় লক',
    svgPath: 'M 800,45 L 960,55 L 950,230 L 820,210 Z',
    labelCoord: { x: 885, y: 135 },
  },
  {
    id: 6,
    dagNo: '106',
    dagNoBn: '১০৬',
    khatianNo: '1209',
    khatianNoBn: '১২০৯',
    mouzaBn: 'বিরুলিয়া',
    jlNo: '১২',
    sheetNo: '০১',
    landClassBn: 'ভিটা (আবাসিক)',
    areaDecimal: 18.0,
    areaKatha: 10.9,
    zoningCategory: 'পরিকল্পিত আবাসন জোন',
    zoningColor: '#fde68a',
    ownerMasked: 'কামরুল হাসান',
    nidMasked: '****৬৬৭৭',
    status: 'SAFE',
    statusLabelBn: 'নিষ্কণ্টক ও যাচাইকৃত',
    svgPath: 'M 50,190 L 240,210 L 230,380 L 60,370 Z',
    labelCoord: { x: 145, y: 290 },
  },
  {
    id: 7,
    dagNo: '107',
    dagNoBn: '১০৭',
    khatianNo: '1210',
    khatianNoBn: '১২১০',
    mouzaBn: 'বিরুলিয়া',
    jlNo: '১২',
    sheetNo: '০১',
    landClassBn: 'নাল (কৃষি)',
    areaDecimal: 22.0,
    areaKatha: 13.3,
    zoningCategory: 'কৃষি সুরক্ষা জোন',
    zoningColor: '#a7f3d0',
    ownerMasked: 'শামসুল হক',
    nidMasked: '****৪৩২১',
    status: 'FOR_SALE',
    statusLabelBn: 'বিক্রির জন্য সক্রিয়',
    askingPriceBdt: 3800000,
    svgPath: 'M 240,210 L 440,200 L 430,375 L 230,380 Z',
    labelCoord: { x: 335, y: 290 },
  },
  {
    id: 8,
    dagNo: '108',
    dagNoBn: '১০৮',
    khatianNo: '1211',
    khatianNoBn: '১২১১',
    mouzaBn: 'বিরুলিয়া',
    jlNo: '১২',
    sheetNo: '০১',
    landClassBn: 'বাণিজ্যিক',
    areaDecimal: 12.5,
    areaKatha: 7.6,
    zoningCategory: 'বাণিজ্যিক ও অর্থনৈতিক জোন',
    zoningColor: '#c7d2fe',
    ownerMasked: 'আল-আমীন ট্রেডিং',
    nidMasked: '****৮৮১২',
    status: 'DISPUTED',
    statusLabelBn: 'ওয়ারিশি আপত্তি বিচারাধীন',
    svgPath: 'M 440,200 L 600,220 L 610,390 L 430,375 Z',
    labelCoord: { x: 520, y: 295 },
  },
  {
    id: 9,
    dagNo: '109',
    dagNoBn: '১০৯',
    khatianNo: '1212',
    khatianNoBn: '১২১২',
    mouzaBn: 'বিরুলিয়া',
    jlNo: '১২',
    sheetNo: '০১',
    landClassBn: 'চালা (উঁচু জমি)',
    areaDecimal: 19.0,
    areaKatha: 11.5,
    zoningCategory: 'কৃষি সুরক্ষা জোন',
    zoningColor: '#a7f3d0',
    ownerMasked: 'মোছাঃ সেলিনা পারভীন',
    nidMasked: '****৫৫৪৩',
    status: 'SAFE',
    statusLabelBn: 'নিষ্কণ্টক ও যাচাইকৃত',
    svgPath: 'M 600,220 L 820,210 L 810,385 L 610,390 Z',
    labelCoord: { x: 710, y: 300 },
  },
  {
    id: 10,
    dagNo: '110',
    dagNoBn: '১১০',
    khatianNo: '1213',
    khatianNoBn: '১২১৩',
    mouzaBn: 'বিরুলিয়া',
    jlNo: '১২',
    sheetNo: '০১',
    landClassBn: 'ভিটা (আবাসিক)',
    areaDecimal: 14.0,
    areaKatha: 8.5,
    zoningCategory: 'পরিকল্পিত আবাসন জোন',
    zoningColor: '#fde68a',
    ownerMasked: 'মাহবুবুর রহমান',
    nidMasked: '****৭৭১১',
    status: 'SAFE',
    statusLabelBn: 'নিষ্কণ্টক ও যাচাইকৃত',
    svgPath: 'M 820,210 L 950,230 L 940,395 L 810,385 Z',
    labelCoord: { x: 880, y: 305 },
  },
  {
    id: 11,
    dagNo: '111',
    dagNoBn: '১১১',
    khatianNo: '1214',
    khatianNoBn: '১২১৪',
    mouzaBn: 'বিরুলিয়া',
    jlNo: '১২',
    sheetNo: '০১',
    landClassBn: 'নাল (কৃষি)',
    areaDecimal: 28.0,
    areaKatha: 17.0,
    zoningCategory: 'কৃষি সুরক্ষা জোন',
    zoningColor: '#a7f3d0',
    ownerMasked: 'মোঃ সিরাজুল ইসলাম',
    nidMasked: '****৯৮৭৬',
    status: 'FOR_SALE',
    statusLabelBn: 'বিক্রির জন্য সক্রিয়',
    askingPriceBdt: 5200000,
    svgPath: 'M 60,370 L 230,380 L 240,550 L 70,540 Z',
    labelCoord: { x: 150, y: 460 },
  },
  {
    id: 12,
    dagNo: '112',
    dagNoBn: '১১২',
    khatianNo: '1215',
    khatianNoBn: '১২১৫',
    mouzaBn: 'বিরুলিয়া',
    jlNo: '১২',
    sheetNo: '০১',
    landClassBn: 'ভিটা (আবাসিক)',
    areaDecimal: 21.0,
    areaKatha: 12.7,
    zoningCategory: 'পরিকল্পিত আবাসন জোন',
    zoningColor: '#fde68a',
    ownerMasked: 'নুরুল ইসলাম খান',
    nidMasked: '****৩৪৫৫',
    status: 'SAFE',
    statusLabelBn: 'নিষ্কণ্টক ও যাচাইকৃত',
    svgPath: 'M 230,380 L 430,375 L 420,560 L 240,550 Z',
    labelCoord: { x: 330, y: 465 },
  },
  {
    id: 13,
    dagNo: '113',
    dagNoBn: '১১৩',
    khatianNo: '1216',
    khatianNoBn: '১২১৬',
    mouzaBn: 'বিরুলিয়া',
    jlNo: '১২',
    sheetNo: '০১',
    landClassBn: 'জলাশয় / খাল',
    areaDecimal: 45.0,
    areaKatha: 27.2,
    zoningCategory: 'সংবেদনশীল জলাভূমি ও নদী জোন',
    zoningColor: '#bae6fd',
    ownerMasked: 'বাংলাদেশ সরকার (খাস জমি)',
    nidMasked: '****০০০১',
    status: 'SALE_LOCKED',
    statusLabelBn: 'সরকারি ১ নং খাস খতিয়ান',
    svgPath: 'M 430,375 L 610,390 L 620,565 L 420,560 Z',
    labelCoord: { x: 520, y: 470 },
  },
  {
    id: 14,
    dagNo: '114',
    dagNoBn: '১১৪',
    khatianNo: '1217',
    khatianNoBn: '১২১৭',
    mouzaBn: 'বিরুলিয়া',
    jlNo: '১২',
    sheetNo: '০১',
    landClassBn: 'চালা (উঁচু জমি)',
    areaDecimal: 17.5,
    areaKatha: 10.6,
    zoningCategory: 'কৃষি সুরক্ষা জোন',
    zoningColor: '#a7f3d0',
    ownerMasked: 'রশিদা বেগম',
    nidMasked: '****৫৪৩২',
    status: 'SAFE',
    statusLabelBn: 'নিষ্কণ্টক ও যাচাইকৃত',
    svgPath: 'M 610,390 L 810,385 L 800,570 L 620,565 Z',
    labelCoord: { x: 710, y: 475 },
  },
  {
    id: 15,
    dagNo: '115',
    dagNoBn: '১১৫',
    khatianNo: '1218',
    khatianNoBn: '১২১৮',
    mouzaBn: 'বিরুলিয়া',
    jlNo: '১২',
    sheetNo: '০১',
    landClassBn: 'বাগান',
    areaDecimal: 25.0,
    areaKatha: 15.1,
    zoningCategory: 'বনায়ন ও সবুজ বেষ্টনী',
    zoningColor: '#bbf7d0',
    ownerMasked: 'মোঃ রফিকুজ্জামান',
    nidMasked: '****৬৭১২',
    status: 'MORTGAGED',
    statusLabelBn: 'ব্র্যাক ব্যাংক মর্টগেজ',
    svgPath: 'M 810,385 L 940,395 L 930,575 L 800,570 Z',
    labelCoord: { x: 870, y: 480 },
  },
  {
    id: 16,
    dagNo: '116',
    dagNoBn: '১১৬',
    khatianNo: '1219',
    khatianNoBn: '১২১৯',
    mouzaBn: 'বিরুলিয়া',
    jlNo: '১২',
    sheetNo: '০১',
    landClassBn: 'ভিটা (আবাসিক)',
    areaDecimal: 16.5,
    areaKatha: 10.0,
    zoningCategory: 'পরিকল্পিত আবাসন জোন',
    zoningColor: '#fde68a',
    ownerMasked: 'আবু বকর সিদ্দিক',
    nidMasked: '****৮৭৬৫',
    status: 'SAFE',
    statusLabelBn: 'নিষ্কণ্টক ও যাচাইকৃত',
    svgPath: 'M 70,540 L 240,550 L 230,730 L 80,720 Z',
    labelCoord: { x: 155, y: 635 },
  },
  {
    id: 17,
    dagNo: '117',
    dagNoBn: '১১৭',
    khatianNo: '1220',
    khatianNoBn: '১২২০',
    mouzaBn: 'বিরুলিয়া',
    jlNo: '১২',
    sheetNo: '০১',
    landClassBn: 'নাল (কৃষি)',
    areaDecimal: 23.0,
    areaKatha: 13.9,
    zoningCategory: 'কৃষি সুরক্ষা জোন',
    zoningColor: '#a7f3d0',
    ownerMasked: 'মজিবুর রহমান',
    nidMasked: '****১১৯৮',
    status: 'SAFE',
    statusLabelBn: 'নিষ্কণ্টক ও যাচাইকৃত',
    svgPath: 'M 240,550 L 420,560 L 410,740 L 230,730 Z',
    labelCoord: { x: 325, y: 645 },
  },
  {
    id: 18,
    dagNo: '118',
    dagNoBn: '১১৮',
    khatianNo: '1221',
    khatianNoBn: '১২২১',
    mouzaBn: 'বিরুলিয়া',
    jlNo: '১২',
    sheetNo: '০১',
    landClassBn: 'বাণিজ্যিক',
    areaDecimal: 30.0,
    areaKatha: 18.2,
    zoningCategory: 'বাণিজ্যিক ও অর্থনৈতিক জোন',
    zoningColor: '#c7d2fe',
    ownerMasked: 'বিরুলিয়া কোল্ড স্টোরেজ লিঃ',
    nidMasked: '****৫৬৭৮',
    status: 'FOR_SALE',
    statusLabelBn: 'বিক্রির জন্য সক্রিয়',
    askingPriceBdt: 8500000,
    svgPath: 'M 420,560 L 620,565 L 610,750 L 410,740 Z',
    labelCoord: { x: 515, y: 650 },
  },
  {
    id: 19,
    dagNo: '119',
    dagNoBn: '১১৯',
    khatianNo: '1222',
    khatianNoBn: '১২২২',
    mouzaBn: 'বিরুলিয়া',
    jlNo: '১২',
    sheetNo: '০১',
    landClassBn: 'চালা (উঁচু জমি)',
    areaDecimal: 15.0,
    areaKatha: 9.1,
    zoningCategory: 'কৃষি সুরক্ষা জোন',
    zoningColor: '#a7f3d0',
    ownerMasked: 'শহিদুল ইসলাম',
    nidMasked: '****৯৩২১',
    status: 'SAFE',
    statusLabelBn: 'নিষ্কণ্টক ও যাচাইকৃত',
    svgPath: 'M 620,565 L 800,570 L 790,755 L 610,750 Z',
    labelCoord: { x: 705, y: 655 },
  },
  {
    id: 20,
    dagNo: '120',
    dagNoBn: '১২০',
    khatianNo: '1223',
    khatianNoBn: '১২২৩',
    mouzaBn: 'বিরুলিয়া',
    jlNo: '১২',
    sheetNo: '০১',
    landClassBn: 'ভিটা (আবাসিক)',
    areaDecimal: 19.5,
    areaKatha: 11.8,
    zoningCategory: 'পরিকল্পিত আবাসন জোন',
    zoningColor: '#fde68a',
    ownerMasked: 'আনোয়ার হোসেন ও শরিক',
    nidMasked: '****৪৫৬৭',
    status: 'SALE_LOCKED',
    statusLabelBn: 'মালিক কর্তৃক বিক্রয় লক',
    svgPath: 'M 800,570 L 930,575 L 920,760 L 790,755 Z',
    labelCoord: { x: 860, y: 660 },
  },
];

// F15: Cadastral parcels for the four additional mouzas. These are
// district-level representative tiles used by the cascading
// division -> district -> upazila -> mouza selector.
const DHAMRAI_PARCELS: CadastralParcel[] = [
  { id: 101, dagNo: '201', dagNoBn: '২০১', khatianNo: '3204', khatianNoBn: '৩২০৪', mouzaBn: 'ধামরাই', jlNo: '২৫', sheetNo: '০৩', landClassBn: 'ভিটা (আবাসিক)', areaDecimal: 18.0, areaKatha: 10.9, zoningCategory: 'পরিকল্পিত আবাসন জোন', zoningColor: '#fde68a', ownerMasked: 'মোঃ আব্দুল হাকিম', nidMasked: '****৪৫১২', status: 'FOR_SALE', statusLabelBn: 'বিক্রির জন্য সক্রিয়', askingPriceBdt: 3800000, svgPath: 'M 40,40 L 220,50 L 240,210 L 50,190 Z', labelCoord: { x: 130, y: 125 } },
  { id: 102, dagNo: '202', dagNoBn: '২০২', khatianNo: '3205', khatianNoBn: '৩২০৫', mouzaBn: 'ধামরাই', jlNo: '২৫', sheetNo: '০৩', landClassBn: 'নাল (কৃষি)', areaDecimal: 22.0, areaKatha: 13.3, zoningCategory: 'কৃষি সুরক্ষা জোন', zoningColor: '#a7f3d0', ownerMasked: 'মোছাম্মৎ সালমা বেগম', nidMasked: '****৭৮২৩', status: 'SAFE', statusLabelBn: 'নিষ্কণ্টক ও যাচাইকৃত', askingPriceBdt: 0, svgPath: 'M 220,50 L 420,35 L 440,200 L 240,210 Z', labelCoord: { x: 330, y: 120 } },
  { id: 103, dagNo: '203', dagNoBn: '২০৩', khatianNo: '3206', khatianNoBn: '৩২০৬', mouzaBn: 'ধামরাই', jlNo: '২৫', sheetNo: '০৩', landClassBn: 'পুকুর (জলাশয়)', areaDecimal: 12.0, areaKatha: 7.3, zoningCategory: 'জলাশয় সুরক্ষা জোন', zoningColor: '#bae6fd', ownerMasked: 'মোঃ শাহজাহান আলী', nidMasked: '****৯০১৭', status: 'SAFE', statusLabelBn: 'নিষ্কণ্টক ও যাচাইকৃত', askingPriceBdt: 0, svgPath: 'M 420,35 L 610,60 L 600,220 L 440,200 Z', labelCoord: { x: 515, y: 125 } },
  { id: 104, dagNo: '204', dagNoBn: '২০৪', khatianNo: '3207', khatianNoBn: '৩২০৭', mouzaBn: 'ধামরাই', jlNo: '২৫', sheetNo: '০৩', landClassBn: 'বাগান', areaDecimal: 17.5, areaKatha: 10.6, zoningCategory: 'বনায়ন ও সবুজ বেষ্টনী', zoningColor: '#bbf7d0', ownerMasked: 'মোঃ রহিম উদ্দিন', nidMasked: '****৩৩৪৫', status: 'FOR_SALE', statusLabelBn: 'বিক্রির জন্য সক্রিয়', askingPriceBdt: 2900000, svgPath: 'M 610,60 L 800,45 L 820,210 L 600,220 Z', labelCoord: { x: 705, y: 130 } },
  { id: 105, dagNo: '205', dagNoBn: '২০৫', khatianNo: '3208', khatianNoBn: '৩২০৮', mouzaBn: 'ধামরাই', jlNo: '২৫', sheetNo: '০৩', landClassBn: 'ভিটা (আবাসিক)', areaDecimal: 14.0, areaKatha: 8.5, zoningCategory: 'পরিকল্পিত আবাসন জোন', zoningColor: '#fde68a', ownerMasked: 'মোঃ নুরুল ইসলাম', nidMasked: '****৫৫৬৭', status: 'SAFE', statusLabelBn: 'নিষ্কণ্টক ও যাচাইকৃত', askingPriceBdt: 0, svgPath: 'M 40,260 L 220,250 L 240,420 L 50,410 Z', labelCoord: { x: 130, y: 335 } },
];

const KERANIGANJ_PARCELS: CadastralParcel[] = [
  { id: 201, dagNo: '301', dagNoBn: '৩০১', khatianNo: '4501', khatianNoBn: '৪৫০১', mouzaBn: 'কেরানীগঞ্জ', jlNo: '৩০', sheetNo: '০৪', landClassBn: 'ভিটা (আবাসিক)', areaDecimal: 12.5, areaKatha: 7.6, zoningCategory: 'পরিকল্পিত আবাসন জোন', zoningColor: '#fde68a', ownerMasked: 'মোঃ মনিরুল ইসলাম', nidMasked: '****৬৬৭৮', status: 'FOR_SALE', statusLabelBn: 'বিক্রির জন্য সক্রিয়', askingPriceBdt: 5200000, svgPath: 'M 40,40 L 220,50 L 240,210 L 50,190 Z', labelCoord: { x: 130, y: 125 } },
  { id: 202, dagNo: '302', dagNoBn: '৩০২', khatianNo: '4502', khatianNoBn: '৪৫০২', mouzaBn: 'কেরানীগঞ্জ', jlNo: '৩০', sheetNo: '০৪', landClassBn: 'নাল (কৃষি)', areaDecimal: 28.0, areaKatha: 17.0, zoningCategory: 'কৃষি সুরক্ষা জোন', zoningColor: '#a7f3d0', ownerMasked: 'মোছাম্মৎ রহিমা খাতুন', nidMasked: '****৮৮৯৯', status: 'MORTGAGED', statusLabelBn: 'ডাচ-বাংলা ব্যাংক বন্ধক বিদ্যমান', askingPriceBdt: 0, svgPath: 'M 220,50 L 420,35 L 440,200 L 240,210 Z', labelCoord: { x: 330, y: 120 } },
  { id: 203, dagNo: '303', dagNoBn: '৩০৩', khatianNo: '4503', khatianNoBn: '৪৫০৩', mouzaBn: 'কেরানীগঞ্জ', jlNo: '৩০', sheetNo: '০৪', landClassBn: 'বাণিজ্যিক', areaDecimal: 9.5, areaKatha: 5.7, zoningCategory: 'বাণিজ্যিক জোন', zoningColor: '#fed7aa', ownerMasked: 'মোঃ সাইফুল হক', nidMasked: '****২২৩৩', status: 'FOR_SALE', statusLabelBn: 'বিক্রির জন্য সক্রিয়', askingPriceBdt: 7100000, svgPath: 'M 420,35 L 610,60 L 600,220 L 440,200 Z', labelCoord: { x: 515, y: 125 } },
  { id: 204, dagNo: '304', dagNoBn: '৩০৪', khatianNo: '4504', khatianNoBn: '৪৫০৪', mouzaBn: 'কেরানীগঞ্জ', jlNo: '৩০', sheetNo: '০৪', landClassBn: 'পুকুর (জলাশয়)', areaDecimal: 19.0, areaKatha: 11.5, zoningCategory: 'জলাশয় সুরক্ষা জোন', zoningColor: '#bae6fd', ownerMasked: 'মোঃ আবুল কালাম', nidMasked: '****৪৪৫৫', status: 'SAFE', statusLabelBn: 'নিষ্কণ্টক ও যাচাইকৃত', askingPriceBdt: 0, svgPath: 'M 610,60 L 800,45 L 820,210 L 600,220 Z', labelCoord: { x: 705, y: 130 } },
  { id: 205, dagNo: '305', dagNoBn: '৩০৫', khatianNo: '4505', khatianNoBn: '৪৫০৫', mouzaBn: 'কেরানীগঞ্জ', jlNo: '৩০', sheetNo: '০৪', landClassBn: 'ভিটা (আবাসিক)', areaDecimal: 11.0, areaKatha: 6.6, zoningCategory: 'পরিকল্পিত আবাসন জোন', zoningColor: '#fde68a', ownerMasked: 'মোঃ জাহিদুল ইসলাম', nidMasked: '****৬৬৬৬', status: 'FOR_SALE', statusLabelBn: 'বিক্রির জন্য সক্রিয়', askingPriceBdt: 4800000, svgPath: 'M 40,260 L 220,250 L 240,420 L 50,410 Z', labelCoord: { x: 130, y: 335 } },
];

const TONGI_PARCELS: CadastralParcel[] = [
  { id: 301, dagNo: '401', dagNoBn: '৪০১', khatianNo: '5601', khatianNoBn: '৫৬০১', mouzaBn: 'টঙ্গী', jlNo: '৩৫', sheetNo: '০৫', landClassBn: 'বাণিজ্যিক', areaDecimal: 8.0, areaKatha: 4.8, zoningCategory: 'বাণিজ্যিক জোন', zoningColor: '#fed7aa', ownerMasked: 'মোঃ ফারুক হোসেন', nidMasked: '****৭৭৮৮', status: 'FOR_SALE', statusLabelBn: 'বিক্রির জন্য সক্রিয়', askingPriceBdt: 12500000, svgPath: 'M 40,40 L 220,50 L 240,210 L 50,190 Z', labelCoord: { x: 130, y: 125 } },
  { id: 302, dagNo: '402', dagNoBn: '৪০২', khatianNo: '5602', khatianNoBn: '৫৬০২', mouzaBn: 'টঙ্গী', jlNo: '৩৫', sheetNo: '০৫', landClassBn: 'শিল্প এলাকা', areaDecimal: 35.0, areaKatha: 21.2, zoningCategory: 'শিল্প জোন', zoningColor: '#e9d5ff', ownerMasked: 'মোছাম্মৎ শাহিনা আক্তার', nidMasked: '****৮৮৯৯', status: 'FOR_SALE', statusLabelBn: 'বিক্রির জন্য সক্রিয়', askingPriceBdt: 18700000, svgPath: 'M 220,50 L 420,35 L 440,200 L 240,210 Z', labelCoord: { x: 330, y: 120 } },
  { id: 303, dagNo: '403', dagNoBn: '৪০৩', khatianNo: '5603', khatianNoBn: '৫৬০৩', mouzaBn: 'টঙ্গী', jlNo: '৩৫', sheetNo: '০৫', landClassBn: 'ভিটা (আবাসিক)', areaDecimal: 13.5, areaKatha: 8.2, zoningCategory: 'পরিকল্পিত আবাসন জোন', zoningColor: '#fde68a', ownerMasked: 'মোঃ কামাল হোসেন', nidMasked: '****৯৯০১', status: 'SAFE', statusLabelBn: 'নিষ্কণ্টক ও যাচাইকৃত', askingPriceBdt: 0, svgPath: 'M 420,35 L 610,60 L 600,220 L 440,200 Z', labelCoord: { x: 515, y: 125 } },
  { id: 304, dagNo: '404', dagNoBn: '৪০৪', khatianNo: '5604', khatianNoBn: '৫৬০৪', mouzaBn: 'টঙ্গী', jlNo: '৩৫', sheetNo: '০৫', landClassBn: 'নাল (কৃষি)', areaDecimal: 21.0, areaKatha: 12.7, zoningCategory: 'কৃষি সুরক্ষা জোন', zoningColor: '#a7f3d0', ownerMasked: 'মোঃ সেলিম রেজা', nidMasked: '****১১২২', status: 'FOR_SALE', statusLabelBn: 'বিক্রির জন্য সক্রিয়', askingPriceBdt: 3500000, svgPath: 'M 610,60 L 800,45 L 820,210 L 600,220 Z', labelCoord: { x: 705, y: 130 } },
  { id: 305, dagNo: '405', dagNoBn: '৪০৫', khatianNo: '5605', khatianNoBn: '৫৬০৫', mouzaBn: 'টঙ্গী', jlNo: '৩৫', sheetNo: '০৫', landClassBn: 'বাণিজ্যিক', areaDecimal: 6.5, areaKatha: 3.9, zoningCategory: 'বাণিজ্যিক জোন', zoningColor: '#fed7aa', ownerMasked: 'মোঃ ইউনুস আলী', nidMasked: '****৩৩৪৪', status: 'SAFE', statusLabelBn: 'নিষ্কণ্টক ও যাচাইকৃত', askingPriceBdt: 0, svgPath: 'M 40,260 L 220,250 L 240,420 L 50,410 Z', labelCoord: { x: 130, y: 335 } },
];

const NARSINGDI_PARCELS: CadastralParcel[] = [
  { id: 401, dagNo: '501', dagNoBn: '৫০১', khatianNo: '6701', khatianNoBn: '৬৭০১', mouzaBn: 'নরসিংদী সদর', jlNo: '৪০', sheetNo: '০৬', landClassBn: 'নদীর ধার', areaDecimal: 16.0, areaKatha: 9.7, zoningCategory: 'নদী তীর সুরক্ষা জোন', zoningColor: '#bae6fd', ownerMasked: 'মোঃ আনোয়ার হোসেন', nidMasked: '****৫৫৬৬', status: 'SAFE', statusLabelBn: 'নিষ্কণ্টক ও যাচাইকৃত', askingPriceBdt: 0, svgPath: 'M 40,40 L 220,50 L 240,210 L 50,190 Z', labelCoord: { x: 130, y: 125 } },
  { id: 402, dagNo: '502', dagNoBn: '৫০২', khatianNo: '6702', khatianNoBn: '৬৭০২', mouzaBn: 'নরসিংদী সদর', jlNo: '৪০', sheetNo: '০৬', landClassBn: 'ভিটা (আবাসিক)', areaDecimal: 19.0, areaKatha: 11.5, zoningCategory: 'পরিকল্পিত আবাসন জোন', zoningColor: '#fde68a', ownerMasked: 'মোছাম্মৎ নাজনীন আক্তার', nidMasked: '****৭৭৮৮', status: 'FOR_SALE', statusLabelBn: 'বিক্রির জন্য সক্রিয়', askingPriceBdt: 4200000, svgPath: 'M 220,50 L 420,35 L 440,200 L 240,210 Z', labelCoord: { x: 330, y: 120 } },
  { id: 403, dagNo: '503', dagNoBn: '৫০৩', khatianNo: '6703', khatianNoBn: '৬৭০৩', mouzaBn: 'নরসিংদী সদর', jlNo: '৪০', sheetNo: '০৬', landClassBn: 'নাল (কৃষি)', areaDecimal: 26.5, areaKatha: 16.1, zoningCategory: 'কৃষি সুরক্ষা জোন', zoningColor: '#a7f3d0', ownerMasked: 'মোঃ সামসুল হক', nidMasked: '****৮৮৯৯', status: 'MORTGAGED', statusLabelBn: 'ব্র্যাক ব্যাংক বন্ধক বিদ্যমান', askingPriceBdt: 0, svgPath: 'M 420,35 L 610,60 L 600,220 L 440,200 Z', labelCoord: { x: 515, y: 125 } },
  { id: 404, dagNo: '504', dagNoBn: '৫০৪', khatianNo: '6704', khatianNoBn: '৬৭০৪', mouzaBn: 'নরসিংদী সদর', jlNo: '৪০', sheetNo: '০৬', landClassBn: 'বাগান', areaDecimal: 14.5, areaKatha: 8.8, zoningCategory: 'বনায়ন ও সবুজ বেষ্টনী', zoningColor: '#bbf7d0', ownerMasked: 'মোঃ জসিম উদ্দিন', nidMasked: '****৯৯০০', status: 'FOR_SALE', statusLabelBn: 'বিক্রির জন্য সক্রিয়', askingPriceBdt: 2400000, svgPath: 'M 610,60 L 800,45 L 820,210 L 600,220 Z', labelCoord: { x: 705, y: 130 } },
  { id: 405, dagNo: '505', dagNoBn: '৫০৫', khatianNo: '6705', khatianNoBn: '৬৭০৫', mouzaBn: 'নরসিংদী সদর', jlNo: '৪০', sheetNo: '০৬', landClassBn: 'পুকুর (জলাশয়)', areaDecimal: 10.0, areaKatha: 6.1, zoningCategory: 'জলাশয় সুরক্ষা জোন', zoningColor: '#bae6fd', ownerMasked: 'মোঃ হাবিবুর রহমান', nidMasked: '****১২৩৪', status: 'SAFE', statusLabelBn: 'নিষ্কণ্টক ও যাচাইকৃত', askingPriceBdt: 0, svgPath: 'M 40,260 L 220,250 L 240,420 L 50,410 Z', labelCoord: { x: 130, y: 335 } },
];

const MOUZA_PARCELS: Record<string, CadastralParcel[]> = {
  'বিরুলিয়া': BIRULIA_PARCELS,
  'ধামরাই': DHAMRAI_PARCELS,
  'কেরানীগঞ্জ': KERANIGANJ_PARCELS,
  'টঙ্গী': TONGI_PARCELS,
  'নরসিংদী সদর': NARSINGDI_PARCELS,
};

const AVAILABLE_MOUZAS = Object.keys(MOUZA_PARCELS);

export const CadastralMapPage: React.FC<CadastralMapPageProps> = ({ onNavigate }) => {
  const { t, lang, formatNumber } = useAppUI();

  // Cascading Selection State
  const [selectedDivision, setSelectedDivision] = useState<string>('ঢাকা');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ঢাকা');
  const [selectedUpazila, setSelectedUpazila] = useState<string>('সাভার');
  const [selectedMouza, setSelectedMouza] = useState<string>('বিরুলিয়া (JL-12)');
  const [selectedSheet, setSelectedSheet] = useState<string>('০১');
  const [selectedPlotDag, setSelectedPlotDag] = useState<string>('১০১');

  // Map Controls State
  const [searchMenuOpen, setSearchMenuOpen] = useState<boolean>(true);
  const [activeLayer, setActiveLayer] = useState<'cadastral' | 'zoning' | 'satellite' | 'trust'>('cadastral');
  const [selectedPlot, setSelectedPlot] = useState<CadastralParcel | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Floating Right Drawer State
  const [importantLinksOpen, setImportantLinksOpen] = useState<boolean>(false);

  // Modals State
  const [landUseModalOpen, setLandUseModalOpen] = useState<boolean>(false);
  const [zoningModalOpen, setZoningModalOpen] = useState<boolean>(false);
  const [projectInfoModalOpen, setProjectInfoModalOpen] = useState<boolean>(false);
  const [measureModalOpen, setMeasureModalOpen] = useState<boolean>(false);

  // Dynamic Cursor Coordinates Tracker
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number }>({
    lat: 23.8587,
    lng: 90.3181,
  });

  const svgRef = useRef<SVGSVGElement>(null);

  // Cascading options derived from ADMIN_DATA
  const divisionList = Object.keys(ADMIN_DATA);
  const districtList = selectedDivision && ADMIN_DATA[selectedDivision] ? Object.keys(ADMIN_DATA[selectedDivision]) : [];
  const upazilaList =
    selectedDivision && selectedDistrict && ADMIN_DATA[selectedDivision]?.[selectedDistrict]
      ? Object.keys(ADMIN_DATA[selectedDivision][selectedDistrict])
      : [];
  const mouzaList =
    selectedDivision && selectedDistrict && selectedUpazila && ADMIN_DATA[selectedDivision]?.[selectedDistrict]?.[selectedUpazila]
      ? Object.keys(ADMIN_DATA[selectedDivision][selectedDistrict][selectedUpazila])
      : [];

  // F15: resolve the active mouza's parcels. The selectedMouza state holds
  // keys like "বিরুলিয়া (JL-12)" — strip the parenthesised suffix to match
  // MOUZA_PARCELS keys, and fall back to Birulia.
  const activeMouzaKey = useMemo(() => {
    const stripped = selectedMouza.split('(')[0].trim();
    return MOUZA_PARCELS[stripped] ? stripped : 'বিরুলিয়া';
  }, [selectedMouza]);
  const activeParcels: CadastralParcel[] = MOUZA_PARCELS[activeMouzaKey] || BIRULIA_PARCELS;

  const currentMouzaMeta =
    selectedDivision && selectedDistrict && selectedUpazila && selectedMouza
      ? ADMIN_DATA[selectedDivision]?.[selectedDistrict]?.[selectedUpazila]?.[selectedMouza]
      : null;

  const sheetList = currentMouzaMeta?.sheets || ['০১'];

  // Handle cascading dropdown updates
  const handleDivisionChange = (div: string) => {
    setSelectedDivision(div);
    const districts = Object.keys(ADMIN_DATA[div] || {});
    const firstDist = districts[0] || '';
    setSelectedDistrict(firstDist);

    const upazilas = Object.keys(ADMIN_DATA[div]?.[firstDist] || {});
    const firstUpazila = upazilas[0] || '';
    setSelectedUpazila(firstUpazila);

    const mouzas = Object.keys(ADMIN_DATA[div]?.[firstDist]?.[firstUpazila] || {});
    const firstMouza = mouzas[0] || '';
    setSelectedMouza(firstMouza);
  };

  const handleDistrictChange = (dist: string) => {
    setSelectedDistrict(dist);
    const upazilas = Object.keys(ADMIN_DATA[selectedDivision]?.[dist] || {});
    const firstUpazila = upazilas[0] || '';
    setSelectedUpazila(firstUpazila);

    const mouzas = Object.keys(ADMIN_DATA[selectedDivision]?.[dist]?.[firstUpazila] || {});
    const firstMouza = mouzas[0] || '';
    setSelectedMouza(firstMouza);
  };

  const handleUpazilaChange = (up: string) => {
    setSelectedUpazila(up);
    const mouzas = Object.keys(ADMIN_DATA[selectedDivision]?.[selectedDistrict]?.[up] || {});
    const firstMouza = mouzas[0] || '';
    setSelectedMouza(firstMouza);
  };

  // Locate and focus on a specific Dag/Plot
  const handleSearchPlot = () => {
    const found = activeParcels.find((p) => p.dagNoBn === selectedPlotDag || p.dagNo === selectedPlotDag);
    if (found) {
      setSelectedPlot(found);
      // Smoothly pan towards the parcel
      const targetX = 500 - found.labelCoord.x;
      const targetY = 400 - found.labelCoord.y;
      setPanOffset({ x: targetX * 0.4, y: targetY * 0.4 });
      setZoomLevel(1.5);
    }
  };

  const handleReset = () => {
    setSelectedDivision('ঢাকা');
    setSelectedDistrict('ঢাকা');
    setSelectedUpazila('সাভার');
    setSelectedMouza('বিরুলিয়া (JL-12)');
    setSelectedSheet('০১');
    setSelectedPlotDag('১০১');
    setSelectedPlot(MOUZA_PARCELS['বিরুলিয়া'][0]);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.3, 3.5));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.3, 0.8));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Pan handlers on Map Canvas
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }

    // Update coordinates tracker
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width;
      const relY = (e.clientY - rect.top) / rect.height;
      const baseLat = currentMouzaMeta?.center.lat || 23.8587;
      const baseLng = currentMouzaMeta?.center.lng || 90.3181;
      setCursorCoords({
        lat: parseFloat((baseLat + (0.5 - relY) * 0.008).toFixed(5)),
        lng: parseFloat((baseLng + (relX - 0.5) * 0.008).toFixed(5)),
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="w-full min-h-screen bg-[#f0fff0] flex flex-col font-sans select-none overflow-x-hidden text-slate-800">
      {/* =====================================================================
          1. TOP NAVIGATION BANNER (Exact map.land.gov.bd style)
          Gradient: linear-gradient(90deg, #94BAA1 0%, #265E35 48%, #95C4A7 100%)
          ===================================================================== */}
      <header
        className="relative z-30 text-white shadow-md border-b border-emerald-800/40"
        style={{
          background: 'linear-gradient(90deg, rgba(148, 186, 161, 1) 0%, rgba(38, 94, 53, 1) 48%, rgba(149, 196, 167, 1) 100%)',
        }}
      >
        <div className="w-full px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Project Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center p-1 border border-emerald-200 shrink-0">
              {/* Bangladesh Govt Seal representation */}
              <div className="w-8 h-8 rounded-full bg-[#006A4E] flex items-center justify-center text-white text-[10px] font-black tracking-tighter">
                <span className="text-amber-300 text-xs">★</span>ভূ
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white drop-shadow-xs">
                  {t('স্মার্ট ভূমি নকশা — ডিজিটাল ক্যাডাস্ট্রাল ম্যাপ', 'Smart Bhumi Naksha — Digital Cadastral Map')}
                </h1>
                <span className="hidden md:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-emerald-950 uppercase tracking-wide">
                  {t('জাতীয় পোর্টাল', 'National Portal')}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-emerald-100 font-medium">
                {t(
                  'মৌজা ও প্লটভিত্তিক জাতীয় ডিজিটাল ভূমি জোনিং প্রকল্প • ভূমি মন্ত্রণালয়',
                  'Mouza and Plot Based National Digital Land Zoning Project • Ministry of Land'
                )}
              </p>
            </div>
          </div>

          {/* Top Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 text-xs font-semibold">
            <button
              onClick={() => {}}
              className="px-3 py-1.5 rounded-lg bg-emerald-900/60 text-white font-bold border border-emerald-500/40 cursor-pointer shadow-xs"
            >
              {t('জমির মানচিত্র', 'Land Map')}
            </button>
            <button
              onClick={() => setProjectInfoModalOpen(true)}
              className="px-3 py-1.5 rounded-lg hover:bg-emerald-900/40 text-emerald-50 hover:text-white transition cursor-pointer"
            >
              {t('প্রকল্পের উদ্দেশ্য', 'Project Objectives')}
            </button>
            <button
              onClick={() => setProjectInfoModalOpen(true)}
              className="px-3 py-1.5 rounded-lg hover:bg-emerald-900/40 text-emerald-50 hover:text-white transition cursor-pointer"
            >
              {t('আমাদের সম্পর্কে', 'About Us')}
            </button>
            <button
              onClick={() => setMeasureModalOpen(true)}
              className="px-3 py-1.5 rounded-lg hover:bg-emerald-900/40 text-emerald-50 hover:text-white transition cursor-pointer"
            >
              {t('পরিমাপ নির্দেশিকা', 'Measurement Guide')}
            </button>
            <button
              onClick={() => onNavigate?.('help')}
              className="px-3 py-1.5 rounded-lg hover:bg-emerald-900/40 text-emerald-50 hover:text-white transition cursor-pointer"
            >
              {t('প্রশ্নোত্তর ও সহায়তা', 'FAQ & Help')}
            </button>
          </nav>

          {/* Right Action / Hotline */}
          <div className="flex items-center gap-2">
            <a
              href="tel:16122"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/70 hover:bg-emerald-950 text-white text-xs font-bold border border-emerald-600/50 transition"
              title="ভূমি সেবা হটলাইন ১৬১২২"
            >
              <Phone className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>১৬১২২</span>
            </a>

            <button
              onClick={() => onNavigate?.('landing')}
              className="px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-emerald-900 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ArrowRight className="w-3.5 h-3.5 text-[#006A4E]" />
              <span>{t('মূল সেবা পোর্টালে যান', 'BhumiShield Portal')}</span>
            </button>
          </div>
        </div>

        {/* Marquee Ticker (Official Land Zoning Alert) */}
        <div className="bg-[#075f24] text-emerald-100 text-[11px] sm:text-xs py-1 px-4 border-t border-emerald-700/50 flex items-center overflow-hidden">
          <span className="font-extrabold text-amber-300 bg-emerald-950 px-2 py-0.5 rounded mr-3 shrink-0 uppercase tracking-wider text-[10px]">
            {t('বিজ্ঞপ্তি', 'Notice')}
          </span>
          <div className="truncate whitespace-nowrap animate-marquee">
            {t(
              'মৌজা ও প্লটভিত্তিক জাতীয় ডিজিটাল ভূমি জোনিং প্রকল্পের আওতায় ডিজিটাল ক্যাডাস্ট্রাল ম্যাপ ও ভূমি ব্যবহারের তথ্য প্রদর্শিত হচ্ছে। ভূমি সংক্রান্ত যে কোনো তথ্যের জন্য ১৬১২২ নম্বরে কল করুন (দিন-রাত ২৪ ঘণ্টা)। ফসলি জমিতে অননুমোদিত আবাসন ও শিল্পায়ন আইনত দণ্ডনীয়।',
              'Digital cadastral maps and land zoning attributes are displayed under the National Digital Land Zoning Project. For land assistance call 16122 (24/7). Unauthorized conversion of agricultural land is prohibited.'
            )}
          </div>
        </div>
      </header>

      {/* =====================================================================
          2. MAIN GIS MAP VIEWPORT WITH FLOATING OVERLAYS
          ===================================================================== */}
      <div className="relative flex-1 w-full h-[calc(100vh-140px)] min-h-[640px] bg-[#f0fff0] overflow-hidden">
        {/* Floating Left Overlay: অনুসন্ধান মেনু (Search Menu) */}
        <aside
          className={`absolute top-4 left-4 z-20 bg-white/98 backdrop-blur-md rounded-2xl shadow-xl border border-emerald-900/20 transition-all duration-300 flex ${
            searchMenuOpen ? 'w-80 sm:w-88' : 'w-11'
          }`}
          style={{ maxHeight: 'calc(100% - 32px)' }}
        >
          {/* Expanded Menu Body */}
          {searchMenuOpen ? (
            <div className="flex-1 p-4 flex flex-col justify-between overflow-y-auto space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-[#006A4E]">
                    <Search className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900 leading-tight">
                      {t('অনুসন্ধান মেনু', 'Search Menu')}
                    </h2>
                    <span className="text-[10px] text-slate-500 font-medium block">
                      {t('মৌজা ও প্লটভিত্তিক ডিজিটাল জোনিং', 'Mouza & Plot Digital Zoning')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSearchMenuOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition"
                  title={t('মেনু সংক্ষেপ করুন', 'Collapse Menu')}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>

              {/* Form Controls (Cascading Hierarchy) */}
              <div className="space-y-2.5 text-xs">
                {/* 1. Division */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t('১. বিভাগ (Division)', '1. Division')}
                  </label>
                  <select
                    value={selectedDivision}
                    onChange={(e) => handleDivisionChange(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-semibold focus:ring-2 focus:ring-[#006A4E] focus:outline-none cursor-pointer"
                  >
                    {divisionList.map((div) => (
                      <option key={div} value={div}>
                        {div}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. District */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t('২. জেলা (District)', '2. District')}
                  </label>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-semibold focus:ring-2 focus:ring-[#006A4E] focus:outline-none cursor-pointer"
                  >
                    {districtList.map((dist) => (
                      <option key={dist} value={dist}>
                        {dist}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Upazila */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t('৩. থানা / উপজেলা (Thana / Upazila)', '3. Thana / Upazila')}
                  </label>
                  <select
                    value={selectedUpazila}
                    onChange={(e) => handleUpazilaChange(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-semibold focus:ring-2 focus:ring-[#006A4E] focus:outline-none cursor-pointer"
                  >
                    {upazilaList.map((up) => (
                      <option key={up} value={up}>
                        {up}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Mouza */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t('৪. মৌজা (Mouza)', '4. Mouza')}
                  </label>
                  <select
                    value={selectedMouza}
                    onChange={(e) => setSelectedMouza(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-semibold focus:ring-2 focus:ring-[#006A4E] focus:outline-none cursor-pointer"
                  >
                    {mouzaList.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 5. Sheet & Dag Row */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {t('৫. সিট নং (Sheet)', '5. Sheet No')}
                    </label>
                    <select
                      value={selectedSheet}
                      onChange={(e) => setSelectedSheet(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-semibold focus:ring-2 focus:ring-[#006A4E] focus:outline-none cursor-pointer"
                    >
                      {sheetList.map((sh) => (
                        <option key={sh} value={sh}>
                          সিট-{sh}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {t('৬. প্লট / দাগ নং', '6. Plot / Dag')}
                    </label>
                    <select
                      value={selectedPlotDag}
                      onChange={(e) => setSelectedPlotDag(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-semibold focus:ring-2 focus:ring-[#006A4E] focus:outline-none cursor-pointer"
                    >
                      {activeParcels.map((p) => (
                        <option key={p.id} value={p.dagNoBn}>
                          দাগ {p.dagNoBn}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons: 1. Land Use Summary, 2. Land Zoning Summary */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                {/* 1. ভূমি ব্যবহারের সারাংশ (Button with #6B9080 color like map.land.gov.bd) */}
                <button
                  type="button"
                  onClick={() => setLandUseModalOpen(true)}
                  className="w-full py-2.5 px-3 rounded-xl text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:opacity-95"
                  style={{ backgroundColor: '#6B9080' }}
                >
                  <PieChart className="w-4 h-4 text-emerald-100" />
                  <span>{t('ভূমি ব্যবহারের সারাংশ', 'Land Use Summary')}</span>
                </button>

                {/* 2. ভূমি জোনিং সারাংশ (Button with #ffc107 / amber color like map.land.gov.bd) */}
                <button
                  type="button"
                  onClick={() => setZoningModalOpen(true)}
                  className="w-full py-2.5 px-3 rounded-xl text-emerald-950 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:opacity-95"
                  style={{ backgroundColor: '#ffc107' }}
                >
                  <Layers className="w-4 h-4 text-emerald-900" />
                  <span>{t('ভূমি জোনিং সারাংশ', 'Land Zoning Summary')}</span>
                </button>

                {/* Search & Reset */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSearchPlot}
                    className="col-span-2 py-2 px-3 bg-[#006A4E] hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{t('দাগে যান', 'Go to Plot')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
                    title={t('রিসেট করুন', 'Reset')}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('রিসেট', 'Reset')}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Collapsed Tab */
            <button
              onClick={() => setSearchMenuOpen(true)}
              className="w-full py-4 flex flex-col items-center justify-start text-[#006A4E] hover:bg-emerald-50 rounded-2xl cursor-pointer gap-2 transition"
              title={t('অনুসন্ধান মেনু খুলুন', 'Open Search Menu')}
            >
              <ChevronRight className="w-5 h-5 text-[#006A4E]" />
              <Search className="w-4 h-4" />
              <span className="text-[10px] font-extrabold writing-vertical tracking-wider">
                {t('অনুসন্ধান', 'SEARCH')}
              </span>
            </button>
          )}
        </aside>

        {/* Floating Right Overlay: "গুরুত্বপূর্ণ লিঙ্ক" (Important Links) */}
        <div className="absolute top-4 right-4 z-20 flex flex-col items-end">
          <button
            onClick={() => setImportantLinksOpen(!importantLinksOpen)}
            className="px-3.5 py-2 rounded-xl bg-white/95 text-slate-800 text-xs font-extrabold shadow-lg border border-emerald-900/20 hover:bg-emerald-50 transition flex items-center gap-2 cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-[#006A4E]" />
            <span>{t('গুরুত্বপূর্ণ লিঙ্ক', 'Important Links')}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${importantLinksOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Expanded Important Links Cards */}
          {importantLinksOpen && (
            <div className="mt-2 w-72 bg-white/98 backdrop-blur-md rounded-2xl shadow-xl border border-emerald-900/20 p-3 space-y-2 text-xs">
              <a
                href="https://minland.gov.bd"
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 flex items-center justify-between text-slate-800 hover:text-[#006A4E] transition"
              >
                <div>
                  <strong className="block font-bold">ভূমি মন্ত্রণালয় (MinLand)</strong>
                  <span className="text-[10px] text-slate-500 font-mono">minland.gov.bd</span>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </a>

              <a
                href="https://mutation.land.gov.bd"
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 flex items-center justify-between text-slate-800 hover:text-[#006A4E] transition"
              >
                <div>
                  <strong className="block font-bold">ই-নামজারি ও মিউটেশন</strong>
                  <span className="text-[10px] text-slate-500 font-mono">mutation.land.gov.bd</span>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </a>

              <a
                href="https://eporcha.gov.bd"
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 flex items-center justify-between text-slate-800 hover:text-[#006A4E] transition"
              >
                <div>
                  <strong className="block font-bold">ডিজিটাল রেকর্ড রুম (ই-পর্চা)</strong>
                  <span className="text-[10px] text-slate-500 font-mono">eporcha.gov.bd</span>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </a>

              <div
                onClick={() => onNavigate?.('check')}
                className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-between text-[#006A4E] font-bold cursor-pointer transition"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#006A4E]" />
                  <div>
                    <span className="block">ভূমি সুরক্ষা (BhumiShield)</span>
                    <span className="text-[10px] text-emerald-700 font-normal">৯-ধাপের ফ্রড অডিট ইঞ্জিন</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#006A4E]" />
              </div>
            </div>
          )}
        </div>

        {/* Floating Layer Switcher (Top Right below Important Links) */}
        <div className="absolute top-16 right-4 z-20 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200 p-2 text-xs flex flex-col gap-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-2 pt-1">
            {t('ম্যাপ লেয়ার', 'Map Layers')}
          </span>

          <button
            onClick={() => setActiveLayer('cadastral')}
            className={`px-3 py-1.5 rounded-xl text-left font-bold flex items-center gap-2 cursor-pointer transition ${
              activeLayer === 'cadastral'
                ? 'bg-[#006A4E] text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t('মৌজা নকশা (Cadastral)', 'Cadastral Sheet')}</span>
          </button>

          <button
            onClick={() => setActiveLayer('zoning')}
            className={`px-3 py-1.5 rounded-xl text-left font-bold flex items-center gap-2 cursor-pointer transition ${
              activeLayer === 'zoning'
                ? 'bg-[#ffc107] text-emerald-950 shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{t('ভূমি জোনিং (Land Zoning)', 'Digital Zoning')}</span>
          </button>

          <button
            onClick={() => setActiveLayer('satellite')}
            className={`px-3 py-1.5 rounded-xl text-left font-bold flex items-center gap-2 cursor-pointer transition ${
              activeLayer === 'satellite'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{t('স্যাটেলাইট ভিউ (Satellite)', 'Satellite View')}</span>
          </button>

          <button
            onClick={() => setActiveLayer('trust')}
            className={`px-3 py-1.5 rounded-xl text-left font-bold flex items-center gap-2 cursor-pointer transition ${
              activeLayer === 'trust'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
            <span>{t('ভূমি সুরক্ষা ট্রাস্ট ও ঝুঁকি', 'BhumiShield Trust')}</span>
          </button>
        </div>

        {/* Floating Zoom & Map Controls (Bottom Right) */}
        <div className="absolute bottom-10 right-4 z-20 flex flex-col gap-2">
          {/* Compass / North Arrow */}
          <div
            className="w-10 h-10 rounded-xl bg-white shadow-md border border-slate-200 flex flex-col items-center justify-center text-slate-700 font-extrabold text-[10px]"
            title={t('উত্তর দিক নির্দেশক (North)', 'North Arrow')}
          >
            <span className="text-rose-600 font-black">▲ N</span>
            <span className="text-[9px] text-slate-400">উ</span>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden flex flex-col divide-y divide-slate-100">
            <button
              onClick={handleZoomIn}
              className="p-2.5 hover:bg-slate-100 text-slate-700 cursor-pointer transition"
              title={t('জুম ইন (+)', 'Zoom In')}
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2.5 hover:bg-slate-100 text-slate-700 cursor-pointer transition"
              title={t('জুম আউট (-)', 'Zoom Out')}
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-2.5 hover:bg-slate-100 text-slate-700 cursor-pointer transition"
              title={t('রিসেট ভিউ', 'Reset View')}
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Floating Map Legend & Scale Bar (Bottom Left) */}
        <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center gap-4 bg-white/95 backdrop-blur-md px-4 py-2 rounded-xl shadow-md border border-slate-200 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-[#006A4E]" />
            <span className="font-bold">
              {selectedMouza} • সিট-{selectedSheet}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-300" />

          {/* Scale Bar Representation */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500 font-mono">০</span>
            <div className="w-16 h-2 border-b-2 border-l-2 border-r-2 border-slate-800 relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold">
                ১০০ মি.
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">২০০ মি.</span>
          </div>

          <div className="h-4 w-px bg-slate-300" />

          {/* Dynamic Coordinate Tracker */}
          <div className="text-[10px] font-mono text-slate-500">
            <span>
              {cursorCoords.lat}° N, {cursorCoords.lng}° E
            </span>
          </div>
        </div>

        {/* =====================================================================
            3. INTERACTIVE GIS SVG CADASRAL CANVAS
            Background: #f0fff0 (Authentic map.land.gov.bd tone)
            ===================================================================== */}
        <div
          className={`w-full h-full flex items-center justify-center cursor-grab ${
            isDragging ? 'cursor-grabbing' : ''
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{
            backgroundColor: activeLayer === 'satellite' ? '#1e293b' : '#f0fff0',
            backgroundImage:
              activeLayer === 'satellite'
                ? 'radial-gradient(#334155 1px, transparent 1px)'
                : 'radial-gradient(#c6e5d0 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
          <svg
            ref={svgRef}
            viewBox="0 0 1000 800"
            className="w-full h-full max-w-5xl transition-transform duration-75 ease-out"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
              transformOrigin: 'center center',
            }}
          >
            {/* Sheet Boundary Border (Cadastral Survey Margin) */}
            <rect
              x="20"
              y="20"
              width="960"
              height="760"
              fill={activeLayer === 'satellite' ? '#0f172a' : '#f9fef9'}
              stroke={activeLayer === 'satellite' ? '#475569' : '#1e3a24'}
              strokeWidth="4"
              strokeDasharray={activeLayer === 'satellite' ? '8 4' : 'none'}
              rx="12"
            />

            {/* Inner Technical Grid lines */}
            <line x1="20" y1="200" x2="980" y2="200" stroke="#d1fae5" strokeWidth="0.8" strokeDasharray="4 4" />
            <line x1="20" y1="380" x2="980" y2="380" stroke="#d1fae5" strokeWidth="0.8" strokeDasharray="4 4" />
            <line x1="20" y1="560" x2="980" y2="560" stroke="#d1fae5" strokeWidth="0.8" strokeDasharray="4 4" />
            <line x1="240" y1="20" x2="240" y2="780" stroke="#d1fae5" strokeWidth="0.8" strokeDasharray="4 4" />
            <line x1="430" y1="20" x2="430" y2="780" stroke="#d1fae5" strokeWidth="0.8" strokeDasharray="4 4" />
            <line x1="610" y1="20" x2="610" y2="780" stroke="#d1fae5" strokeWidth="0.8" strokeDasharray="4 4" />
            <line x1="810" y1="20" x2="810" y2="780" stroke="#d1fae5" strokeWidth="0.8" strokeDasharray="4 4" />

            {/* Cadastral Parcels Layer */}
            {activeParcels.map((parcel) => {
              const isSelected = selectedPlot?.id === parcel.id;

              // Compute fill color based on layer
              let fillColor = '#ffffff';
              let strokeColor = '#1e3a24';
              let strokeWidth = isSelected ? '4' : '1.8';

              if (activeLayer === 'cadastral') {
                fillColor = isSelected ? '#d1fae5' : '#fbfdf9';
                strokeColor = isSelected ? '#006A4E' : '#2d3748';
              } else if (activeLayer === 'zoning') {
                fillColor = parcel.zoningColor;
                strokeColor = isSelected ? '#006A4E' : '#475569';
              } else if (activeLayer === 'satellite') {
                fillColor = isSelected ? 'rgba(52, 211, 153, 0.35)' : 'rgba(30, 41, 59, 0.7)';
                strokeColor = isSelected ? '#34d399' : '#94a3b8';
              } else if (activeLayer === 'trust') {
                if (parcel.status === 'SAFE') {
                  fillColor = '#dcfce7'; // green
                  strokeColor = '#16a34a';
                } else if (parcel.status === 'FOR_SALE') {
                  fillColor = '#a7f3d0'; // emerald tag
                  strokeColor = '#006A4E';
                } else if (parcel.status === 'MORTGAGED') {
                  fillColor = '#dbeafe'; // bank blue
                  strokeColor = '#2563eb';
                } else if (parcel.status === 'SALE_LOCKED') {
                  fillColor = '#fee2e2'; // rose locked
                  strokeColor = '#dc2626';
                } else if (parcel.status === 'DISPUTED') {
                  fillColor = '#fef3c7'; // amber dispute
                  strokeColor = '#d97706';
                }
              }

              return (
                <g
                  key={parcel.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlot(parcel);
                    setSelectedPlotDag(parcel.dagNoBn);
                  }}
                  className="cursor-pointer transition-all hover:opacity-90 group"
                >
                  {/* Parcel Polygon */}
                  <path
                    d={parcel.svgPath}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinejoin="round"
                    className="transition-colors duration-150"
                  />

                  {/* Corner Survey Pins on hover/select */}
                  {isSelected && (
                    <circle
                      cx={parcel.labelCoord.x}
                      cy={parcel.labelCoord.y}
                      r="18"
                      fill="none"
                      stroke="#006A4E"
                      strokeWidth="2"
                      strokeDasharray="3 3"
                    />
                  )}

                  {/* Bold Bengali Dag Number Label */}
                  <text
                    x={parcel.labelCoord.x}
                    y={parcel.labelCoord.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={`font-black text-sm select-none pointer-events-none ${
                      activeLayer === 'satellite' ? 'fill-emerald-300' : 'fill-slate-900'
                    }`}
                    style={{ fontSize: isSelected ? '16px' : '13px' }}
                  >
                    {parcel.dagNoBn}
                  </text>

                  {/* Secondary Area / Classification Label */}
                  <text
                    x={parcel.labelCoord.x}
                    y={parcel.labelCoord.y + 15}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[9px] font-semibold select-none pointer-events-none fill-slate-500"
                  >
                    {parcel.areaDecimal} শতক
                  </text>

                  {/* Status Indicator Icon Badge on parcel */}
                  {parcel.status === 'FOR_SALE' && (
                    <text
                      x={parcel.labelCoord.x}
                      y={parcel.labelCoord.y - 16}
                      textAnchor="middle"
                      className="text-[9px] font-black fill-[#006A4E]"
                    >
                      ★ বিক্রির জন্য
                    </text>
                  )}
                  {parcel.status === 'SALE_LOCKED' && (
                    <text
                      x={parcel.labelCoord.x}
                      y={parcel.labelCoord.y - 16}
                      textAnchor="middle"
                      className="text-[9px] font-black fill-rose-600"
                    >
                      🔒 লককৃত
                    </text>
                  )}
                  {parcel.status === 'MORTGAGED' && (
                    <text
                      x={parcel.labelCoord.x}
                      y={parcel.labelCoord.y - 16}
                      textAnchor="middle"
                      className="text-[9px] font-black fill-blue-600"
                    >
                      🏦 বন্ধকযুক্ত
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* =====================================================================
            4. INTERACTIVE PLOT DETAIL POPUP (.ol-popup style from map.land.gov.bd)
            ===================================================================== */}
        {selectedPlot && (
          <div
            className="absolute z-20 bg-white rounded-2xl shadow-2xl border-2 border-[#006A4E] w-84 sm:w-96 text-slate-800 overflow-hidden"
            style={{
              top: '80px',
              right: '24px',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            {/* Popup Header with Green Gradient */}
            <div className="bg-[#006A4E] text-white p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-300" />
                <h3 className="text-xs sm:text-sm font-extrabold">
                  {t('মৌজা ও প্লট বিস্তারিত তথ্য (Mouza & Plot Details)', 'Mouza & Plot Details')}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPlot(null)}
                className="p-1 rounded-md text-emerald-200 hover:text-white hover:bg-emerald-800 cursor-pointer transition"
                title={t('পপআপ বন্ধ করুন', 'Close Popup')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Popup Attribute Table */}
            <div className="p-4 space-y-3 text-xs max-h-[460px] overflow-y-auto">
              {/* Highlight Badges */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-500">
                  {t('দাগ নং:', 'Plot Dag:')}{' '}
                  <strong className="text-base font-extrabold text-[#006A4E]">{selectedPlot.dagNoBn}</strong>
                </span>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    selectedPlot.status === 'SAFE'
                      ? 'bg-emerald-100 text-[#006A4E]'
                      : selectedPlot.status === 'FOR_SALE'
                      ? 'bg-emerald-600 text-white'
                      : selectedPlot.status === 'MORTGAGED'
                      ? 'bg-blue-100 text-blue-800'
                      : selectedPlot.status === 'SALE_LOCKED'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {selectedPlot.statusLabelBn}
                </span>
              </div>

              {/* Data Table */}
              <table className="w-full text-left text-xs divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-slate-50/70">
                    <td className="py-2 px-3 text-slate-500 font-medium">{t('বিভাগ ও জেলা', 'Division & District')}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">
                      {selectedDivision}, {selectedDistrict}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-500 font-medium">{t('থানা / উপজেলা', 'Thana / Upazila')}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{selectedUpazila}</td>
                  </tr>
                  <tr className="bg-slate-50/70">
                    <td className="py-2 px-3 text-slate-500 font-medium">{t('মৌজা ও জে.এল নং', 'Mouza & JL No')}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">
                      {selectedPlot.mouzaBn} (জে.এল {selectedPlot.jlNo})
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-500 font-medium">{t('সিট নং', 'Sheet No')}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">সিট-{selectedPlot.sheetNo}</td>
                  </tr>
                  <tr className="bg-slate-50/70">
                    <td className="py-2 px-3 text-slate-500 font-medium">{t('খতিয়ান নং', 'Khatian No')}</td>
                    <td className="py-2 px-3 font-bold text-slate-900">{selectedPlot.khatianNoBn}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-500 font-medium">{t('জমির শ্রেণী', 'Land Class')}</td>
                    <td className="py-2 px-3 font-bold text-slate-900">{selectedPlot.landClassBn}</td>
                  </tr>
                  <tr className="bg-slate-50/70">
                    <td className="py-2 px-3 text-slate-500 font-medium">{t('জমির পরিমাণ', 'Land Area')}</td>
                    <td className="py-2 px-3 font-bold text-[#006A4E]">
                      {selectedPlot.areaDecimal} শতক ({selectedPlot.areaKatha} কাঠা)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-500 font-medium">{t('জোনিং শ্রেণী', 'Zoning Category')}</td>
                    <td className="py-2 px-3 font-bold text-slate-800">{selectedPlot.zoningCategory}</td>
                  </tr>
                  <tr className="bg-slate-50/70">
                    <td className="py-2 px-3 text-slate-500 font-medium">{t('মালিকের তথ্য', 'Owner (Masked)')}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">
                      {selectedPlot.ownerMasked} ({selectedPlot.nidMasked})
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Price card if for sale */}
              {selectedPlot.askingPriceBdt && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between">
                  <span className="text-emerald-800 font-bold">{t('বিজ্ঞাপিত মূল্য:', 'Price:')}</span>
                  <strong className="text-base text-[#006A4E] font-black">
                    ৳ {formatNumber(selectedPlot.askingPriceBdt)}
                  </strong>
                </div>
              )}

              {/* Action Buttons in Popup */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate?.(`check?dag=${selectedPlot.dagNo}`)}
                  className="w-full py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Search className="w-4 h-4 text-emerald-400" />
                  <span>{t('এই দাগটি সম্পূর্ণ যাচাই করুন (Audit)', 'Audit Plot in BhumiShield')}</span>
                </button>

                {selectedPlot.status === 'FOR_SALE' && (
                  <button
                    type="button"
                    onClick={() => onNavigate?.('sale')}
                    className="w-full py-2 bg-[#006A4E] hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Tag className="w-4 h-4" />
                    <span>{t('জমির হাটে বিজ্ঞাপনটি দেখুন', 'View in Sale Marketplace')}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          5. MODALS: 
          - 1. Land Use Summary Modal (ভূমি ব্যবহারের সারাংশ)
          - 2. Land Zoning Summary Modal (ভূমি জোনিং সারাংশ)
          - 3. Project Objectives Modal (প্রকল্পের উদ্দেশ্য)
          - 4. Measurement Guide Modal (পরিমাপ নির্দেশিকা)
          ===================================================================== */}

      {/* 1. ভূমি ব্যবহারের সারাংশ Modal */}
      {landUseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#006A4E] flex items-center justify-center">
                  <PieChart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {selectedMouza} — {t('ভূমি ব্যবহারের সারাংশ', 'Land Use Summary')}
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    {t('মৌজা ও প্লটভিত্তিক ডিজিটাল সার্ভে রেকর্ড', 'Mouza Cadastral Land Use Distribution')}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setLandUseModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                <span className="text-[11px] text-emerald-800 block font-semibold">{t('মোট দাগ সংখ্যা', 'Total Plots')}</span>
                <strong className="text-lg font-extrabold text-[#006A4E]">১২০ টি</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[11px] text-slate-600 block font-semibold">{t('মোট জমির পরিমাণ', 'Total Area')}</span>
                <strong className="text-lg font-extrabold text-slate-900">৮৪.৫০ একর</strong>
              </div>
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
                <span className="text-[11px] text-amber-800 block font-semibold">{t('প্রধান ব্যবহার', 'Primary Land Use')}</span>
                <strong className="text-lg font-extrabold text-amber-900">কৃষি (৬২%)</strong>
              </div>
            </div>

            {/* Land Use Classification Progress Bars */}
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-bold text-slate-700 mb-1">
                  <span>🌾 কৃষি জমি (নাল ও ধানী)</span>
                  <span>৫২.২০ একর (৬১.৮%)</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '61.8%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-bold text-slate-700 mb-1">
                  <span>🏡 আবাসিক জমি (ভিটা ও বাড়ি)</span>
                  <span>১৮.৩০ একর (২১.৬%)</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: '21.6%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-bold text-slate-700 mb-1">
                  <span>💧 জলাশয় ও নদী (পুকুর/খাল)</span>
                  <span>৭.৪০ একর (৮.৭%)</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-400 rounded-full" style={{ width: '8.7%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-bold text-slate-700 mb-1">
                  <span>🏢 বাণিজ্যিক ও শিল্প এলাকা</span>
                  <span>৪.১০ একর (৪.৯%)</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: '4.9%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-bold text-slate-700 mb-1">
                  <span>🌳 বনায়ন ও সবুজ বেষ্টনী</span>
                  <span>২.৫০ একর (৩.০%)</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-700 rounded-full" style={{ width: '3.0%' }} />
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-800 font-bold block mb-1">
                {t('📌 জাতীয় ভূমি ব্যবহার নীতিমালার নির্দেশনা:', '📌 National Land Policy Directive:')}
              </strong>
              {t(
                'উক্ত মৌজার কৃষি জমি সুরক্ষার স্বার্থে অতিরিক্ত আবাসন বা শিল্পে রূপান্তর কঠোরভাবে সীমিত। যে কোনো বাণিজ্যিক পরিবর্তনের পূর্বে উপজেলা ভূমি অফিস ও পরিবেশ অধিদপ্তরের অনাপত্তিপত্র বাধ্যতামূলক।',
                'To safeguard agricultural production in this mouza, unauthorized land conversion is strictly restricted under the Land Reform Act 2023.'
              )}
            </div>

            <button
              onClick={() => setLandUseModalOpen(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              {t('বন্ধ করুন', 'Close')}
            </button>
          </div>
        </div>
      )}

      {/* 2. ভূমি জোনিং সারাংশ Modal */}
      {zoningModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {t('জাতীয় ভূমি জোনিং বিধিমালা ও নীতিমালা', 'National Digital Land Zoning Guidelines')}
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    {t('মৌজা ও প্লটভিত্তিক ডিজিটাল ভূমি সুরক্ষা', 'Plot-Based Protection Regulations')}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setZoningModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs max-h-[400px] overflow-y-auto pr-1">
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                <div className="flex items-center gap-2 text-emerald-900 font-extrabold">
                  <div className="w-3 h-3 rounded-full bg-emerald-600" />
                  <span>১. কৃষি সুরক্ষা অঞ্চল (Agricultural Preservation Zone)</span>
                </div>
                <p className="text-emerald-800 leading-relaxed pl-5">
                  দ্বি-ফসলি বা তিন ফসলি জমি কোনো অবস্থাতেই অকৃষি কাজে পরিবর্তন করা যাবে না (ভূমি সংস্কার আইন ২০২৩)। শুধুমাত্র ফসল উৎপাদন ও কৃষি সহায়ক অবকাঠামো অনুমোদিত।
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
                <div className="flex items-center gap-2 text-amber-900 font-extrabold">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span>২. পরিকল্পিত আবাসন অঞ্চল (Planned Residential Zone)</span>
                </div>
                <p className="text-amber-800 leading-relaxed pl-5">
                  গ্রামীণ ও উপ-শহুরে পরিকল্পিত আবাসন এলাকা। ড্রেনেজ ব্যবস্থা এবং রাস্তা প্রশস্ততার শর্তসাপেক্ষে স্থানীয় কর্তৃপক্ষ কর্তৃক ছাড়পত্র সাপেক্ষে নির্মাণযোগ্য।
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-1">
                <div className="flex items-center gap-2 text-indigo-900 font-extrabold">
                  <div className="w-3 h-3 rounded-full bg-indigo-600" />
                  <span>৩. বাণিজ্যিক ও অর্থনৈতিক অঞ্চল (Commercial & Industrial Zone)</span>
                </div>
                <p className="text-indigo-800 leading-relaxed pl-5">
                  হাইওয়ে সংলগ্ন এবং নির্ধারিত অর্থনৈতিক জোন। পরিবেশ অধিদপ্তরের ছাড়পত্র এবং ইটিপি (ETP) ব্যবস্থা থাকা বাধ্যতামূলক।
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 space-y-1">
                <div className="flex items-center gap-2 text-sky-900 font-extrabold">
                  <div className="w-3 h-3 rounded-full bg-sky-500" />
                  <span>৪. পরিবেশগত সংবেদনশীল জলাভূমি (Ecologically Critical Wetland)</span>
                </div>
                <p className="text-sky-800 leading-relaxed pl-5">
                  প্রাকৃতিক নদী, খাল, প্লাবনভূমি ও সরকারি জলাশয়। জলাধার সংরক্ষণ আইন ২০০০ অনুযায়ী কোনো ধরনের ভরাট বা শ্রেণীবদল সম্পূর্ণ নিষিদ্ধ ও শাস্তিযোগ্য অপরাধ।
                </p>
              </div>
            </div>

            <button
              onClick={() => setZoningModalOpen(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              {t('ঠিক আছে', 'Understood')}
            </button>
          </div>
        </div>
      )}

      {/* 3. প্রকল্পের উদ্দেশ্য ও তথ্য Modal */}
      {projectInfoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                {t('মৌজা ও প্লটভিত্তিক জাতীয় ডিজিটাল ভূমি জোনিং প্রকল্প', 'National Digital Land Zoning Project')}
              </h3>
              <button
                onClick={() => setProjectInfoModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <p>
                <strong>ভূমি মন্ত্রণালয়, গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</strong> কর্তৃক বাস্তবায়নাধীন এই প্রকল্পের মূল লক্ষ্য হচ্ছে সমগ্র বাংলাদেশের প্রতিটি মৌজার প্রতিটি প্লটকে ডিজিটাল ম্যাপ ও স্যাটেলাইট ডাটার সাথে সংযুক্ত করে সঠিক ভূমি জোনিং নির্ধারণ করা।
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                <li>দেশের সকল ক্যাডাস্ট্রাল মৌজা নকশা (CS, RS, SA, BS) নির্ভুলভাবে ভেক্টরাইজেশন।</li>
                <li>কৃষি জমি সংরক্ষণ ও অপরিকল্পিত শিল্পায়ন রোধ।</li>
                <li>ভূমি বিরোধ, সীমানা জটিলতা ও জালিয়াতি রোধে স্বচ্ছ ডিজিটাল রেকর্ড।</li>
                <li>নাগরিকদের অনলাইনে ঘরে বসেই দাগের সঠিক অবস্থান ও নিরাপত্তা যাচাইয়ের সুযোগ।</li>
              </ul>
            </div>

            <button
              onClick={() => setProjectInfoModalOpen(false)}
              className="w-full py-2.5 bg-[#006A4E] hover:bg-emerald-800 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              {t('ধন্যবাদ', 'Close')}
            </button>
          </div>
        </div>
      )}

      {/* 4. পরিমাপ নির্দেশিকা Modal */}
      {measureModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Ruler className="w-5 h-5 text-[#006A4E]" />
                <h3 className="text-base font-extrabold text-slate-900">
                  {t('বাংলাদেশী ভূমি পরিমাপ ও স্কেল সহায়িকা', 'Cadastral Survey Measurement Guide')}
                </h3>
              </div>
              <button
                onClick={() => setMeasureModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <strong className="block font-bold text-slate-900">গান্টার শিকল (Gunter Chain) হিসাব:</strong>
                <p className="text-slate-600">১ শিকল = ৬৬ ফুট = ১০০ লিংক (Link) = ৪৪ হাত = ২২ গজ</p>
                <p className="text-slate-600">১০ বর্গ শিকল = ১ একর = ১০০ শতক (Decimal) = ৪৩,৫৬০ বর্গফুট</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <strong className="block font-bold text-slate-900">কাঠা ও বিঘা রূপান্তর:</strong>
                <p className="text-slate-600">১ কাঠা = ১.৬৫ শতক = ৭২০ বর্গফুট</p>
                <p className="text-slate-600">১ বিঘা = ২০ কাঠা = ৩৩ শতক = ১৪,৪০০ বর্গফুট</p>
                <p className="text-slate-600">১ একর = ৩ বিঘা ৮ ছটাক</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <strong className="block font-bold text-slate-900">নকশার আদর্শ স্কেল:</strong>
                <p className="text-slate-600">সাধারণ গ্রামীণ মৌজা নকশা: ১৬ ইঞ্চি = ১ মাইল (1:3960)</p>
                <p className="text-slate-600">ঘনবসতি বা পৌর এলাকা: ৩২ ইঞ্চি বা ৬৪ ইঞ্চি = ১ মাইল</p>
              </div>
            </div>

            <button
              onClick={() => setMeasureModalOpen(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              {t('বন্ধ করুন', 'Close')}
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          6. INSTITUTIONAL 4-COLUMN FOOTER (#075f24 Matching map.land.gov.bd)
          ===================================================================== */}
      <footer className="w-full bg-[#075f24] text-white pt-8 pb-4 px-4 sm:px-6 lg:px-12 border-t-2 border-emerald-800">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-xs">
          {/* Column 1: Ministry Emblem & Project Statement */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-1 shadow-sm shrink-0">
                <div className="w-8 h-8 rounded-full bg-[#006A4E] flex items-center justify-center text-white text-[10px] font-black">
                  <span className="text-amber-300">★</span>ভূ
                </div>
              </div>
              <div>
                <h4 className="font-extrabold text-sm leading-tight text-emerald-100">
                  {t('স্মার্ট ভূমি নকশা ও জোনিং', 'Smart Bhumi Naksha & Zoning')}
                </h4>
                <p className="text-[11px] text-emerald-300">
                  {t('ভূমি মন্ত্রণালয়, গণপ্রজাতন্ত্রী বাংলাদেশ সরকার', 'Ministry of Land, Govt of Bangladesh')}
                </p>
              </div>
            </div>
            <p className="text-emerald-200 text-[11px] leading-relaxed">
              {t(
                'মৌজা ও প্লটভিত্তিক জাতীয় ডিজিটাল ভূমি জোনিং প্রকল্পের আওতায় সারা দেশের ভূমির বৈশিষ্ট্য, অবস্থান ও সঠিক জোনিং ব্যবস্থাপনা একটি প্ল্যাটফর্মে সংহত করা হয়েছে।',
                'Integrated nationwide cadastral zoning and parcel boundary GIS portal under the Ministry of Land.'
              )}
            </p>
          </div>

          {/* Column 2: Official Web Services */}
          <div className="space-y-2">
            <h5 className="font-bold text-sm text-amber-300 border-b border-emerald-700/60 pb-1.5">
              {t('প্রয়োজনীয় সরকারি ওয়েবসাইট', 'Official Government Links')}
            </h5>
            <ul className="space-y-1.5 text-emerald-100">
              <li>
                <a
                  href="https://minland.gov.bd"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-amber-300 transition flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                  <span>ভূমি মন্ত্রণালয় (minland.gov.bd)</span>
                </a>
              </li>
              <li>
                <a
                  href="https://mutation.land.gov.bd"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-amber-300 transition flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                  <span>ই-নামজারি পোর্টাল (e-Mutation)</span>
                </a>
              </li>
              <li>
                <a
                  href="https://eporcha.gov.bd"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-amber-300 transition flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                  <span>ডিজিটাল রেকর্ড রুম (ই-পর্চা)</span>
                </a>
              </li>
              <li>
                <a
                  href="https://land.gov.bd"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-amber-300 transition flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                  <span>জাতীয় ভূমি সেবা পোর্টাল (land.gov.bd)</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: App & Guidelines */}
          <div className="space-y-2">
            <h5 className="font-bold text-sm text-amber-300 border-b border-emerald-700/60 pb-1.5">
              {t('মোবাইল অ্যাপ ও সহায়িকা', 'Mobile Apps & Guides')}
            </h5>
            <ul className="space-y-1.5 text-emerald-100">
              <li>
                <button
                  onClick={() => setProjectInfoModalOpen(true)}
                  className="hover:text-amber-300 transition flex items-center gap-1.5 cursor-pointer text-left"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                  <span>স্মার্ট ভূমি নকশা ব্যবহার নির্দেশিকা</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setMeasureModalOpen(true)}
                  className="hover:text-amber-300 transition flex items-center gap-1.5 cursor-pointer text-left"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                  <span>ক্যাডাস্ট্রাল সার্ভে ও পরিমাপ নিয়মাবলী</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate?.('help')}
                  className="hover:text-amber-300 transition flex items-center gap-1.5 cursor-pointer text-left"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                  <span>নাগরিক চার্টার ও অভিযোগ প্রতিকার</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate?.('sale')}
                  className="hover:text-amber-300 transition flex items-center gap-1.5 cursor-pointer text-left"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                  <span>যাচাইকৃত জমির হাট (Bhumi Marketplace)</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Hotline */}
          <div className="space-y-2.5">
            <h5 className="font-bold text-sm text-amber-300 border-b border-emerald-700/60 pb-1.5">
              {t('যোগাযোগ ও সহায়তা', 'Contact & Support')}
            </h5>
            <div className="text-emerald-100 space-y-1.5 text-[11px]">
              <p className="flex items-start gap-1.5">
                <Building2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>ভূমি ভবন, ৯৮ শহীদ তাজউদ্দীন আহমদ সরণি, তেজগাঁও, ঢাকা-১২০৮।</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  হটলাইন: <strong>১৬১২২</strong> (২৪ ঘণ্টা সার্বক্ষণিক)
                </span>
              </p>
              <p className="flex items-center gap-1.5 font-mono text-[10px]">
                <Globe className="w-4 h-4 text-amber-400 shrink-0" />
                <span>info@minland.gov.bd</span>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Hackathon Innovation Attribution */}
        <div className="border-t border-emerald-800/80 pt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-emerald-200 gap-2">
          <p>
            {t(
              'স্বত্বাধিকার © ২০২৬ ভূমি মন্ত্রণালয়, গণপ্রজাতন্ত্রী বাংলাদেশ সরকার। সর্বস্বত্ব সংরক্ষিত।',
              'Copyright © 2026 Ministry of Land, Government of the People’s Republic of Bangladesh. All rights reserved.'
            )}
          </p>
          <p className="text-emerald-300 font-medium">
            {t(
              'কারিগরি উদ্ভাবন ও নিরাপত্তা স্থাপত্য: ভূমি সুরক্ষা (BhumiShield) • LandTech Hackathon 2026',
              'Technical Innovation & Security Architecture: BhumiShield • LandTech Hackathon 2026'
            )}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default CadastralMapPage;
