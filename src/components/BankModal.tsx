import React, { useState } from 'react';
import { Player } from '../types';
import { formatMoney } from '../utils/formatters';
import { Landmark, ArrowUpRight, ArrowDownLeft, AlertCircle, X, CheckCircle2, ShieldCheck } from 'lucide-react';

interface BankModalProps {
  players: Player[];
  currentPlayer: Player;
  onClose: () => void;
  onBankTransaction: (
    playerId: string,
    amount: number,
    direction: 'bank_to_player' | 'player_to_bank',
    description: string
  ) => Promise<void>;
}

export const BankModal: React.FC<BankModalProps> = ({
  players,
  currentPlayer,
  onClose,
  onBankTransaction,
}) => {
  const isBanker = currentPlayer.is_banker;

  // If not banker, direction is locked to player_to_bank and playerId is locked to current player
  const [playerId, setPlayerId] = useState<string>(currentPlayer.id);
  const [direction, setDirection] = useState<'bank_to_player' | 'player_to_bank'>(
    isBanker ? 'bank_to_player' : 'player_to_bank'
  );
  const [amount, setAmount] = useState<string>('100');
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPlayer = players.find((p) => p.id === playerId) || currentPlayer;
  const numAmount = parseInt(amount, 10) || 0;

  // Preset templates depending on role
  const bankerPresets = [
    { label: 'Başlangıç Maaşı (+200 ₺)', amount: 200, dir: 'bank_to_player' as const },
    { label: 'Şans / Fon Ödülü (+100 ₺)', amount: 100, dir: 'bank_to_player' as const },
    { label: 'Gelir Vergisi (-200 ₺)', amount: 200, dir: 'player_to_bank' as const },
    { label: 'Lüks Vergisi / Ceza (-100 ₺)', amount: 100, dir: 'player_to_bank' as const },
    { label: 'Kodes Çıkış Harcı (-50 ₺)', amount: 50, dir: 'player_to_bank' as const },
  ];

  const playerPresets = [
    { label: 'Gelir Vergisi (200 ₺)', amount: 200, dir: 'player_to_bank' as const },
    { label: 'Lüks Vergisi / Ceza (100 ₺)', amount: 100, dir: 'player_to_bank' as const },
    { label: 'Kodes Çıkış Harcı (50 ₺)', amount: 50, dir: 'player_to_bank' as const },
  ];

  const presets = isBanker ? bankerPresets : playerPresets;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Security check: non-bankers cannot add money from bank
    if (!isBanker && direction === 'bank_to_player') {
      setError('Para ekleme işlemi yalnızca Masa Bankacısı tarafından yapılabilir!');
      return;
    }

    if (numAmount <= 0) {
      setError('Lütfen 0 ₺ den büyük geçerli bir tutar girin');
      return;
    }
    const finalDesc = description.trim() || (direction === 'bank_to_player' ? 'Banka Ödemesi' : 'Bankaya Ödeme');

    if (direction === 'player_to_bank' && selectedPlayer.balance < numAmount) {
      setError(`Yetersiz bakiye! Mevcut bakiye: ${formatMoney(selectedPlayer.balance)}`);
      return;
    }

    setLoading(true);
    try {
      await onBankTransaction(playerId, numAmount, direction, finalDesc);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Banka işlemi sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (p: { label: string; amount: number; dir: 'bank_to_player' | 'player_to_bank' }) => {
    if (isBanker) {
      setDirection(p.dir);
    }
    setAmount(p.amount.toString());
    setDescription(p.label.replace(/\([+-]?\d+ ₺\)/, '').trim());
    setError(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: isBanker ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isBanker ? 'var(--emerald-primary)' : 'var(--rose-primary)',
              }}
            >
              <Landmark size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isBanker ? '👑 Banka & Kasa Yönetimi' : 'Bankaya Ödeme Yap'}
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {isBanker ? 'Oyunculara maaş verin veya resmi tahsilat yapın' : 'Vergi, ceza ve kodes çıkış harcı ödemesi'}
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div
                style={{
                  background: 'rgba(244, 63, 94, 0.12)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--rose-primary)',
                  fontSize: '12px',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Normal oyuncu bilgilendirmesi */}
            {!isBanker && (
              <div
                style={{
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12px',
                  color: 'var(--blue-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <ShieldCheck size={16} style={{ flexShrink: 0 }} />
                <span>Para ekleme ve maaş dağıtımı yalnızca Masa Bankacısı tarafından yapılır.</span>
              </div>
            )}

            {/* İşlem Yönü Toggle (Yalnızca Bankacı için açık) */}
            {isBanker ? (
              <div>
                <label className="input-label">İşlem Türü</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    className={`btn ${direction === 'bank_to_player' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setDirection('bank_to_player')}
                    style={{ gap: '6px', fontSize: '12px', minHeight: '38px', fontWeight: 700 }}
                  >
                    <ArrowDownLeft size={16} />
                    Oyuncuya Para Ver
                  </button>
                  <button
                    type="button"
                    className={`btn ${direction === 'player_to_bank' ? 'btn-danger' : 'btn-secondary'}`}
                    onClick={() => setDirection('player_to_bank')}
                    style={{ gap: '6px', fontSize: '12px', minHeight: '38px', fontWeight: 700 }}
                  >
                    <ArrowUpRight size={16} />
                    Bankaya Tahsil Et
                  </button>
                </div>
              </div>
            ) : null}

            {/* Hızlı Şablonlar (Tek Dokunuşla Tutar & Açıklama) */}
            <div>
              <label className="input-label">Hızlı Seçenekler</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {presets.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="btn btn-secondary"
                    style={{
                      fontSize: '11px',
                      padding: '6px 10px',
                      minHeight: '32px',
                      borderColor:
                        p.dir === 'bank_to_player' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.3)',
                    }}
                    onClick={() => handleSelectPreset(p)}
                  >
                    {p.dir === 'bank_to_player' ? '🟢' : '🔴'} {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bankacı ise Oyuncu Seçimi */}
            {isBanker && (
              <div>
                <label className="input-label">Hedef Oyuncu</label>
                <select
                  className="input-field select-field"
                  value={playerId}
                  onChange={(e) => setPlayerId(e.target.value)}
                  style={{ fontSize: '14px', padding: '10px 12px' }}
                >
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.id === currentPlayer.id ? '(Siz - Bankacı)' : ''} — Bakiye: {formatMoney(p.balance)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Tutar Girişi ve Hızlı Arttırıcılar */}
            <div>
              <label className="input-label">Ödenecek Tutar (₺)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  className="input-field num-font"
                  style={{ fontSize: '24px', fontWeight: 800, paddingRight: '45px' }}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <span
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: 'var(--text-dim)',
                  }}
                >
                  ₺
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                {[50, 100, 200, 500].map((val) => (
                  <button
                    key={val}
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '4px', fontSize: '11px', minHeight: '28px' }}
                    onClick={() => setAmount(val.toString())}
                  >
                    {val} ₺
                  </button>
                ))}
              </div>
            </div>

            {/* Açıklama */}
            <div>
              <label className="input-label">İşlem Notu (Opsiyonel)</label>
              <input
                type="text"
                placeholder={isBanker ? 'Örn: Başlangıç maaşı' : 'Örn: Gelir vergisi'}
                className="input-field"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Önizleme */}
            {selectedPlayer && numAmount > 0 && (
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {direction === 'bank_to_player' ? `${selectedPlayer.name} Yeni Bakiyesi:` : 'Kalan Bakiyeniz:'}
                </span>
                <strong
                  className="num-font"
                  style={{
                    color: direction === 'bank_to_player' ? 'var(--emerald-primary)' : 'var(--rose-primary)',
                    fontSize: '15px',
                  }}
                >
                  {direction === 'bank_to_player'
                    ? formatMoney(selectedPlayer.balance + numAmount)
                    : formatMoney(selectedPlayer.balance - numAmount)}
                </strong>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
              Kapat
            </button>
            <button
              type="submit"
              className={`btn ${direction === 'bank_to_player' ? 'btn-primary' : 'btn-danger'}`}
              style={{ flex: 2, fontWeight: 800 }}
              disabled={loading}
            >
              <CheckCircle2 size={16} />
              {loading
                ? 'İşleniyor...'
                : direction === 'bank_to_player'
                ? `${formatMoney(numAmount)} Oyuncuya Ver`
                : `${formatMoney(numAmount)} Bankaya Öde`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
