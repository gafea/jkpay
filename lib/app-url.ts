const ensureProtocol = (value: string) => {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const host = value.trim().toLowerCase();
  const isLocalHost = host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('[::1]');

  return `${isLocalHost ? 'http' : 'https'}://${value}`;
};

export const getAppBaseUrl = () => {
  const domain = process.env.DOMAIN?.trim();
  if (!domain) {
    throw new Error('Missing DOMAIN environment variable');
  }

  const normalized = ensureProtocol(domain).replace(/\/+$/, '');
  return new URL(normalized);
};
