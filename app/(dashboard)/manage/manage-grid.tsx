'use client';

import { removeBenefit, removeCard, removeFriend, saveBenefit, saveCard, saveFriend } from '@/app/actions/manage';
import { Trash2, GripVertical, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

type FriendInput = {
  id: string;
  email: string;
  monthlyLimit: string;
  activeUntil: string;
};

type CardInput = {
  id: string;
  name: string;
  expiryDate: string;
  monthlyLimit: string;
};

type BenefitInput = {
  id: string;
  categoryName: string;
  expiryDate: string;
  cashbackType: 'PERCENTAGE' | 'ONE_TIME_CASH';
  cashbackAmount: string;
  usageAvailable: string;
  minimumSpending: string;
  maximumSpending: string;
  applicableWeekdays: string[];
  purchaseChannels: string[];
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
  monthlyLimit: '',
  activeUntil: '',
});

const blankCard = (): Row<CardInput> => ({
  _key: createKey(),
  id: '',
  name: '',
  expiryDate: '',
  monthlyLimit: '',
});

const blankBenefit = (): Row<BenefitInput> => ({
  _key: createKey(),
  id: '',
  categoryName: '',
  expiryDate: '',
  cashbackType: 'PERCENTAGE',
  cashbackAmount: '',
  usageAvailable: '',
  minimumSpending: '',
  maximumSpending: '',
  applicableWeekdays: [],
  purchaseChannels: [],
  linkedCardIds: [],
});

const hasFriendData = (row: FriendInput) =>
  row.email.trim() !== '';

const hasCardData = (row: CardInput) =>
  row.name.trim() !== '';

const hasBenefitData = (row: BenefitInput) =>
  row.categoryName.trim() !== '' ||
  row.cashbackAmount.trim() !== '';

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

  const [friendRows, setFriendRows] = useState<Row<FriendInput>[]>(() => [...withKey(friends), blankFriend()]);
  const [cardRows, setCardRows] = useState<Row<CardInput>[]>(() => [...withKey(cards), blankCard()]);
  const [benefitRows, setBenefitRows] = useState<Row<BenefitInput>[]>(() => [...withKey(benefits), blankBenefit()]);

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
      const res = await saveFriend(toFormData([['id', row.id], ['email', row.email], ['monthlyLimit', row.monthlyLimit], ['activeUntil', row.activeUntil]]));
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
      const res = await saveCard(toFormData([['id', row.id], ['name', row.name], ['expiryDate', row.expiryDate], ['monthlyLimit', row.monthlyLimit]]));
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
          ['minimumSpending', row.minimumSpending],
          ['maximumSpending', row.maximumSpending],
          ['applicableWeekdays', row.applicableWeekdays],
          ['purchaseChannels', row.purchaseChannels],
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

  const handleSaveAll = async () => {
    setBusyKey('saving-all');
    try {
      const friendPromises = friendRows.filter(hasFriendData).map(saveFriendRow);
      const cardPromises = cardRows.filter(hasCardData).map(saveCardRow);
      const benefitPromises = benefitRows.filter(hasBenefitData).map(saveBenefitRow);
      await Promise.all([...friendPromises, ...cardPromises, ...benefitPromises]);
      router.refresh();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Manage</h1>
        <button
          onClick={handleSaveAll}
          disabled={busyKey !== ''}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 transition-colors"
        >
          {busyKey === 'saving-all' ? 'Saving...' : 'Save Manage'}
        </button>
      </div>

      {/* ── Friends ─────────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">Friends</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className={thCls}>Email <Req /></th>
                <th className={thCls}>Monthly Limit</th>
                <th className={thCls}>Active Until</th>
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
                      type="number"
                      step="0.01"
                      value={row.monthlyLimit}
                      onChange={(e) => onFriendChange(index, { monthlyLimit: e.target.value })}
                      placeholder="0.00"
                      className={inputCls}
                    />
                  </td>
                  <td className={cellCls}>
                    <input
                      type="date"
                      value={row.activeUntil}
                      onChange={(e) => onFriendChange(index, { activeUntil: e.target.value })}
                      className={inputCls}
                    />
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
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">Cards</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Drag a saved card row into the Benefits &ldquo;Cards&rdquo; column below.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className={`${thCls} w-7`}></th>
                <th className={thCls}>Name <Req /></th>
                <th className={thCls}>Expiry</th>
                <th className={thCls}>Monthly Limit</th>
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
                      type="date"
                      value={row.expiryDate}
                      onChange={(e) => onCardChange(index, { expiryDate: e.target.value })}
                      className={inputCls}
                    />
                  </td>
                  <td className={cellCls}>
                    <input
                      type="number"
                      step="0.01"
                      value={row.monthlyLimit}
                      onChange={(e) => onCardChange(index, { monthlyLimit: e.target.value })}
                      placeholder="0.00"
                      className={inputCls}
                    />
                  </td>
                  <td className="border-0 p-1">
                    <TrashBtn onClick={() => removeCardRow(row)} disabled={busyKey !== ''} hidden={!hasCardData(row)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Benefits ────────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">Benefits</h2>
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
                <th className={thCls}>Min Spend</th>
                <th className={thCls}>Max Spend</th>
                <th className={thCls}>Cards</th>
                <th className={thCls}>Weekdays</th>
                <th className={thCls}>Channels</th>
                <th className={`${thCls} w-10`}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {benefitRows.map((row, index) => (
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
                    <input
                      type="date"
                      value={row.expiryDate}
                      onChange={(e) => onBenefitChange(index, { expiryDate: e.target.value })}
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
                      className={`${inputCls} min-w-[70px]`}
                    />
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
                    <MultiSelectPopup
                      options={channelOptions.map((c) => ({ value: c, label: c }))}
                      selected={row.purchaseChannels}
                      onChange={(vals) => onBenefitChange(index, { purchaseChannels: vals })}
                      placeholder="All channels"
                    />
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
    </div>
  );
};
