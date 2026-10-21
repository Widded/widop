import React, { useState } from 'react';
import { Player } from '../types';
import { formatMoney } from '../utils/formatters';
import { ArrowRight, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface TransferModalProps {
  players: Player[];
  currentPlayer: Player;
  onClose: () => void;
  onTransfer: (fromPlayerId: string, toPlayerId: string, amount: number, note?: string) => Promise<void>;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  players,
  currentPlayer,
  onClose,
  onTransfer,
}) => {
  const [fromPlayerId, setFromPlayerId] = useState<string>(currentPlayer.id);
  const [toPlayerId, setToPlayerId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [step, setStep] = useState<'input' | 'confirm'>('input');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const sender = players.find((p) => p.id === fromPlayerId);
  const receiver = players.find((p) => p.id === toPlayerId);
  const numAmount = parseInt(amount, 10) || 0;

  const quickAmounts = [50, 100, 200, 500];

  const handleNext = () => {
    setError(null);
    if (!fromPlayerId) {
      setError('Lütfen para gönderen oyuncuyu seçin');
      return;
    }
    if (!toPlayerId) {
      setError('Lütfen alıcı oyuncuyu seçin');
      return;
    }
    if (fromPlayerId === toPlayerId) {
      setError('Kendinize para gönderemezsiniz');
      return;
    }
    if (numAmount <= 0) {
      setError('Lütfen 0 ₺ den büyük geçerli bir tutar girin');
      return;
    }
    if (sender && sender.balance < numAmount) {
      setError(`Yetersiz bakiye! Gönderenin bakiyesi: ${formatMoney(sender.balance)}`);
      return;
    }
    setStep('confirm');
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onTransfer(fromPlayerId, toPlayerId, numAmount, note.trim() || undefined);
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
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '18px' }}>Para Transferi</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {step === 'input' ? 'Transfer detaylarını girin' : 'Transferi onaylayın'}
            </p>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
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

          {step === 'input' ? (
            <>
              {/* Gönderen Oyuncu */}
              <div>
                <label className="input-label">Gönderen Oyuncu</label>
                <select
                  className="input-field select-field"
                  value={fromPlayerId}
                  onChange={(e) => setFromPlayerId(e.target.value)}
                >
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.id === currentPlayer.id ? '(Siz)' : ''} — Bakiye: {formatMoney(p.balance)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Alıcı Oyuncu */}
              <div>
                <label className="input-label">Alıcı Oyuncu</label>
                <select
                  className="input-field select-field"
                  value={toPlayerId}
                  onChange={(e) => setToPlayerId(e.target.value)}
                >
                  <option value="">Oyuncu Seçin...</option>
                  {players
                    .filter((p) => p.id !== fromPlayerId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — Bakiye: {formatMoney(p.balance)}
                      </option>
                    ))}
                </select>
              </div>

              {/* Tutar */}
              <div>
                <label className="input-label">Transfer Tutarı (₺)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  className="input-field num-font"
                  style={{ fontSize: '20px', fontWeight: 700 }}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  {quickAmounts.map((q) => (
                    <button
                      key={q}
                      type="button"
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '8px', fontSize: '13px', minHeight: '38px' }}
                      onClick={() => setAmount(q.toString())}
                    >
                      +{q} ₺
                    </button>
                  ))}
                </div>
              </div>

              {/* Açıklama */}
              <div>
                <label className="input-label">Açıklama (İsteğe bağlı)</label>
                <input
                  type="text"
                  placeholder="Örn: Mülk takası, yardım..."
                  className="input-field"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </>
          ) : (
            /* Onay Ekranı */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Gönderen</p>
                  <p style={{ fontWeight: 700, fontSize: '16px', marginTop: '4px' }}>{sender?.name}</p>
                  <p style={{ fontSize: '12px', color: 'var(--rose-primary)', marginTop: '2px' }}>
                    -{formatMoney(numAmount)}
                  </p>
                </div>

                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--emerald-primary)',
                  }}
                >
                  <ArrowRight size={20} />
                </div>

                <div style={{ textAlign: 'center', flex: 1 }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Alıcı</p>
                  <p style={{ fontWeight: 700, fontSize: '16px', marginTop: '4px' }}>{receiver?.name}</p>
                  <p style={{ fontSize: '12px', color: 'var(--emerald-primary)', marginTop: '2px' }}>
                    +{formatMoney(numAmount)}
                  </p>
                </div>
              </div>

              {/* Tutar Özeti */}
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Aktarılacak Tutar</p>
                <h2 style={{ fontSize: '28px', color: 'var(--emerald-primary)', marginTop: '4px' }}>
                  {formatMoney(numAmount)}
                </h2>
                {note && (
                  <p style={{ fontSize: '13px', color: 'var(--text-main)', marginTop: '6px', fontStyle: 'italic' }}>
                    "{note}"
                  </p>
                )}
              </div>

              {/* Yeni Bakiye Önizlemesi */}
              {sender && (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Gönderenin kalan bakiyesi:{' '}
                  <strong style={{ color: 'var(--text-main)' }}>
                    {formatMoney(sender.balance - numAmount)}
                  </strong>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step === 'confirm' ? (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setStep('input')}
                disabled={loading}
              >
                Geri Dön
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 2 }}
                onClick={handleConfirm}
                disabled={loading}
              >
                <CheckCircle2 size={18} />
                {loading ? 'İşleniyor...' : 'Transferi Onayla'}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
                İptal
              </button>
              <button type="button" className="btn btn-primary" style={{ flex: 2 }} onClick={handleNext}>
                Devam Et
                <ArrowRight size={18} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
