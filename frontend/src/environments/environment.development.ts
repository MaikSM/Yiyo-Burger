const isBrowser = typeof window !== 'undefined';
const host = isBrowser && window.location && window.location.hostname ? window.location.hostname : 'localhost';

export const environment = {
    production: false,
    apiUrl: `http://${host}:4003/api/v1`,
    appName: 'Yiyo Burguer',
  };
