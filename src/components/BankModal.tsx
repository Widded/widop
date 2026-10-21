import React, { useState } from 'react';
import { Player } from '../types';
import { formatMoney } from '../utils/formatters';
import { Landmark, ArrowUpRight, ArrowDownLeft, AlertCircle, X, CheckCircle2 } from 'lucide-react';

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
  const [playerId, setPlayerId] = useState<string>(currentPlayer.id);
  const [direction, setDirection] = useState<'bank_to_player' | 'player_to_bank'>('bank_to_player');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPlayer = players.find((p) => p.id === playerId);
  const numAmount = parseInt(amount, 10) || 0;

  // Preset quick templates
  const presets = [
    { label: 'Başlangıçtan Geçiş (Maaş)', amount: 200, dir: 'bank_to_player' as const },
    { label: 'Şans / Kamu Fonu Ödülü', amount: 100, dir: 'bank_to_player' as const },
    { label: 'Gelir Vergisi', amount: 200, dir: 'player_to_bank' as const },
    { label: 'Lüks Vergisi / Ceza', amount: 100, dir: 'player_to_bank' as const },
    { label: 'Kodes Çıkış Harcı', amount: 50, dir: 'player_to_bank' as const },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedPlayer) {
      setError('Lütfen bir oyuncu seçin');
      return;
    }
    if (numAmount <= 0) {
      setError('Lütfen 0 ₺ den büyük bir tutar girin');
      return;
    }
    if (!description.trim()) {
      setError('Lütfen bir işlem açıklaması belirtin');
      return;
    }
    if (direction === 'player_to_bank' && selectedPlayer.balance < numAmount) {
      setError(`Yetersiz bakiye! Oyuncunun bakiyesi: ${formatMoney(selectedPlayer.balance)}`);
      return;
    }

    setLoading(true);
    try {
      await onBankTransaction(playerId, numAmount, direction, description.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Banka işlemi sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (p: typeof presets[0]) => {
    setDirection(p.dir);
    setAmount(p.amount.toString());
    setDescription(p.label);
    setError(null);
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
                background: 'rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--blue-primary)',
              }}
            >
              <Landmark size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px' }}>Banka İşlemleri</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Maaş, vergi ve resmi banka ödemeleri</p>
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

            {/* Hızlı Şablonlar */}
            <div>
              <label className="input-label">Hızlı İşlemler</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {presets.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="btn btn-secondary"
                    style={{
                      fontSize: '12px',
                      padding: '8px 12px',
                      minHeight: '36px',
                      borderColor: p.dir === 'bank_to_player' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)',
                    }}
                    onClick={() => handleSelectPreset(p)}
                  >
                    {p.dir === 'bank_to_player' ? '🟢' : '🔴'} {p.label} ({p.amount} ₺)
                  </button>
                ))}
              </div>
            </div>

            {/* İşlem Yönü Toggle */}
            <div>
              <label className="input-label">İşlem Türü</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  className={`btn ${direction === 'bank_to_player' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setDirection('bank_to_player')}
                  style={{ gap: '6px', fontSize: '13px' }}
                >
                  <ArrowDownLeft size={16} />
                  Bankadan Para Al
                </button>
                <button
                  type="button"
                  className={`btn ${direction === 'player_to_bank' ? 'btn-danger' : 'btn-secondary'}`}
                  onClick={() => setDirection('player_to_bank')}
                  style={{ gap: '6px', fontSize: '13px' }}
                >
                  <ArrowUpRight size={16} />
                  Bankaya Öde
                </button>
              </div>
            </div>

            {/* Oyuncu Seçimi */}
            <div>
              <label className="input-label">İşlem Yapılacak Oyuncu</label>
              <select
                className="input-field select-field"
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
              >
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.id === currentPlayer.id ? '(Siz)' : ''} — Bakiye: {formatMoney(p.balance)}
                  </option>
                ))}
              </select>
            </div>

            {/* Tutar */}
            <div>
              <label className="input-label">Tutar (₺)</label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                className="input-field num-font"
                style={{ fontSize: '20px', fontWeight: 700 }}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {/* Açıklama */}
            <div>
              <label className="input-label">Açıklama</label>
              <input
                type="text"
                placeholder="Örn: Başlangıç maaşı, Kodes çıkışı..."
                className="input-field"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Bakiye Değişimi Önizlemesi */}
            {selectedPlayer && numAmount > 0 && (
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>İşlem Sonrası Bakiye:</span>
                <strong
                  style={{
                    color: direction === 'bank_to_player' ? 'var(--emerald-primary)' : 'var(--rose-primary)',
                    fontSize: '16px',
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
              İptal
            </button>
            <button
              type="submit"
              className={`btn ${direction === 'bank_to_player' ? 'btn-primary' : 'btn-danger'}`}
              style={{ flex: 2 }}
              disabled={loading}
            >
              <CheckCircle2 size={18} />
              {loading ? 'İşleniyor...' : direction === 'bank_to_player' ? 'Bankadan Al' : 'Bankaya Öde'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
