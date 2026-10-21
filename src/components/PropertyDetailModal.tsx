import React, { useState } from 'react';
import { Player, Property } from '../types';
import { formatMoney } from '../utils/formatters';
import { validateBuildingRule } from '../data/monopolyIstanbulData';
import { Home, Hotel, ShieldAlert, ArrowRightLeft, X, AlertCircle, ShoppingCart } from 'lucide-react';

interface PropertyDetailModalProps {
  property: Property;
  allProperties: Property[];
  players: Player[];
  currentPlayer: Player;
  onClose: () => void;
  onBuyFromBank: (propertyId: string, buyerPlayerId?: string) => Promise<void>;
  onTradeProperty: (sellerId: string, buyerId: string, propertyId: string, price: number) => Promise<void>;
  onBuildHouse: (propertyId: string) => Promise<void>;
  onToggleMortgage: (propertyId: string) => Promise<void>;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  allProperties,
  players,
  currentPlayer,
  onClose,
  onBuyFromBank,
  onTradeProperty,
  onBuildHouse,
  onToggleMortgage,
}) => {
  const [tradeMode, setTradeMode] = useState<boolean>(false);
  const [targetBuyerId, setTargetBuyerId] = useState<string>('');
  const [tradePrice, setTradePrice] = useState<string>(property.price.toString());
  const [bankerSelectedBuyerId, setBankerSelectedBuyerId] = useState<string>(
    players.find((p) => p.id !== currentPlayer.id)?.id || currentPlayer.id
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const owner = players.find((p) => p.id === property.owner_id);
  const isMine = property.owner_id === currentPlayer.id;
  const isUnowned = !property.owner_id;

  const groupProps = allProperties.filter((p) => p.group_key === property.group_key);
  const buildingCheck = validateBuildingRule(property, groupProps);

  const handleBankerSell = async () => {
    if (!currentPlayer.is_banker) return;
    const buyer = players.find((p) => p.id === bankerSelectedBuyerId);
    if (!buyer) {
      setError('Lütfen tapuyu alacak oyuncuyu seçin');
      return;
    }
    if (buyer.balance < property.price) {
      setError(
        `${buyer.name} oyuncusunun bakiyesi yetersiz (${formatMoney(buyer.balance)})! Mülk bedeli: ${formatMoney(property.price)}`
      );
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onBuyFromBank(property.id, buyer.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Tapu verme işlemi başarısız oldu');
    } finally {
      setLoading(false);
    }
  };

  const handleBuild = async () => {
    setLoading(true);
    setError(null);
    try {
      await onBuildHouse(property.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Bina inşa edilemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleMortgage = async () => {
    setLoading(true);
    setError(null);
    try {
      await onToggleMortgage(property.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'İpotek işlemi başarısız oldu');
    } finally {
      setLoading(false);
    }
  };

  const handleTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetBuyerId) {
      setError('Lütfen mülkü devredeceğiniz oyuncuyu seçin');
      return;
    }
    const priceNum = parseInt(tradePrice, 10);
    if (isNaN(priceNum) || priceNum < 0) {
      setError('Geçerli bir satış fiyatı girin');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onTradeProperty(currentPlayer.id, targetBuyerId, property.id, priceNum);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Devir işlemi gerçekleştirilemedi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Deed Card Header */}
        <div
          style={{
            backgroundColor: property.group_color,
            padding: '16px 20px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid rgba(0,0,0,0.2)',
          }}
        >
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>
              {property.group_name} Tapu Senedi
            </span>
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginTop: '2px' }}>{property.name}</h2>
          </div>
          <button
            className="btn-icon"
            style={{ background: 'rgba(0,0,0,0.3)', color: '#fff', border: 'none' }}
            onClick={onClose}
          >
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

          {/* Sahiplik & İpotek Durumu */}
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
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mülk Sahibi</span>
              <p style={{ fontWeight: 700, fontSize: '15px', marginTop: '2px' }}>
                {owner ? `${owner.name} ${isMine ? '(Siz)' : ''}` : 'Banka (Satılık)'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              {property.is_mortgaged && <span className="badge badge-rose">İpotekli</span>}
              {property.hotel_count > 0 && <span className="badge badge-amber">1 Otel</span>}
              {property.house_count > 0 && <span className="badge badge-emerald">{property.house_count} Ev</span>}
            </div>
          </div>

          {/* Kira & Bedel Tablosu */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingBottom: '8px',
                borderBottom: '1px solid var(--border-subtle)',
                fontWeight: 600,
                fontSize: '13px',
              }}
            >
              <span>Satın Alma Bedeli:</span>
              <span className="num-font" style={{ color: 'var(--emerald-primary)' }}>
                {formatMoney(property.price)}
              </span>
            </div>

            {property.type === 'street' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Boş Arsa Kirası:</span>
                  <span className="num-font">{formatMoney(property.rent_base)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>1 Ev ile Kira:</span>
                  <span className="num-font">{formatMoney(property.rent_house_1)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>2 Ev ile Kira:</span>
                  <span className="num-font">{formatMoney(property.rent_house_2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>3 Ev ile Kira:</span>
                  <span className="num-font">{formatMoney(property.rent_house_3)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>4 Ev ile Kira:</span>
                  <span className="num-font">{formatMoney(property.rent_house_4)}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: '6px',
                    borderTop: '1px dashed var(--border-subtle)',
                    color: 'var(--amber-primary)',
                    fontWeight: 600,
                  }}
                >
                  <span>Otel ile Kira:</span>
                  <span className="num-font">{formatMoney(property.rent_hotel)}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: '6px',
                    color: 'var(--text-dim)',
                    fontSize: '12px',
                  }}
                >
                  <span>Ev / Otel Maliyeti:</span>
                  <span className="num-font">{formatMoney(property.house_cost)}</span>
                </div>
              </div>
            ) : property.type === 'station' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>1 İstasyon:</span>
                  <span className="num-font">25 ₺</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>2 İstasyon:</span>
                  <span className="num-font">50 ₺</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>3 İstasyon:</span>
                  <span className="num-font">100 ₺</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>4 İstasyon:</span>
                  <span className="num-font">200 ₺</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>1 Kamu Kuruluşu:</span>
                  <span>4 × Zar Değeri</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>2 Kamu Kuruluşu:</span>
                  <span>10 × Zar Değeri</span>
                </div>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '8px',
                marginTop: '10px',
                borderTop: '1px solid var(--border-subtle)',
                fontSize: '12px',
                color: 'var(--text-dim)',
              }}
            >
              <span>İpotek Değeri: {formatMoney(property.mortgage_value)}</span>
              <span>İpotek Kaldırma: {formatMoney(property.unmortgage_price)} (%10 Faiz)</span>
            </div>
          </div>

          {/* Devir / Satış Formu (Eğer devir modu açıksa) */}
          {tradeMode && isMine && (
            <form
              onSubmit={handleTrade}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <h4 style={{ fontSize: '14px' }}>Mülkü Başka Bir Oyuncuya Devret / Sat</h4>
              <div>
                <label className="input-label">Alıcı Oyuncu</label>
                <select
                  className="input-field select-field"
                  value={targetBuyerId}
                  onChange={(e) => setTargetBuyerId(e.target.value)}
                >
                  <option value="">Oyuncu Seçin...</option>
                  {players
                    .filter((p) => p.id !== currentPlayer.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Bakiye: {formatMoney(p.balance)})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="input-label">Anlaşılan Satış Bedeli (₺)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  className="input-field num-font"
                  value={tradePrice}
                  onChange={(e) => setTradePrice(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setTradeMode(false)}
                >
                  Vazgeç
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
                  {loading ? 'Devrediliyor...' : 'Devir İşlemini Onayla'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Buton Aksiyonları */}
        <div className="modal-footer" style={{ flexDirection: 'column' }}>
          {isUnowned ? (
            currentPlayer.is_banker ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--emerald-primary)' }}>
                    👑 Masa Bankacısı Tapu Satışı
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 800 }} className="num-font">
                    {formatMoney(property.price)}
                  </span>
                </div>
                <div>
                  <label className="input-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                    Tapuyu Satın Alacak Oyuncu:
                  </label>
                  <select
                    className="input-field select-field"
                    value={bankerSelectedBuyerId}
                    onChange={(e) => setBankerSelectedBuyerId(e.target.value)}
                    style={{ fontSize: '13px', padding: '8px 10px' }}
                  >
                    {players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.id === currentPlayer.id ? '(Siz - Bankacı)' : ''} — Bakiye: {formatMoney(p.balance)}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: '100%', fontWeight: 800 }}
                  onClick={handleBankerSell}
                  disabled={loading}
                >
                  <ShoppingCart size={16} />
                  {loading
                    ? 'İşleniyor...'
                    : `${players.find((p) => p.id === bankerSelectedBuyerId)?.name || 'Oyuncuya'} Tapuyu Ver (${formatMoney(property.price)})`}
                </button>
              </div>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '12px 14px',
                  background: 'rgba(245, 158, 11, 0.08)',
                  borderRadius: '12px',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  width: '100%',
                }}
              >
                <p style={{ color: 'var(--amber-primary)', fontWeight: 800, fontSize: '13px' }}>
                  🏦 Bankada Satılık ({formatMoney(property.price)})
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px' }}>
                  Monopoly kuralları gereği tapuları yalnızca Masa Bankacısı verir. Bu mülkü satın almak için Bankacıya bildirin.
                </p>
              </div>
            )
          ) : isMine ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {property.type === 'street' && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ flex: 1, fontSize: '13px' }}
                    onClick={handleBuild}
                    disabled={loading || !buildingCheck.canBuild || currentPlayer.balance < buildingCheck.cost}
                  >
                    {buildingCheck.action === 'hotel' ? <Hotel size={16} /> : <Home size={16} />}
                    {buildingCheck.action === 'hotel'
                      ? `Otel Dik (${formatMoney(buildingCheck.cost)})`
                      : `${property.house_count + 1}. Ev Yap (${formatMoney(buildingCheck.cost)})`}
                  </button>
                )}

                <button
                  type="button"
                  className={`btn ${property.is_mortgaged ? 'btn-primary' : 'btn-danger'}`}
                  style={{ flex: 1, fontSize: '13px' }}
                  onClick={handleMortgage}
                  disabled={loading}
                >
                  <ShieldAlert size={16} />
                  {property.is_mortgaged
                    ? `İpoteği Kaldır (${formatMoney(property.unmortgage_price)})`
                    : `İpotek Et (+${formatMoney(property.mortgage_value)})`}
                </button>
              </div>

              {!tradeMode && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '100%', fontSize: '13px' }}
                  onClick={() => setTradeMode(true)}
                >
                  <ArrowRightLeft size={16} />
                  Oyuncuya Sat / Devret
                </button>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
              Bu mülk <strong>{owner?.name}</strong> adlı oyuncuya aittir.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
