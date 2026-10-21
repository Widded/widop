import React, { useState, useMemo } from 'react';
import { Player, Property } from '../types';
import { formatMoney } from '../utils/formatters';
import { calculateCurrentRent } from '../data/monopolyIstanbulData';
import { AlertCircle, X, Home, Hotel, ShieldAlert, Dices, Receipt } from 'lucide-react';

interface RentModalProps {
  properties: Property[];
  players: Player[];
  currentPlayer: Player;
  initialPropertyId?: string;
  onClose: () => void;
  onPayRent: (payerId: string, propertyId: string, finalAmount: number, note?: string) => Promise<void>;
}

export const RentModal: React.FC<RentModalProps> = ({
  properties,
  players,
  currentPlayer,
  initialPropertyId,
  onClose,
  onPayRent,
}) => {
  const [payerId, setPayerId] = useState<string>(currentPlayer.id);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(initialPropertyId || '');
  const [selectedOwnerFilter, setSelectedOwnerFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [diceRoll, setDiceRoll] = useState<number>(7);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filter properties that have an owner who is NOT the payer
  const eligibleProperties = useMemo(() => {
    return properties.filter((p) => {
      if (!p.owner_id || p.owner_id === payerId) return false;
      if (selectedOwnerFilter !== 'all' && p.owner_id !== selectedOwnerFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.group_name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [properties, payerId, selectedOwnerFilter, searchQuery]);

  // Owners list who own at least 1 property
  const propertyOwners = useMemo(() => {
    const ownerIds = new Set(properties.filter((p) => p.owner_id && p.owner_id !== payerId).map((p) => p.owner_id));
    return players.filter((pl) => ownerIds.has(pl.id));
  }, [properties, payerId, players]);

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

  const handlePay = async () => {
    setError(null);
    if (!selectedProperty) {
      setError('Lütfen üzerine inilen mülkü seçin');
      return;
    }
    if (!propertyOwner) {
      setError('Mülkün sahibi bulunamadı');
      return;
    }
    if (selectedProperty.is_mortgaged) {
      setError('Bu mülk ipoteklidir. İpotekli mülkten kira alınamaz.');
      return;
    }
    if (finalAmount < 0) {
      setError('Kira tutarı negatif olamaz');
      return;
    }
    if (payer && payer.balance < finalAmount) {
      setError(`Yetersiz bakiye! Mevcut bakiyeniz: ${formatMoney(payer.balance)}`);
      return;
    }

    setLoading(true);
    try {
      const note =
        customAmount !== '' && parseInt(customAmount, 10) !== rentCalc.amount
          ? `${selectedProperty.name} kirası (Anlaşılan: ${finalAmount} ₺)`
          : `${selectedProperty.name} kira ödemesi`;

      await onPayRent(payerId, selectedProperty.id, finalAmount, note);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Kira ödemesi sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '18px' }}>Hızlı Kira Öde</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Bakiyeniz: <strong style={{ color: 'var(--emerald-primary)' }}>{formatMoney(payer?.balance || 0)}</strong>
            </p>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                fontSize: '13px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Mülk Sahibi Filtresi (Hızlı Seçim) */}
          {propertyOwners.length > 0 && (
            <div>
              <label className="input-label">Kime Kira Ödüyorsunuz?</label>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                <button
                  type="button"
                  className={`btn ${selectedOwnerFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 12px', fontSize: '12px', minHeight: '34px', whiteSpace: 'nowrap' }}
                  onClick={() => setSelectedOwnerFilter('all')}
                >
                  Tüm Mülkler
                </button>
                {propertyOwners.map((owner) => (
                  <button
                    key={owner.id}
                    type="button"
                    className={`btn ${selectedOwnerFilter === owner.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '6px 12px', fontSize: '12px', minHeight: '34px', whiteSpace: 'nowrap' }}
                    onClick={() => setSelectedOwnerFilter(owner.id)}
                  >
                    👤 {owner.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. Mülk Arama & Seçim Listesi */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="input-label" style={{ marginBottom: 0 }}>Gidilen Mülk ({eligibleProperties.length})</label>
              <input
                type="text"
                placeholder="Mülk adı ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  color: '#fff',
                  width: '130px',
                }}
              />
            </div>

            {eligibleProperties.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-dim)', padding: '12px', textAlign: 'center' }}>
                Kira ödenebilecek mülk bulunamadı.
              </p>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  paddingRight: '4px',
                }}
              >
                {eligibleProperties.map((p) => {
                  const isSelected = p.id === selectedPropertyId;
                  const owner = players.find((pl) => pl.id === p.owner_id);
                  const rent = calculateCurrentRent(p, properties, diceRoll);

                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedPropertyId(p.id);
                        setCustomAmount('');
                      }}
                      className="card card-interactive"
                      style={{
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        borderLeft: `4px solid ${p.group_color}`,
                        borderColor: isSelected ? 'var(--emerald-primary)' : 'var(--border-subtle)',
                        background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-card)',
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '13px' }}>{p.name}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                          Sahibi: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{owner?.name}</span>
                          {p.house_count > 0 && ` • ${p.house_count} Ev`}
                          {p.hotel_count > 0 && ` • 1 Otel`}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span className="num-font" style={{ fontWeight: 800, fontSize: '14px', color: 'var(--amber-primary)' }}>
                          {formatMoney(rent.amount)}
                        </span>
                        <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Standart Kira</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Seçilen Mülk Detayı ve Özel Kira Ayarı */}
          {selectedProperty && (
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--amber-primary)', fontWeight: 700 }}>
                    {rentCalc.description || 'Kira Bedeli'}
                  </span>
                  <h4 style={{ fontSize: '16px', fontWeight: 800 }}>{selectedProperty.name}</h4>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="num-font" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--emerald-primary)' }}>
                    {formatMoney(finalAmount)}
                  </span>
                </div>
              </div>

              {/* Kamu Kuruluşu için Zar Girişi */}
              {selectedProperty.type === 'utility' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                  <Dices size={16} color="var(--amber-primary)" />
                  <span style={{ fontSize: '12px' }}>Zar Toplamı:</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDiceRoll(d)}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '4px',
                          border: 'none',
                          background: diceRoll === d ? 'var(--amber-primary)' : 'rgba(255, 255, 255, 0.1)',
                          color: diceRoll === d ? '#03140a' : '#fff',
                          fontWeight: 700,
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Pazarlık / İndirimli Tutar Girişi (İsteğe bağlı) */}
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>Anlaşılan Tutar:</span>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder={rentCalc.amount.toString()}
                  className="input-field num-font"
                  style={{ padding: '4px 8px', fontSize: '14px', height: '32px' }}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                />
                {customAmount && (
                  <button
                    type="button"
                    onClick={() => setCustomAmount('')}
                    style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '11px', cursor: 'pointer' }}
                  >
                    Sıfırla
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 4. Tek Tıkla Öde Butonu */}
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={loading}>
            İptal
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{
              flex: 2,
              fontWeight: 800,
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#03140a',
            }}
            onClick={handlePay}
            disabled={loading || !selectedProperty || !propertyOwner}
          >
            <Receipt size={16} />
            {loading
              ? 'Ödeniyor...'
              : selectedProperty && propertyOwner
              ? `${propertyOwner.name}'a ${formatMoney(finalAmount)} Kira Öde`
              : 'Mülk Seçin'}
          </button>
        </div>
      </div>
    </div>
  );
};
