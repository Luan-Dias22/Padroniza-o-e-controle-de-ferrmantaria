export const getLogoBase64 = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('companyLogo');
  }
  return null;
};

export const setLogoBase64 = (base64: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('companyLogo', base64);
  }
};
