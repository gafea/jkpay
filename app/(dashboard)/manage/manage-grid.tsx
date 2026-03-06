'use client';

import { removeBenefit, removeCard, removeFriend, saveBenefit, saveCard, saveFriend } from '@/app/actions/manage';
import { Trash2, GripVertical, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

type FriendInput = {
  id: string;
  email: string;
  nickname: string;
  activeUntil: string;
  isDisabled: boolean;
};

type CardInput = {
  id: string;
  name: string;
  fcyFee: string;
  isCredit: boolean;
  isDisabled: boolean;
};

type BenefitInput = {
  id: string;
  categoryName: string;
  expiryDate: string;
  cashbackType: 'PERCENTAGE' | 'ONE_TIME_CASH';
  cashbackAmount: string;
  usageAvailable: string;
  usageUsed?: number;
  quotaResetsMonthly: boolean;
  minimumSpending: string;
  maximumSpending: string;
  applicableWeekdays: string[];
  purchaseChannel: string;
  linkedCardIds: string[];
};

type Row<T> = T & { _key: string };

type ManageGridProps = {
  friends: FriendInput[];
  cards: CardInput[];
  benefits: BenefitInput[];
  weekdayOptions: string[];
  channelOptions: string[];
};

const createKey = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const withKey = <T,>(items: T[]): Row<T>[] => items.map((item) => ({ ...item, _key: createKey() }));

const blankFriend = (): Row<FriendInput> => ({
  _key: createKey(),
  id: '',
  email: '',
  nickname: '',
  activeUntil: '',
  isDisabled: false,
});

const blankCard = (): Row<CardInput> => ({
  _key: createKey(),
  id: '',
  name: '',
  fcyFee: '',
  isCredit: false,
  isDisabled: false,
});

const blankBenefit = (): Row<BenefitInput> => ({
  _key: createKey(),
  id: '',
  categoryName: '',
  expiryDate: '',
  cashbackType: 'PERCENTAGE',
  cashbackAmount: '',
  usageAvailable: '',
  usageUsed: 0,
  quotaResetsMonthly: false,
  minimumSpending: '',
  maximumSpending: '',
  applicableWeekdays: [],
  purchaseChannel: '',
  linkedCardIds: [],
});

const hasFriendData = (row: FriendInput) =>
  row.email.trim() !== '';

const hasCardData = (row: CardInput) =>
  row.name.trim() !== '';

const hasBenefitData = (row: BenefitInput) =>
  row.categoryName.trim() !== '' ||
  row.cashbackAmount.trim() !== '';

const isBenefitExpired = (dateStr: string) => {
  if (!dateStr) return false;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ed = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  return ed < today;
};

const toFormData = (pairs: Array<[string, string | string[] | boolean]>) => {
  const formData = new FormData();
  for (const [key, value] of pairs) {
    if (Array.isArray(value)) {
      value.forEach((item) => formData.append(key, item));
      continue;
    }
    formData.append(key, String(value));
  }
  return formData;
};

// ─── Shared cell / input styles ───────────────────────────────────────────────

const cellCls = 'border-r border-slate-100 last:border-r-0 p-0';
const inputCls =
  'w-full h-full bg-transparent px-2 py-1.5 text-sm text-slate-800 placeholder:text-slate-300 outline-none focus:bg-indigo-50/40 focus:ring-1 focus:ring-inset focus:ring-indigo-300 transition-colors';
const selectCls =
  'w-full h-full bg-transparent px-2 py-1.5 text-sm text-slate-800 outline-none focus:bg-indigo-50/40 focus:ring-1 focus:ring-inset focus:ring-indigo-300 transition-colors cursor-pointer';
const thCls =
  'border-r border-slate-200 bg-slate-50 px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 last:border-r-0 whitespace-nowrap';

// ─── Required star ────────────────────────────────────────────────────────────

function Req() {
  return <span className="ml-0.5 text-red-500">*</span>;
}

// ─── Trash button ─────────────────────────────────────────────────────────────

function TrashBtn({ onClick, disabled, hidden }: { onClick: () => void; disabled: boolean; hidden?: boolean }) {
  if (hidden) return <div className="h-7 w-7" />;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 text-slate-400 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
      title="Delete row"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}

// ─── Flexible Date Input ───────────────────────────────────────────────────────

function DateInput({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  const [local, setLocal] = useState(value);
  
  useEffect(() => {
    setLocal(value);
  }, [value]);

  const handleBlur = () => {
    let str = local.trim();
    if (!str) {
      onChange('');
      return;
    }
    
    const parts = str.split(/[-\/\.\s]+/).filter(Boolean);
    if (parts.length === 0) {
      onChange('');
      setLocal('');
      return;
    }
    
    const today = new Date();
    let y = today.getFullYear();
    let m = today.getMonth() + 1;
    let d = today.getDate();

    if (parts.length === 1) {
      if (parts[0].length === 4) {
        y = parseInt(parts[0], 10);
      } else {
        d = parseInt(parts[0], 10); // assume day if 1 or 2 digits
      }
    } else if (parts.length === 2) {
      if (parts[0].length === 4) {
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10); // YYYY-MM
      } else {
        m = parseInt(parts[0], 10);
        d = parseInt(parts[1], 10); // MM-DD
      }
    } else if (parts.length >= 3) {
      if (parts[0].length === 4) { // YYYY-MM-DD
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
        d = parseInt(parts[2], 10);
      } else { // MM-DD-YYYY or DD-MM-YYYY, assuming MM-DD-YYYY for simplicity
        m = parseInt(parts[0], 10);
        d = parseInt(parts[1], 10);
        y = parseInt(parts[2], 10);
        if (y < 100) y += 2000;
      }
    }

    if (m < 1) m = 1; if (m > 12) m = 12;
    const maxD = new Date(y, m, 0).getDate();
    if (d < 1) d = 1; if (d > maxD) d = maxD;

    const finalVal = `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    setLocal(finalVal);
    onChange(finalVal);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleBlur();
  };

  return (
    <input
      type="text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={className}
      placeholder=""
    />
  );
}

// ─── Multi-select popup ───────────────────────────────────────────────────────

function MultiSelectPopup({
  options,
  selected,
  onChange,
  placeholder = 'Select…',
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const ref = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleOpen = () => {
    if (!open && ref.current) setRect(ref.current.getBoundingClientRect());
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      if (dropdownRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    
    const updateRect = () => {
      if (ref.current) setRect(ref.current.getBoundingClientRect());
    };
    
    document.addEventListener('mousedown', handler);
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [open]);

  const toggle = (value: string) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={toggleOpen}
        className="flex w-full items-center justify-between gap-1 bg-transparent px-2 py-1.5 text-left text-sm text-slate-800 transition-colors hover:bg-indigo-50/40 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-indigo-300"
      >
        <span className={`truncate ${selected.length === 0 ? 'text-slate-300 text-xs' : 'text-sm'}`}>
          {selected.length ? selected.join(', ') : placeholder}
        </span>
        <ChevronDown className="h-3 w-3 shrink-0 text-slate-400" />
      </button>
      {open && rect && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] mt-1 min-w-[160px] max-h-52 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg"
          style={{ top: rect.bottom, left: Math.min(rect.left, window.innerWidth - 180), width: Math.max(160, rect.width) }}
        >
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-xs hover:bg-indigo-50"
            >
              <input
                type="checkbox"
                className="h-3.5 w-3.5 accent-indigo-600"
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
              />
              <span className="text-slate-700">{opt.label}</span>
            </label>
          ))}
          {options.length === 0 && <p className="px-3 py-2 text-xs text-slate-400">No options</p>}
        </div>,
        document.body
      )}
    </>
  );
}

// ─── Card selector (popup + drag-drop target) ─────────────────────────────────

function CardSelector({
  cards,
  selectedIds,
  onChange,
}: {
  cards: CardInput[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const ref = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleOpen = () => {
    if (!open && ref.current) setRect(ref.current.getBoundingClientRect());
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      if (dropdownRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };

    const updateRect = () => {
      if (ref.current) setRect(ref.current.getBoundingClientRect());
    };

    document.addEventListener('mousedown', handler);
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [open]);

  const savedCards = cards.filter((c) => c.id);
  const selectedNames = savedCards.filter((c) => selectedIds.includes(c.id)).map((c) => c.name);

  const toggle = (id: string) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={toggleOpen}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          const cardId = e.dataTransfer.getData('cardId');
          if (cardId && !selectedIds.includes(cardId)) onChange([...selectedIds, cardId]);
        }}
        className={`flex w-full items-center justify-between gap-1 px-2 py-1.5 text-left text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-inset focus:ring-indigo-300 ${
          isDragOver ? 'bg-indigo-100 ring-1 ring-inset ring-indigo-400' : 'bg-transparent hover:bg-indigo-50/40'
        }`}
      >
        <span className={`truncate ${selectedNames.length === 0 ? 'text-slate-300 text-xs' : 'text-sm text-slate-800'}`}>
          {selectedNames.length ? selectedNames.join(', ') : 'Drop card or click…'}
        </span>
        <ChevronDown className="h-3 w-3 shrink-0 text-slate-400" />
      </button>
      {open && rect && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] mt-1 min-w-[180px] max-h-52 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg"
          style={{ top: rect.bottom, left: Math.min(rect.left, window.innerWidth - 200), width: Math.max(180, rect.width) }}
        >
          {savedCards.map((card) => (
            <label
              key={card.id}
              className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-xs hover:bg-indigo-50"
            >
              <input
                type="checkbox"
                className="h-3.5 w-3.5 accent-indigo-600"
                checked={selectedIds.includes(card.id)}
                onChange={() => toggle(card.id)}
              />
              <span className="text-slate-700">{card.name}</span>
            </label>
          ))}
          {savedCards.length === 0 && <p className="px-3 py-2 text-xs text-slate-400">No saved cards yet</p>}
        </div>,
        document.body
      )}
    </>
  );
}

export const ManageGrid = ({ friends, cards, benefits, weekdayOptions, channelOptions }: ManageGridProps) => {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState('');
  const [showExpiredBenefits, setShowExpiredBenefits] = useState(false);

  const [friendRows, setFriendRows] = useState<Row<FriendInput>[]>(() => [...withKey(friends), blankFriend()]);
  const [cardRows, setCardRows] = useState<Row<CardInput>[]>(() => [...withKey(cards), blankCard()]);
  const [benefitRows, setBenefitRows] = useState<Row<BenefitInput>[]>(() => [...withKey(benefits), blankBenefit()]);
  const [savedFriends, setSavedFriends] = useState<FriendInput[]>(friends);
  const [savedCards, setSavedCards] = useState<CardInput[]>(cards);
  const [savedBenefits, setSavedBenefits] = useState<BenefitInput[]>(benefits);

  // Compute if rows are edited
  const omitKey = <T extends Record<string, any>>(obj: T): Omit<T, '_key'> => {
    const { _key, ...rest } = obj;
    return rest;
  };

  const withoutId = <T extends { id: string }>(row: T) => {
    const { id: _id, ...rest } = row;
    return rest;
  };

  const friendComparable = friendRows.filter(hasFriendData).map(omitKey).map(withoutId);
  const cardComparable = cardRows.filter(hasCardData).map(omitKey).map(withoutId);
  const benefitComparable = benefitRows.filter(hasBenefitData).map(omitKey).map(withoutId);
  const savedFriendsComparable = savedFriends.map(withoutId);
  const savedCardsComparable = savedCards.map(withoutId);
  const savedBenefitsComparable = savedBenefits.map(withoutId);
  
  const isFriendsChanged = JSON.stringify(friendComparable) !== JSON.stringify(savedFriendsComparable);
  const isCardsChanged = JSON.stringify(cardComparable) !== JSON.stringify(savedCardsComparable);
  const isBenefitsChanged = JSON.stringify(benefitComparable) !== JSON.stringify(savedBenefitsComparable);

  const appendIfNeeded = <T,>(rows: Row<T>[], index: number, hasData: (row: T) => boolean, blank: () => Row<T>) => {
    if (index !== rows.length - 1) {
      return rows;
    }
    if (!hasData(rows[index])) {
      return rows;
    }
    return [...rows, blank()];
  };

  const onFriendChange = (index: number, patch: Partial<FriendInput>) => {
    setFriendRows((current) => {
      const next = current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row));
      return appendIfNeeded(next, index, hasFriendData, blankFriend);
    });
  };

  const onCardChange = (index: number, patch: Partial<CardInput>) => {
    setCardRows((current) => {
      const next = current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row));
      return appendIfNeeded(next, index, hasCardData, blankCard);
    });
  };

  const onBenefitChange = (index: number, patch: Partial<BenefitInput>) => {
    setBenefitRows((current) => {
      const next = current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row));
      return appendIfNeeded(next, index, hasBenefitData, blankBenefit);
    });
  };

  const saveFriendRow = useCallback(async (row: Row<FriendInput>) => {
    if (!row.email.trim()) return;
    setBusyKey(`friend-save-${row._key}`);
    try {
      const res = await saveFriend(toFormData([
        ['id', row.id],
        ['email', row.email],
        ['nickname', row.nickname],
        ['activeUntil', row.activeUntil],
        ['isDisabled', row.isDisabled],
      ]));
      if (res?.id && !row.id) {
        setFriendRows((c) => c.map((r) => (r._key === row._key ? { ...r, id: res.id } : r)));
      }
    } finally {
      setBusyKey('');
    }
  }, []);

  const saveCardRow = useCallback(async (row: Row<CardInput>) => {
    if (!row.name.trim()) return;
    setBusyKey(`card-save-${row._key}`);
    try {
      const res = await saveCard(toFormData([
        ['id', row.id], 
        ['name', row.name], 
        ['fcyFee', row.fcyFee],
        ['isCredit', row.isCredit],
        ['isDisabled', row.isDisabled],
      ]));
      if (res?.id && !row.id) {
        setCardRows((c) => c.map((r) => (r._key === row._key ? { ...r, id: res.id } : r)));
      }
    } finally {
      setBusyKey('');
    }
  }, []);

  const saveBenefitRow = useCallback(async (row: Row<BenefitInput>) => {
    if (!row.categoryName.trim() || !row.cashbackType || !row.cashbackAmount.trim()) return;
    setBusyKey(`benefit-save-${row._key}`);
    try {
      const res = await saveBenefit(
        toFormData([
          ['id', row.id],
          ['categoryName', row.categoryName],
          ['expiryDate', row.expiryDate],
          ['cashbackType', row.cashbackType],
          ['cashbackAmount', row.cashbackAmount],
          ['usageAvailable', row.usageAvailable],
          ['quotaResetsMonthly', row.quotaResetsMonthly],
          ['minimumSpending', row.minimumSpending],
          ['maximumSpending', row.maximumSpending],
          ['applicableWeekdays', row.applicableWeekdays],
          ['purchaseChannel', row.purchaseChannel],
          ['linkedCardIds', row.linkedCardIds],
        ]),
      );
      if (res?.id && !row.id) {
        setBenefitRows((c) => c.map((r) => (r._key === row._key ? { ...r, id: res.id } : r)));
      }
    } finally {
      setBusyKey('');
    }
  }, []);

  const [saveStatus, setSaveStatus] = useState<{ friends: string; cards: string; benefits: string }>({
    friends: '',
    cards: '',
    benefits: ''
  });

  const handleSaveFriends = async () => {
    setSaveStatus(s => ({ ...s, friends: 'saving' }));
    setBusyKey('saving-friends');
    try {
      await Promise.all(friendRows.filter(hasFriendData).map(saveFriendRow));
      setSavedFriends(friendRows.filter(hasFriendData).map(omitKey));
      setSaveStatus(s => ({ ...s, friends: 'success' }));
      setTimeout(() => setSaveStatus(s => ({ ...s, friends: '' })), 2000);
      router.refresh();
    } catch {
      setSaveStatus(s => ({ ...s, friends: 'failed' }));
    } finally {
      setBusyKey('');
    }
  };

  const handleSaveCards = async () => {
    setSaveStatus(s => ({ ...s, cards: 'saving' }));
    setBusyKey('saving-cards');
    try {
      await Promise.all(cardRows.filter(hasCardData).map(saveCardRow));
      setSavedCards(cardRows.filter(hasCardData).map(omitKey));
      setSaveStatus(s => ({ ...s, cards: 'success' }));
      setTimeout(() => setSaveStatus(s => ({ ...s, cards: '' })), 2000);
      router.refresh();
    } catch {
      setSaveStatus(s => ({ ...s, cards: 'failed' }));
    } finally {
      setBusyKey('');
    }
  };

  const handleSaveBenefits = async () => {
    setSaveStatus(s => ({ ...s, benefits: 'saving' }));
    setBusyKey('saving-benefits');
    try {
      await Promise.all(benefitRows.filter(hasBenefitData).map(saveBenefitRow));
      setSavedBenefits(benefitRows.filter(hasBenefitData).map(omitKey));
      setSaveStatus(s => ({ ...s, benefits: 'success' }));
      setTimeout(() => setSaveStatus(s => ({ ...s, benefits: '' })), 2000);
      router.refresh();
    } catch {
      setSaveStatus(s => ({ ...s, benefits: 'failed' }));
    } finally {
      setBusyKey('');
    }
  };

  const removeFriendRow = async (row: Row<FriendInput>) => {
    if (!row.id) {
      setFriendRows((current) => current.filter((item) => item._key !== row._key));
      return;
    }
    setBusyKey(`friend-remove-${row._key}`);
    try {
      await removeFriend(toFormData([['id', row.id]]));
      setFriendRows((current) => current.filter((item) => item._key !== row._key));
      router.refresh();
    } finally {
      setBusyKey('');
    }
  };

  const removeCardRow = async (row: Row<CardInput>) => {
    if (!row.id) {
      setCardRows((current) => current.filter((item) => item._key !== row._key));
      return;
    }
    setBusyKey(`card-remove-${row._key}`);
    try {
      await removeCard(toFormData([['id', row.id]]));
      setCardRows((current) => current.filter((item) => item._key !== row._key));
      router.refresh();
    } finally {
      setBusyKey('');
    }
  };

  const removeBenefitRow = async (row: Row<BenefitInput>) => {
    if (!row.id) {
      setBenefitRows((current) => current.filter((item) => item._key !== row._key));
      return;
    }
    setBusyKey(`benefit-remove-${row._key}`);
    try {
      await removeBenefit(toFormData([['id', row.id]]));
      setBenefitRows((current) => current.filter((item) => item._key !== row._key));
      router.refresh();
    } finally {
      setBusyKey('');
    }
  };

  const handleCardDragStart = (e: React.DragEvent, card: Row<CardInput>) => {
    e.dataTransfer.setData('cardId', card.id);
    e.dataTransfer.setData('cardName', card.name);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const isCardLinked = (cardId: string) => {
    return cardId ? benefitRows.some(b => b.linkedCardIds.includes(cardId)) : false;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Manage</h1>
      </div>

      {/* ── Friends ─────────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">Friends</h2>
          <div className="flex items-center gap-3">
            {saveStatus.friends === 'success' && <span className="text-sm text-green-600">Saved!</span>}
            {saveStatus.friends === 'failed' && <span className="text-sm text-red-600">Failed</span>}
            {saveStatus.friends === 'saving' && <span className="text-sm text-slate-500">Saving...</span>}
            <button
              onClick={handleSaveFriends}
              disabled={busyKey === 'saving-friends' || !isFriendsChanged}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className={thCls}>Email <Req /></th>
                <th className={thCls}>Nickname</th>
                <th className={thCls}>Active Until</th>
                <th className={thCls}>Disabled</th>
                <th className={`${thCls} w-10`}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {friendRows.map((row, index) => (
                <tr key={row._key} className="group hover:bg-slate-50/60">
                  <td className={cellCls}>
                    <input
                      value={row.email}
                      onChange={(e) => onFriendChange(index, { email: e.target.value })}
                      placeholder="friend@domain.com"
                      className={inputCls}
                    />
                  </td>
                  <td className={cellCls}>
                    <input
                      value={row.nickname}
                      onChange={(e) => onFriendChange(index, { nickname: e.target.value })}
                      placeholder="Display name"
                      className={inputCls}
                    />
                  </td>
                  <td className={cellCls}>
                    <DateInput
                      value={row.activeUntil}
                      onChange={(val) => onFriendChange(index, { activeUntil: val })}
                      className={`${inputCls}`}
                    />
                  </td>
                  <td className={cellCls}>
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={row.isDisabled}
                        onChange={(e) => onFriendChange(index, { isDisabled: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                      />
                    </div>
                  </td>
                  <td className="border-0 p-1">
                    <TrashBtn onClick={() => removeFriendRow(row)} disabled={busyKey !== ''} hidden={!hasFriendData(row)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Cards ───────────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Cards</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Drag a saved card row into the Benefits &ldquo;Cards&rdquo; column below.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {saveStatus.cards === 'success' && <span className="text-sm text-green-600">Saved!</span>}
            {saveStatus.cards === 'failed' && <span className="text-sm text-red-600">Failed</span>}
            {saveStatus.cards === 'saving' && <span className="text-sm text-slate-500">Saving...</span>}
            <button
              onClick={handleSaveCards}
              disabled={busyKey === 'saving-cards' || !isCardsChanged}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className={`${thCls} w-7`}></th>
                <th className={thCls}>Name <Req /></th>
                <th className={thCls}>Fx Fee %</th>
                <th className={thCls}>Credit Card</th>
                <th className={thCls}>Disabled</th>
                <th className={`${thCls} w-10`}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cardRows.map((row, index) => (
                <tr
                  key={row._key}
                  className="group hover:bg-slate-50/60"
                  draggable={Boolean(row.id)}
                  onDragStart={row.id ? (e) => handleCardDragStart(e, row) : undefined}
                >
                  <td className="w-7 border-r border-slate-100 p-0 text-center">
                    {row.id ? (
                      <GripVertical className="mx-auto h-3.5 w-3.5 cursor-grab text-slate-300 group-hover:text-slate-400" />
                    ) : null}
                  </td>
                  <td className={cellCls}>
                    <input
                      value={row.name}
                      onChange={(e) => onCardChange(index, { name: e.target.value })}
                      placeholder="Card name"
                      className={inputCls}
                    />
                  </td>
                  <td className={cellCls}>
                    <input
                      type="number"
                      step="0.01"
                      value={row.fcyFee || ''}
                      onChange={(e) => onCardChange(index, { fcyFee: e.target.value })}
                      placeholder="0.00"
                      className={inputCls}
                    />
                  </td>
                  <td className={cellCls}>
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={row.isCredit}
                        onChange={(e) => onCardChange(index, { isCredit: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                      />
                    </div>
                  </td>
                  <td className={cellCls}>
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={row.isDisabled}
                        onChange={(e) => onCardChange(index, { isDisabled: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                      />
                    </div>
                  </td>
                  <td className="border-0 p-1">
                    <TrashBtn onClick={() => removeCardRow(row)} disabled={busyKey !== ''} hidden={!hasCardData(row) || isCardLinked(row.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Benefits ────────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">Benefits</h2>
          <div className="flex items-center gap-3">
            {saveStatus.benefits === 'success' && <span className="text-sm text-green-600">Saved!</span>}
            {saveStatus.benefits === 'failed' && <span className="text-sm text-red-600">Failed</span>}
            {saveStatus.benefits === 'saving' && <span className="text-sm text-slate-500">Saving...</span>}
            <button
              onClick={handleSaveBenefits}
              disabled={busyKey === 'saving-benefits' || !isBenefitsChanged}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1300px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className={thCls}>Category <Req /></th>
                <th className={thCls}>Expiry</th>
                <th className={thCls}>Type <Req /></th>
                <th className={thCls}>Cashback <Req /></th>
                <th className={thCls}>Quota</th>
                <th className={thCls}>Q. Remaining</th>
                <th className={thCls}>Q. Resets Monthly</th>
                <th className={thCls}>Min Spend</th>
                <th className={thCls}>Max Spend</th>
                <th className={thCls}>Cards</th>
                <th className={thCls}>Weekdays</th>
                <th className={thCls}>Channel</th>
                <th className={`${thCls} w-10`}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {benefitRows
                .map((row, index) => ({ row, index }))
                .filter(({ row, index }) => !isBenefitExpired(row.expiryDate) || index === benefitRows.length - 1)
                .map(({ row, index }) => (
                <tr key={row._key} className="group hover:bg-slate-50/60">
                  <td className={cellCls}>
                    <input
                      value={row.categoryName}
                      onChange={(e) => onBenefitChange(index, { categoryName: e.target.value })}
                      placeholder="Category"
                      className={`${inputCls} min-w-[120px]`}
                    />
                  </td>
                  <td className={cellCls}>
                    <DateInput
                      value={row.expiryDate}
                      onChange={(val) => onBenefitChange(index, { expiryDate: val })}
                      className={`${inputCls} min-w-[130px]`}
                    />
                  </td>
                  <td className={cellCls}>
                    <select
                      value={row.cashbackType}
                      onChange={(e) =>
                        onBenefitChange(index, { cashbackType: e.target.value as BenefitInput['cashbackType'] })
                      }
                      className={`${selectCls} min-w-[130px]`}
                    >
                      <option value="PERCENTAGE">Percentage</option>
                      <option value="ONE_TIME_CASH">One-time Cash</option>
                    </select>
                  </td>
                  <td className={cellCls}>
                    <input
                      type="number"
                      step="0.01"
                      value={row.cashbackAmount}
                      onChange={(e) => onBenefitChange(index, { cashbackAmount: e.target.value })}
                      placeholder="0.00"
                      className={`${inputCls} min-w-[90px]`}
                    />
                  </td>
                  <td className={cellCls}>
                    <input
                      type="number"
                      value={row.usageAvailable}
                      onChange={(e) => onBenefitChange(index, { usageAvailable: e.target.value })}
                      placeholder="—"
                      className={`${inputCls} min-w-[70px] ${
                        row.usageAvailable === '0'
                          ? '!bg-red-100 !text-red-900 focus:!bg-red-200 focus:!ring-red-400'
                          : ''
                      }`}
                    />
                  </td>
                  <td className={cellCls}>
                    <div className="flex h-full min-w-[70px] items-center text-center px-3 text-slate-500">
                      {row.usageAvailable ? (Number(row.usageAvailable) - (row.usageUsed || 0)) : '—'}
                    </div>
                  </td>
                  <td className={cellCls}>
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={row.quotaResetsMonthly}
                        onChange={(e) => onBenefitChange(index, { quotaResetsMonthly: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                      />
                    </div>
                  </td>
                  <td className={cellCls}>
                    <input
                      type="number"
                      step="0.01"
                      value={row.minimumSpending}
                      onChange={(e) => onBenefitChange(index, { minimumSpending: e.target.value })}
                      placeholder="—"
                      className={`${inputCls} min-w-[80px]`}
                    />
                  </td>
                  <td className={cellCls}>
                    <input
                      type="number"
                      step="0.01"
                      value={row.maximumSpending}
                      onChange={(e) => onBenefitChange(index, { maximumSpending: e.target.value })}
                      placeholder="—"
                      className={`${inputCls} min-w-[80px]`}
                    />
                  </td>
                  <td className={`${cellCls} min-w-[150px]`}>
                    <CardSelector
                      cards={cards}
                      selectedIds={row.linkedCardIds}
                      onChange={(ids) => onBenefitChange(index, { linkedCardIds: ids })}
                    />
                  </td>
                  <td className={`${cellCls} min-w-[140px]`}>
                    <MultiSelectPopup
                      options={weekdayOptions.map((d) => ({ value: d, label: d }))}
                      selected={row.applicableWeekdays}
                      onChange={(vals) => onBenefitChange(index, { applicableWeekdays: vals })}
                      placeholder="All days"
                    />
                  </td>
                  <td className={`${cellCls} min-w-[150px]`}>
                    <select
                      value={row.purchaseChannel || ''}
                      onChange={(e) => onBenefitChange(index, { purchaseChannel: e.target.value })}
                      className={`${selectCls} min-w-[140px] appearance-none max-w-[150px] overflow-hidden text-ellipsis`}
                    >
                      <option value="">All channels</option>
                      {channelOptions.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </td>
                  <td className="border-0 p-1">
                    <TrashBtn onClick={() => removeBenefitRow(row)} disabled={busyKey !== ''} hidden={!hasBenefitData(row)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Expired Benefits ────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
        <div 
          className="flex items-center justify-between border-slate-200 px-4 py-3 cursor-pointer select-none"
          onClick={() => setShowExpiredBenefits((prev) => !prev)}
        >
          <div className="flex items-center gap-2 text-slate-500">
            {showExpiredBenefits ? <ChevronDown className="h-4 w-4" /> : <ChevronDown className="h-4 w-4 -rotate-90" />}
            <h2 className="text-base font-semibold">Expired Benefits</h2>
          </div>
        </div>
        {showExpiredBenefits && (
          <div className="overflow-x-auto border-t border-slate-200 bg-white">
            <table className="min-w-[1300px] border-collapse text-sm">
              <tbody className="divide-y divide-slate-100">
                {benefitRows
                  .map((row, index) => ({ row, index }))
                  .filter(({ row, index }) => isBenefitExpired(row.expiryDate) && index !== benefitRows.length - 1)
                  .map(({ row, index }) => (
                  <tr key={row._key} className="group hover:bg-slate-50/60 opacity-60 hover:opacity-100 transition-opacity">
                    <td className={cellCls}>
                      <input
                        value={row.categoryName}
                        onChange={(e) => onBenefitChange(index, { categoryName: e.target.value })}
                        placeholder="Category"
                        className={`${inputCls} min-w-[120px]`}
                      />
                    </td>
                    <td className={cellCls}>
                      <DateInput
                        value={row.expiryDate}
                        onChange={(val) => onBenefitChange(index, { expiryDate: val })}
                        className={`${inputCls} min-w-[130px]`}
                      />
                    </td>
                    <td className={cellCls}>
                      <select
                        value={row.cashbackType}
                        onChange={(e) =>
                          onBenefitChange(index, { cashbackType: e.target.value as BenefitInput['cashbackType'] })
                        }
                        className={`${selectCls} min-w-[130px]`}
                      >
                        <option value="PERCENTAGE">Percentage</option>
                        <option value="ONE_TIME_CASH">One-time Cash</option>
                      </select>
                    </td>
                    <td className={cellCls}>
                      <input
                        type="number"
                        step="0.01"
                        value={row.cashbackAmount}
                        onChange={(e) => onBenefitChange(index, { cashbackAmount: e.target.value })}
                        placeholder="0.00"
                        className={`${inputCls} min-w-[90px]`}
                      />
                    </td>
                    <td className={cellCls}>
                      <input
                        type="number"
                        value={row.usageAvailable}
                        onChange={(e) => onBenefitChange(index, { usageAvailable: e.target.value })}
                        placeholder="—"
                        className={`${inputCls} min-w-[70px] ${
                          row.usageAvailable !== '' && row.usageUsed !== undefined && row.usageUsed >= parseInt(row.usageAvailable)
                            ? 'text-red-600 font-semibold'
                            : ''
                        }`}
                      />
                    </td>
                    <td className={`${cellCls} px-2 py-1.5 text-slate-500`}>
                      {row.usageAvailable !== '' && row.usageUsed !== undefined
                        ? Math.max(0, parseInt(row.usageAvailable) - row.usageUsed)
                        : '—'}
                    </td>
                    <td className={cellCls}>
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          checked={row.quotaResetsMonthly}
                          onChange={(e) => onBenefitChange(index, { quotaResetsMonthly: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                        />
                      </div>
                    </td>
                    <td className={cellCls}>
                      <input
                        type="number"
                        step="0.01"
                        value={row.minimumSpending}
                        onChange={(e) => onBenefitChange(index, { minimumSpending: e.target.value })}
                        placeholder="0.00"
                        className={`${inputCls} min-w-[90px]`}
                      />
                    </td>
                    <td className={cellCls}>
                      <input
                        type="number"
                        step="0.01"
                        value={row.maximumSpending}
                        onChange={(e) => onBenefitChange(index, { maximumSpending: e.target.value })}
                        placeholder="0.00"
                        className={`${inputCls} min-w-[90px]`}
                      />
                    </td>
                    <td className={`${cellCls} min-w-[180px]`}>
                      <CardSelector
                        cards={cards} // Using saved cards to let them map
                        selectedIds={row.linkedCardIds}
                        onChange={(ids) => onBenefitChange(index, { linkedCardIds: ids })}
                      />
                    </td>
                    <td className={`${cellCls} min-w-[140px]`}>
                      <MultiSelectPopup
                        options={weekdayOptions.map((d) => ({ value: d, label: d }))}
                        selected={row.applicableWeekdays}
                        onChange={(vals) => onBenefitChange(index, { applicableWeekdays: vals })}
                        placeholder="All days"
                      />
                    </td>
                    <td className={`${cellCls} min-w-[150px]`}>
                      <select
                        value={row.purchaseChannel || ''}
                        onChange={(e) => onBenefitChange(index, { purchaseChannel: e.target.value })}
                        className={`${selectCls} min-w-[140px] appearance-none max-w-[150px] overflow-hidden text-ellipsis`}
                      >
                        <option value="">All channels</option>
                        {channelOptions.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td className="border-0 p-1">
                      <TrashBtn onClick={() => removeBenefitRow(row)} disabled={busyKey !== ''} hidden={!hasBenefitData(row)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
