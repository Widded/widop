import React, { useState } from 'react';
import { Debt, Player } from '../types';
import { formatMoney } from '../utils/formatters';
import { HandCoins, Plus, CheckCheck, AlertCircle, X, ShieldAlert } from 'lucide-react';

interface DebtModalProps {
  players: Player[];
  debts: Debt[];
  currentPlayer: Player;
  onClose: () => void;
  onCreateDebt: (creditorId: string, debtorId: string, amount: number, reason: string) => Promise<void>;
  onPayDebt: (debtId: string, payerId: string, paymentAmount: number, forgivenAmount: number) => Promise<void>;
}

export const DebtModal: React.FC<DebtModalProps> = ({
  players,
  debts,
  currentPlayer,
  onClose,
  onCreateDebt,
  onPayDebt,
}) => {
  const [tab, setTab] = useState<'list' | 'create' | 'pay'>('list');
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);

  // Create form state
  const [creditorId, setCreditorId] = useState<string>(currentPlayer.id);
  const [debtorId, setDebtorId] = useState<string>('');
  const [createAmount, setCreateAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [forgivenAmount, setForgivenAmount] = useState<string>('0');
  const [isSettlement, setIsSettlement] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const openDebts = debts.filter((d) => d.status === 'open');

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amountNum = parseInt(createAmount, 10) || 0;

    if (!creditorId || !debtorId) {
      setError('Lütfen borç veren ve alan oyuncuları seçin');
      return;
    }
    if (creditorId === debtorId) {
      setError('Kendinize borç veremezsiniz');
      return;
    }
    if (amountNum <= 0) {
      setError('Lütfen 0 ₺ den büyük bir borç tutarı girin');
      return;
    }

    const creditor = players.find((p) => p.id === creditorId);
    if (creditor && creditor.balance < amountNum) {
      setError(`Borç veren oyuncunun nakit parası yetersiz! Bakiye: ${formatMoney(creditor.balance)}`);
      return;
    }

    setLoading(true);
    try {
      await onCreateDebt(creditorId, debtorId, amountNum, reason.trim() || 'Borç');
      setTab('list');
      setCreateAmount('');
      setReason('');
    } catch (err: any) {
      setError(err.message || 'Borç oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  const startPaymentFlow = (debt: Debt, settleAgreement: boolean) => {
    setSelectedDebt(debt);
    setIsSettlement(settleAgreement);
    setPaymentAmount(debt.current_amount.toString());
    setForgivenAmount('0');
    setError(null);
    setTab('pay');
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt) return;
    setError(null);

    const payNum = parseInt(paymentAmount, 10) || 0;
    const forgiveNum = isSettlement ? parseInt(forgivenAmount, 10) || 0 : 0;
    const totalReduction = payNum + forgiveNum;

    if (totalReduction <= 0) {
      setError('Lütfen ödenecek veya silinecek bir tutar girin');
      return;
    }
    if (totalReduction > selectedDebt.current_amount) {
      setError(
        `Toplam indirim (${formatMoney(totalReduction)}) mevcut borç tutarından (${formatMoney(
          selectedDebt.current_amount
        )}) fazla olamaz!`
      );
      return;
    }

    const debtor = players.find((p) => p.id === selectedDebt.debtor_id);
    if (debtor && debtor.balance < payNum) {
      setError(`Borçlunun nakit bakiyesi yetersiz! Bakiye: ${formatMoney(debtor.balance)}`);
      return;
    }

    setLoading(true);
    try {
      await onPayDebt(selectedDebt.id, selectedDebt.debtor_id, payNum, forgiveNum);
      setTab('list');
      setSelectedDebt(null);
    } catch (err: any) {
      setError(err.message || 'Borç ödemesi başarısız oldu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--amber-primary)',
              }}
            >
              <HandCoins size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px' }}>Oyuncular Arası Borçlar</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Borç verme, ödeme ve anlaşmalı kapatma</p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Sekmeler */}
        <div
          style={{
            display: 'flex',
            padding: '8px 20px 0',
            borderBottom: '1px solid var(--border-subtle)',
            gap: '8px',
          }}
        >
          <button
            type="button"
            className="btn"
            style={{
              padding: '8px 14px',
              minHeight: '36px',
              fontSize: '13px',
              borderBottom: tab === 'list' ? '2px solid var(--emerald-primary)' : 'none',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              background: tab === 'list' ? 'var(--bg-card)' : 'transparent',
              color: tab === 'list' ? 'var(--text-main)' : 'var(--text-muted)',
            }}
            onClick={() => {
              setTab('list');
              setError(null);
            }}
          >
            Açık Borçlar ({openDebts.length})
          </button>

          <button
            type="button"
            className="btn"
            style={{
              padding: '8px 14px',
              minHeight: '36px',
              fontSize: '13px',
              borderBottom: tab === 'create' ? '2px solid var(--emerald-primary)' : 'none',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              background: tab === 'create' ? 'var(--bg-card)' : 'transparent',
              color: tab === 'create' ? 'var(--text-main)' : 'var(--text-muted)',
            }}
            onClick={() => {
              setTab('create');
              setError(null);
            }}
          >
            <Plus size={14} />
            Yeni Borç Ver
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div
              style={{
                background: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: 'var(--rose-primary)',
                fontSize: '13px',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: Açık Borçlar Listesi */}
          {tab === 'list' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {openDebts.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '36px 16px',
                    color: 'var(--text-muted)',
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <HandCoins size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                  <p style={{ fontWeight: 600 }}>Şu anda açık bir borç bulunmuyor.</p>
                  <p style={{ fontSize: '12px', marginTop: '4px' }}>
                    Bir arkadaşınıza nakit borç vermek için "Yeni Borç Ver" butonunu kullanabilirsiniz.
                  </p>
                </div>
              ) : (
                openDebts.map((debt) => {
                  const creditor = players.find((p) => p.id === debt.creditor_id);
                  const debtor = players.find((p) => p.id === debt.debtor_id);
                  const isDebtor = debtor?.id === currentPlayer.id;
                  const isCreditor = creditor?.id === currentPlayer.id;

                  return (
                    <div
                      key={debt.id}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                            {debtor?.name}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-dim)', margin: '0 6px' }}>➔</span>
                          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{creditor?.name}</span>
                        </div>
                        <span className="badge badge-amber">{formatMoney(debt.current_amount)}</span>
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                        Neden: {debt.reason} | İlk Tutar: {formatMoney(debt.original_amount)}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ flex: 1, padding: '8px', fontSize: '12px', minHeight: '36px' }}
                          onClick={() => startPaymentFlow(debt, false)}
                        >
                          Ödeme Yap
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{
                            flex: 1,
                            padding: '8px',
                            fontSize: '12px',
                            minHeight: '36px',
                            borderColor: 'rgba(16, 185, 129, 0.4)',
                            color: 'var(--emerald-primary)',
                          }}
                          onClick={() => startPaymentFlow(debt, true)}
                        >
                          <CheckCheck size={14} />
                          Anlaşmalı Kapat
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: Yeni Borç Verme Formu */}
          {tab === 'create' && (
            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="input-label">Borcu Veren (Alacaklı)</label>
                <select
                  className="input-field select-field"
                  value={creditorId}
                  onChange={(e) => setCreditorId(e.target.value)}
                >
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.id === currentPlayer.id ? '(Siz)' : ''} — Bakiye: {formatMoney(p.balance)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="input-label">Borcu Alan (Borçlu)</label>
                <select
                  className="input-field select-field"
                  value={debtorId}
                  onChange={(e) => setDebtorId(e.target.value)}
                >
                  <option value="">Oyuncu Seçin...</option>
                  {players
                    .filter((p) => p.id !== creditorId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — Bakiye: {formatMoney(p.balance)}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="input-label">Borç Tutarı (₺)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  className="input-field num-font"
                  style={{ fontSize: '20px', fontWeight: 700 }}
                  value={createAmount}
                  onChange={(e) => setCreateAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="input-label">Açıklama / Sebep</label>
                <input
                  type="text"
                  placeholder="Örn: Kira için borç, mülk alımı desteği..."
                  className="input-field"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div
                style={{
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                }}
              >
                ℹ️ <strong>İşlem Sonucu:</strong> Borç veren oyuncunun bakiyesinden bu tutar düşülür, borçluya aktarılır
                ve sisteme açık borç olarak kaydedilir.
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ marginTop: '8px' }}
                disabled={loading}
              >
                {loading ? 'Kaydediliyor...' : 'Borcu Ver ve Kaydet'}
              </button>
            </form>
          )}

          {/* TAB 3: Borç Ödeme / Anlaşmalı Kapatma */}
          {tab === 'pay' && selectedDebt && (
            <form onSubmit={handlePaySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Mevcut Açık Borç:</span>
                  <strong style={{ fontSize: '16px', color: 'var(--amber-primary)' }}>
                    {formatMoney(selectedDebt.current_amount)}
                  </strong>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                  Borçlu: {players.find((p) => p.id === selectedDebt.debtor_id)?.name} ➔ Alacaklı:{' '}
                  {players.find((p) => p.id === selectedDebt.creditor_id)?.name}
                </div>
              </div>

              {isSettlement ? (
                <>
                  <div
                    style={{
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                      fontSize: '12px',
                      color: 'var(--emerald-primary)',
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center',
                    }}
                  >
                    <CheckCheck size={18} style={{ flexShrink: 0 }} />
                    <span>
                      <strong>Anlaşmalı Borç Kapatma:</strong> Tarafların karşılıklı mutabakatıyla kalan borcun bir
                      kısmı ödenir, alacaklı kalanından feragat eder ve borç tamamen kapatılır.
                    </span>
                  </div>

                  <div>
                    <label className="input-label">Fiilen Ödenecek Nakit Tutar (₺)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      className="input-field num-font"
                      style={{ fontSize: '18px', fontWeight: 700 }}
                      value={paymentAmount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        setPaymentAmount(e.target.value);
                        setForgivenAmount(Math.max(0, selectedDebt.current_amount - val).toString());
                      }}
                    />
                  </div>

                  <div>
                    <label className="input-label">Alacaklının Feragat Ettiği (Sildiği) Tutar (₺)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      className="input-field num-font"
                      style={{ fontSize: '18px', fontWeight: 700 }}
                      value={forgivenAmount}
                      onChange={(e) => setForgivenAmount(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="input-label">Ödenecek Tutar (Kısmi veya Tam Ödeme)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      className="input-field num-font"
                      style={{ fontSize: '20px', fontWeight: 700 }}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ flex: 1, padding: '6px', fontSize: '12px', minHeight: '32px' }}
                        onClick={() => setPaymentAmount(selectedDebt.current_amount.toString())}
                      >
                        Tamamını Öde ({formatMoney(selectedDebt.current_amount)})
                      </button>
                      {selectedDebt.current_amount > 100 && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ flex: 1, padding: '6px', fontSize: '12px', minHeight: '32px' }}
                          onClick={() => setPaymentAmount('100')}
                        >
                          100 ₺ Öde
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setTab('list')}
                >
                  Geri
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                  disabled={loading}
                >
                  {loading ? 'İşleniyor...' : isSettlement ? 'Anlaşmayı Onayla ve Kapat' : 'Ödemeyi Yap'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
