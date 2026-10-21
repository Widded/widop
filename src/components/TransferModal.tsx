import React, { useState } from 'react';
import { Player } from '../types';
import { formatMoney } from '../utils/formatters';
import { Send, AlertCircle, X, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface TransferModalProps {
  players: Player[];
  currentPlayer: Player;
  initialToPlayerId?: string;
  onClose: () => void;
  onTransfer: (fromPlayerId: string, toPlayerId: string, amount: number, note?: string) => Promise<void>;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  players,
  currentPlayer,
  initialToPlayerId,
  onClose,
  onTransfer,
}) => {
  const otherPlayers = players.filter((p) => p.id !== currentPlayer.id);
  const [toPlayerId, setToPlayerId] = useState<string>(() => {
    if (initialToPlayerId && otherPlayers.some((p) => p.id === initialToPlayerId)) {
      return initialToPlayerId;
    }
    return otherPlayers[0]?.id || '';
  });
  const [amount, setAmount] = useState<string>('100');
  const [note, setNote] = useState<string>('');
  const [step, setStep] = useState<'input' | 'confirm'>('input');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const receiver = players.find((p) => p.id === toPlayerId);
  const numAmount = parseInt(amount, 10) || 0;
  const quickAmounts = [50, 100, 200, 500];

  const handleProceedToConfirm = () => {
    setError(null);
    if (!toPlayerId) {
      setError('Lütfen parayı alacak oyuncuyu seçin');
      return;
    }
    if (currentPlayer.id === toPlayerId) {
      setError('Kendinize para gönderemezsiniz');
      return;
    }
    if (numAmount <= 0) {
      setError('Lütfen 0 ₺ den büyük geçerli bir tutar girin');
      return;
    }
    if (currentPlayer.balance < numAmount) {
      setError(`Yetersiz bakiye! Mevcut bakiyeniz: ${formatMoney(currentPlayer.balance)}`);
      return;
    }
    setStep('confirm');
  };

  const handleExecuteTransfer = async () => {
    if (!receiver || numAmount <= 0) return;
    setLoading(true);
    setError(null);
    try {
      await onTransfer(currentPlayer.id, toPlayerId, numAmount, note.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Transfer sırasında bir hata oluştu');
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {step === 'confirm' && (
              <button
                type="button"
                className="btn-icon"
                style={{ width: '30px', height: '30px', minHeight: '30px' }}
                onClick={() => setStep('input')}
                disabled={loading}
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h3 style={{ fontSize: '17px' }}>
                {step === 'confirm' ? 'Transferi Onayla' : 'Para Gönder'}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Bakiyeniz: <strong style={{ color: 'var(--emerald-primary)' }}>{formatMoney(currentPlayer.balance)}</strong>
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} disabled={loading}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--rose-primary)',
                fontSize: '13px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {step === 'input' ? (
            <>
              {/* 1. Alıcı Oyuncu Seçimi */}
              <div>
                <label className="input-label">Alıcı Oyuncu</label>
                {otherPlayers.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Odada başka oyuncu bulunmuyor.</p>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${Math.min(otherPlayers.length, 3)}, 1fr)`,
                      gap: '8px',
                    }}
                  >
                    {otherPlayers.map((p) => {
                      const isSelected = p.id === toPlayerId;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setToPlayerId(p.id)}
                          className="card"
                          style={{
                            padding: '10px 6px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            borderColor: isSelected ? 'var(--emerald-primary)' : 'var(--border-subtle)',
                            background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-card)',
                            boxShadow: isSelected ? '0 0 0 1px var(--emerald-primary)' : 'none',
                          }}
                        >
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: isSelected ? 'var(--emerald-primary)' : 'rgba(255, 255, 255, 0.08)',
                              color: isSelected ? '#03140a' : 'var(--text-main)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '14px',
                              margin: '0 auto 6px',
                            }}
                          >
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.name}
                          </div>
                          <div className="num-font" style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                            {formatMoney(p.balance)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. Tutar ve Hızlı Miktar Butonları */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="input-label" style={{ marginBottom: 0 }}>Gönderilecek Tutar (₺)</label>
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-dim)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                    onClick={() => setAmount(currentPlayer.balance.toString())}
                  >
                    Tümü ({formatMoney(currentPlayer.balance)})
                  </button>
                </div>

                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  className="input-field num-font"
                  style={{ fontSize: '26px', fontWeight: 800, textAlign: 'center', color: 'var(--emerald-primary)' }}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                />

                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  {quickAmounts.map((q) => (
                    <button
                      key={q}
                      type="button"
                      className="btn btn-secondary"
                      style={{
                        flex: 1,
                        padding: '6px 4px',
                        fontSize: '13px',
                        fontWeight: 700,
                        minHeight: '36px',
                        borderColor: numAmount === q ? 'var(--emerald-primary)' : undefined,
                        background: numAmount === q ? 'rgba(16, 185, 129, 0.12)' : undefined,
                      }}
                      onClick={() => setAmount(q.toString())}
                    >
                      +{q} ₺
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Açıklama */}
              <div>
                <label className="input-label">Açıklama (İsteğe bağlı)</label>
                <input
                  type="text"
                  placeholder="Örn: Kira, tapu takası, borç ödeme..."
                  className="input-field"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </>
          ) : (
            /* STEP 2: ONAY EKRANI */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Gönderen:</span>
                  <strong style={{ fontSize: '14px' }}>{currentPlayer.name} (Siz)</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Alıcı:</span>
                  <strong style={{ fontSize: '15px', color: 'var(--emerald-primary)' }}>{receiver?.name}</strong>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 0',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 700 }}>Transfer Tutarı:</span>
                  <span className="num-font" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--emerald-primary)' }}>
                    {formatMoney(numAmount)}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Transfer Sonrası Kalan Bakiyeniz:</span>
                  <span className="num-font" style={{ fontSize: '13px', fontWeight: 700 }}>
                    {formatMoney(currentPlayer.balance - numAmount)}
                  </span>
                </div>

                {note.trim() && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Açıklama:</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{note.trim()}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          {step === 'input' ? (
            <>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={loading}>
                Vazgeç
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 2, fontWeight: 800 }}
                onClick={handleProceedToConfirm}
                disabled={!receiver || numAmount <= 0 || currentPlayer.balance < numAmount}
              >
                Devam Et ➔
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setStep('input')}
                disabled={loading}
              >
                Geri
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 2, fontWeight: 800 }}
                onClick={handleExecuteTransfer}
                disabled={loading}
              >
                <Send size={16} />
                {loading ? 'Gönderiliyor...' : 'Onayla ve Gönder 💸'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
