const isBrowser = typeof window !== 'undefined';
const host = isBrowser && window.location && window.location.hostname ? window.location.hostname : 'localhost';

export const environment = {
    production: false,
    apiUrl: `http://${host}:4003/api/v1`,
    appName: 'Yiyo Burguer',
    BOTPRESS_API_KEY: "TU_API_KEY_AQUI",
    BOTPRESS_CLIENT_ID: "e5b99ad4-ade1-4e6b-a2a6-710a9a5ccaa6",
    BOTPRESS_SHARE_URL: "https://cdn.botpress.cloud/webchat/v3.3/shareable.html?configUrl=https://files.bpcontent.cloud/2025/11/14/22/20251114221855-JCLFHYOR.json"
  };
