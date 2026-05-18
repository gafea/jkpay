export const parseString = (value: unknown) => String(value ?? '').trim();

export const parseOptionalNumber = (value: unknown) => {
  if (value === null || value === undefined || String(value).trim() === '') {
    return null;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error('Invalid numeric input');
  }
  return parsed;
};

export const parseOptionalInt = (value: unknown) => {
  if (value === null || value === undefined || String(value).trim() === '') {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error('Invalid integer input');
  }
  return parsed;
};

export const parseOptionalDate = (value: unknown) => {
  if (value === null || value === undefined || String(value).trim() === '') {
    return null;
  }
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid date input');
  }
  return parsed;
};

export const parseBoolean = (value: unknown) => value === true || value === 'true' || value === 1 || value === '1';

export const parseStringArray = (value: unknown) => {
  const rawList = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const item of rawList) {
    const normalized = String(item ?? '')
      .trim()
      .replace(/\s+/g, ' ');
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(normalized);
  }

  return cleaned;
};
