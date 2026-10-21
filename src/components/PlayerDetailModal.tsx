import React, { useState } from 'react';
import { Debt, Player, Property, Transaction } from '../types';
import { formatDateTime, formatMoney } from '../utils/formatters';
import { calculateCurrentRent } from '../data/monopolyIstanbulData';
import { X, User, Home, Hotel, ShieldAlert, ArrowRight, History, Send, Receipt } from 'lucide-react';

interface PlayerDetailModalProps {
  player: Player;
  currentPlayer: Player;
  properties: Property[];
  debts: Debt[];
  transactions: Transaction[];
  players: Player[];
  onClose: () => void;
  onSelectProperty: (property: Property) => void;
  onQuickSendMoney?: (toPlayerId: string, amount: number) => Promise<void>;
  onQuickPayRent?: (propertyId: string, amount: number) => Promise<void>;
}

export const PlayerDetailModal: React.FC<PlayerDetailModalProps> = ({
  player,
  currentPlayer,
  properties,
  debts,
  transactions,
  players,
  onClose,
  onSelectProperty,
  onQuickSendMoney,
  onQuickPayRent,
}) => {
  const [tab, setTab] = useState<'properties' | 'debts' | 'history'>('properties');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const isMe = player.id === currentPlayer.id;
  const playerProperties = properties.filter((p) => p.owner_id === player.id);
  const debtsOwed = debts.filter((d) => d.debtor_id === player.id && d.status === 'open');
  const debtsReceivable = debts.filter((d) => d.creditor_id === player.id && d.status === 'open');

  const playerTransactions = transactions.filter(
    (t) =>
      t.from_player_id === player.id ||
      t.to_player_id === player.id ||
      t.created_by_player_id === player.id
  );

  const handleSendChip = async (amt: number) => {
    if (!onQuickSendMoney || isMe) return;
    setActionLoading(true);
    setActionSuccess(null);
    try {
      await onQuickSendMoney(player.id, amt);
      setActionSuccess(`${player.name}'a ${formatMoney(amt)} gönderildi!`);
      setTimeout(() => setActionSuccess(null), 2500);
    } catch (err: any) {
      alert(err.message || 'Transfer başarısız');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayRentClick = async (prop: Property) => {
    if (!onQuickPayRent || isMe || prop.is_mortgaged) return;
    const rent = calculateCurrentRent(prop, properties);
    if (currentPlayer.balance < rent.amount) {
      alert(`Yetersiz bakiye! Kira bedeli: ${formatMoney(rent.amount)}`);
      return;
    }
    setActionLoading(true);
    setActionSuccess(null);
    try {
      await onQuickPayRent(prop.id, rent.amount);
      setActionSuccess(`${player.name}'a ${prop.name} için ${formatMoney(rent.amount)} kira ödendi!`);
      setTimeout(() => setActionSuccess(null), 2500);
    } catch (err: any) {
      alert(err.message || 'Kira ödemesi başarısız');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: isMe ? 'var(--emerald-primary)' : 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isMe ? '#03140a' : 'var(--emerald-primary)',
                fontWeight: 800,
                fontSize: '16px',
              }}
            >
              {player.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h3 style={{ fontSize: '18px' }}>{player.name}</h3>
                {isMe && <span className="badge badge-emerald">Siz</span>}
                {player.is_banker && <span className="badge badge-slate">Bankacı</span>}
              </div>
              <p className="num-font" style={{ fontSize: '16px', color: 'var(--emerald-primary)', fontWeight: 800 }}>
                {formatMoney(player.balance)}
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Aksiyon Başarı Bildirimi */}
        {actionSuccess && (
          <div
            style={{
              margin: '0 20px',
              padding: '8px 12px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid var(--emerald-primary)',
              borderRadius: '8px',
              color: 'var(--emerald-primary)',
              fontSize: '12px',
              fontWeight: 700,
              textAlign: 'center',
            }}
          >
            ✓ {actionSuccess}
          </div>
        )}

        {/* Başka Oyuncu ise: 1-Tap Hızlı Para Gönder Barı */}
        {!isMe && onQuickSendMoney && (
          <div
            style={{
              padding: '12px 20px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
                {player.name}'a Hızlı Para Gönder:
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                Bakiyeniz: {formatMoney(currentPlayer.balance)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[50, 100, 200, 500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  className="btn btn-secondary"
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    fontSize: '12px',
                    fontWeight: 700,
                    minHeight: '34px',
                    color: 'var(--emerald-primary)',
                    borderColor: 'rgba(16, 185, 129, 0.3)',
                  }}
                  onClick={() => handleSendChip(amt)}
                  disabled={actionLoading || currentPlayer.balance < amt}
                >
                  +{amt} ₺
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab Menüsü */}
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
              padding: '8px 12px',
              minHeight: '34px',
              fontSize: '13px',
              borderBottom: tab === 'properties' ? '2px solid var(--emerald-primary)' : 'none',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              background: tab === 'properties' ? 'var(--bg-card)' : 'transparent',
              color: tab === 'properties' ? 'var(--text-main)' : 'var(--text-muted)',
            }}
            onClick={() => setTab('properties')}
          >
            Mülkler ({playerProperties.length})
          </button>
          <button
            type="button"
            className="btn"
            style={{
              padding: '8px 12px',
              minHeight: '34px',
              fontSize: '13px',
              borderBottom: tab === 'debts' ? '2px solid var(--emerald-primary)' : 'none',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              background: tab === 'debts' ? 'var(--bg-card)' : 'transparent',
              color: tab === 'debts' ? 'var(--text-main)' : 'var(--text-muted)',
            }}
            onClick={() => setTab('debts')}
          >
            Borçlar ({debtsOwed.length + debtsReceivable.length})
          </button>
          <button
            type="button"
            className="btn"
            style={{
              padding: '8px 12px',
              minHeight: '34px',
              fontSize: '13px',
              borderBottom: tab === 'history' ? '2px solid var(--emerald-primary)' : 'none',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              background: tab === 'history' ? 'var(--bg-card)' : 'transparent',
              color: tab === 'history' ? 'var(--text-main)' : 'var(--text-muted)',
            }}
            onClick={() => setTab('history')}
          >
            Geçmiş
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '350px', overflowY: 'auto' }}>
          {/* TAB 1: Mülkler */}
          {tab === 'properties' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {playerProperties.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Oyuncunun şu anda tapulu bir mülkü bulunmuyor.
                </div>
              ) : (
                playerProperties.map((p) => {
                  const rent = calculateCurrentRent(p, properties);
                  return (
                    <div
                      key={p.id}
                      className="card"
                      style={{
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderLeft: `4px solid ${p.group_color}`,
                      }}
                    >
                      <div
                        style={{ cursor: 'pointer', flex: 1 }}
                        onClick={() => {
                          onClose();
                          onSelectProperty(p);
                        }}
                      >
                        <strong style={{ fontSize: '14px', display: 'block' }}>{p.name}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                          {p.group_name} • Kira: <span className="num-font" style={{ color: 'var(--amber-primary)', fontWeight: 700 }}>{formatMoney(rent.amount)}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {p.is_mortgaged ? (
                          <span className="badge badge-rose" style={{ fontSize: '10px' }}>İpotekli</span>
                        ) : (
                          <>
                            {p.hotel_count > 0 && (
                              <span className="badge badge-amber" style={{ fontSize: '10px' }}>
                                <Hotel size={11} /> 1
                              </span>
                            )}
                            {p.house_count > 0 && (
                              <span className="badge badge-emerald" style={{ fontSize: '10px' }}>
                                <Home size={11} /> {p.house_count}
                              </span>
                            )}

                            {/* Eğer başka oyuncunun mülkü ise: 1-Tıkla Kira Öde Butonu */}
                            {!isMe && onQuickPayRent && (
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{
                                  padding: '5px 8px',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  minHeight: '28px',
                                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                  color: '#03140a',
                                  whiteSpace: 'nowrap',
                                }}
                                onClick={() => handlePayRentClick(p)}
                                disabled={actionLoading}
                              >
                                <Receipt size={12} />
                                {formatMoney(rent.amount)} Öde
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: Borçlar */}
          {tab === 'debts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {debtsOwed.length === 0 && debtsReceivable.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Oyuncunun açık bir borcu veya alacağı bulunmuyor.
                </div>
              ) : (
                <>
                  {debtsOwed.map((d) => {
                    const creditor = players.find((pl) => pl.id === d.creditor_id);
                    return (
                      <div key={d.id} className="card" style={{ padding: '10px 12px', borderColor: 'rgba(244, 63, 94, 0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12px', color: 'var(--rose-primary)', fontWeight: 700 }}>Borçlu</span>
                          <span className="num-font" style={{ fontWeight: 800, color: 'var(--rose-primary)' }}>
                            {formatMoney(d.current_amount)}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
                          Kime: <strong style={{ color: 'var(--text-main)' }}>{creditor?.name}</strong> • {d.reason}
                        </div>
                      </div>
                    );
                  })}
                  {debtsReceivable.map((d) => {
                    const debtor = players.find((pl) => pl.id === d.debtor_id);
                    return (
                      <div key={d.id} className="card" style={{ padding: '10px 12px', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12px', color: 'var(--emerald-primary)', fontWeight: 700 }}>Alacaklı</span>
                          <span className="num-font" style={{ fontWeight: 800, color: 'var(--emerald-primary)' }}>
                            {formatMoney(d.current_amount)}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
                          Kimden: <strong style={{ color: 'var(--text-main)' }}>{debtor?.name}</strong> • {d.reason}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* TAB 3: Geçmiş */}
          {tab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {playerTransactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Oyuncuya ait işlem kaydı bulunmuyor.
                </div>
              ) : (
                playerTransactions.slice(0, 30).map((t) => (
                  <div key={t.id} className="card" style={{ padding: '8px 12px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600 }}>{t.description}</span>
                      <strong className="num-font" style={{ color: t.to_player_id === player.id ? 'var(--emerald-primary)' : 'var(--text-dim)' }}>
                        {t.to_player_id === player.id ? '+' : '-'}{formatMoney(t.amount)}
                      </strong>
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{formatDateTime(t.created_at)}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" style={{ width: '100%' }} onClick={onClose}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
