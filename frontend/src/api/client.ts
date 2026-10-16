import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('bhumishield_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function extractErrorMessage(err: unknown, lang: 'bn' | 'en'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    if (data && typeof data === 'object') {
      if (lang === 'bn' && data.message_bn) return String(data.message_bn);
      if (lang === 'en' && data.message_en) return String(data.message_en);
      if (data.detail && typeof data.detail === 'object') {
        if (lang === 'bn' && data.detail.message_bn) return String(data.detail.message_bn);
        if (lang === 'en' && data.detail.message_en) return String(data.detail.message_en);
      }
    }
  }
  return lang === 'bn'
    ? 'সংযোগে সমস্যা হয়েছে। সার্ভার চালু আছে কি না দেখে আবার চেষ্টা করুন।'
    : 'Connection issue occurred. Please check that the API server is running and try again.';
}
