import React, { useState, useMemo } from 'react';
import { Player, Property } from '../types';
import { formatMoney } from '../utils/formatters';
import { calculateCurrentRent } from '../data/monopolyIstanbulData';
import { CheckCircle2, AlertCircle, X, Home, ArrowRight, Dices } from 'lucide-react';

interface RentModalProps {
  properties: Property[];
  players: Player[];
  currentPlayer: Player;
  onClose: () => void;
  onPayRent: (payerId: string, propertyId: string, finalAmount: number, note?: string) => Promise<void>;
}

export const RentModal: React.FC<RentModalProps> = ({
  properties,
  players,
  currentPlayer,
  onClose,
  onPayRent,
}) => {
  const [payerId, setPayerId] = useState<string>(currentPlayer.id);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [diceRoll, setDiceRoll] = useState<number>(7);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [step, setStep] = useState<'select' | 'confirm'>('select');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filter properties that have an owner who is NOT the payer
  const eligibleProperties = useMemo(() => {
    return properties.filter((p) => p.owner_id && p.owner_id !== payerId);
  }, [properties, payerId]);

  const selectedProperty = useMemo(() => {
    return properties.find((p) => p.id === selectedPropertyId) || null;
  }, [properties, selectedPropertyId]);

  const propertyOwner = useMemo(() => {
    if (!selectedProperty?.owner_id) return null;
    return players.find((p) => p.id === selectedProperty.owner_id) || null;
  }, [selectedProperty, players]);

  const payer = useMemo(() => {
    return players.find((p) => p.id === payerId) || null;
  }, [players, payerId]);

  // Standard calculated rent
  const rentCalc = useMemo(() => {
    if (!selectedProperty) return { amount: 0, description: '' };
    return calculateCurrentRent(selectedProperty, properties, diceRoll);
  }, [selectedProperty, properties, diceRoll]);

  const finalAmount = customAmount !== '' ? parseInt(customAmount, 10) || 0 : rentCalc.amount;

  const handleNext = () => {
    setError(null);
    if (!selectedProperty) {
      setError('Lütfen üzerine gelinen mülkü seçin');
      return;
    }
    if (!propertyOwner) {
      setError('Mülkün sahibi bulunamadı');
      return;
    }
    if (selectedProperty.is_mortgaged) {
      setError('Bu mülk ipoteklidir. Monopoly kurallarına göre ipotekli mülkten kira alınamaz.');
      return;
    }
    if (finalAmount < 0) {
      setError('Kira tutarı negatif olamaz');
      return;
    }
    if (payer && payer.balance < finalAmount) {
      setError(`Yetersiz bakiye! Kiracının nakit bakiyesi: ${formatMoney(payer.balance)}`);
      return;
    }
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (!selectedProperty) return;
    setLoading(true);
    setError(null);
    try {
      const note =
        customAmount !== '' && parseInt(customAmount, 10) !== rentCalc.amount
          ? `${selectedProperty.name} kiralandı (Standart: ${rentCalc.amount} ₺, Anlaşılan: ${finalAmount} ₺)`
          : undefined;

      await onPayRent(payerId, selectedProperty.id, finalAmount, note);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Kira ödemesi sırasında hata oluştu');
      setStep('select');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '18px' }}>Kira Ödeme</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {step === 'select' ? 'Mülk ve tutar detayları' : 'Kira ödemesini onaylayın'}
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

          {step === 'select' ? (
            <>
              {/* Kiracı */}
              <div>
                <label className="input-label">Kiracı (Ödeyen Oyuncu)</label>
                <select
                  className="input-field select-field"
                  value={payerId}
                  onChange={(e) => {
                    setPayerId(e.target.value);
                    setSelectedPropertyId('');
                  }}
                >
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.id === currentPlayer.id ? '(Siz)' : ''} — Bakiye: {formatMoney(p.balance)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mülk Seçimi */}
              <div>
                <label className="input-label">Gidilen Mülk</label>
                <select
                  className="input-field select-field"
                  value={selectedPropertyId}
                  onChange={(e) => {
                    setSelectedPropertyId(e.target.value);
                    setCustomAmount('');
                  }}
                >
                  <option value="">Mülk Seçin...</option>
                  {eligibleProperties.map((p) => {
                    const owner = players.find((pl) => pl.id === p.owner_id);
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.group_name}) — Sahibi: {owner?.name}{' '}
                        {p.is_mortgaged ? '[İPOTEKLİ]' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedProperty && (
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: `1px solid ${selectedProperty.group_color}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '4px',
                          backgroundColor: selectedProperty.group_color,
                        }}
                      />
                      <strong style={{ fontSize: '15px' }}>{selectedProperty.name}</strong>
                    </div>
                    <span className="badge badge-slate">Sahibi: {propertyOwner?.name}</span>
                  </div>

                  {selectedProperty.is_mortgaged ? (
                    <div
                      style={{
                        color: 'var(--amber-primary)',
                        fontSize: '13px',
                        background: 'rgba(245, 158, 11, 0.1)',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      ⚠️ Bu mülk ipotek altındadır. Kurallara göre kira tahsil edilemez.
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        Hesaplanan Kural: <span style={{ color: 'var(--text-main)' }}>{rentCalc.description}</span>
                      </div>

                      {/* Kamu Kuruluşu için Zar Girişi */}
                      {selectedProperty.type === 'utility' && (
                        <div>
                          <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Dices size={16} /> Atılan Zar Toplamı
                          </label>
                          <input
                            type="number"
                            min="2"
                            max="12"
                            className="input-field num-font"
                            value={diceRoll}
                            onChange={(e) => setDiceRoll(parseInt(e.target.value, 10) || 7)}
                          />
                        </div>
                      )}

                      {/* Standart vs İndirimli Kira */}
                      <div
                        style={{
                          background: 'rgba(15, 23, 42, 0.7)',
                          padding: '12px',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Standart Kira Bedeli:</span>
                          <strong style={{ fontSize: '14px' }}>{formatMoney(rentCalc.amount)}</strong>
                        </div>

                        <div>
                          <label className="input-label">
                            Bu İşlemde Ödenecek Tutar (Mülk sahibi indirim yapabilir):
                          </label>
                          <input
                            type="number"
                            inputMode="numeric"
                            placeholder={rentCalc.amount.toString()}
                            className="input-field num-font"
                            style={{ fontWeight: 700, fontSize: '18px' }}
                            value={customAmount}
                            onChange={(e) => setCustomAmount(e.target.value)}
                          />
                          <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                            * İndirim yalnızca bu sefere mahsustur. Mülkün standart kira tarifesi değişmez.
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Onay Adımı */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Kiracı</p>
                  <p style={{ fontWeight: 700, fontSize: '16px', marginTop: '4px' }}>{payer?.name}</p>
                  <p style={{ fontSize: '12px', color: 'var(--rose-primary)', marginTop: '2px' }}>
                    -{formatMoney(finalAmount)}
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
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mülk Sahibi</p>
                  <p style={{ fontWeight: 700, fontSize: '16px', marginTop: '4px' }}>{propertyOwner?.name}</p>
                  <p style={{ fontSize: '12px', color: 'var(--emerald-primary)', marginTop: '2px' }}>
                    +{formatMoney(finalAmount)}
                  </p>
                </div>
              </div>

              {/* Karşılaştırma Kutusu */}
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Mülk:</span>
                  <span style={{ fontWeight: 600 }}>{selectedProperty?.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Standart Kira:</span>
                  <span style={{ textDecoration: customAmount !== '' ? 'line-through' : 'none' }}>
                    {formatMoney(rentCalc.amount)}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: '8px',
                    borderTop: '1px solid rgba(16, 185, 129, 0.2)',
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--emerald-primary)' }}>
                    Bu İşlemde Ödenecek:
                  </span>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--emerald-primary)' }}>
                    {formatMoney(finalAmount)}
                  </span>
                </div>
              </div>

              {payer && (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Kiracının kalan nakit parası:{' '}
                  <strong style={{ color: 'var(--text-main)' }}>
                    {formatMoney(payer.balance - finalAmount)}
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
                onClick={() => setStep('select')}
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
                {loading ? 'İşleniyor...' : 'Kirayı Öde'}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
                İptal
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 2 }}
                onClick={handleNext}
                disabled={!selectedProperty || selectedProperty.is_mortgaged}
              >
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
