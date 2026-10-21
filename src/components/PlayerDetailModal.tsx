import React, { useState } from 'react';
import { Debt, Player, Property, Transaction } from '../types';
import { formatDateTime, formatMoney } from '../utils/formatters';
import { X, User, Home, Hotel, ShieldAlert, ArrowRight, History } from 'lucide-react';

interface PlayerDetailModalProps {
  player: Player;
  properties: Property[];
  debts: Debt[];
  transactions: Transaction[];
  players: Player[];
  onClose: () => void;
  onSelectProperty: (property: Property) => void;
}

export const PlayerDetailModal: React.FC<PlayerDetailModalProps> = ({
  player,
  properties,
  debts,
  transactions,
  players,
  onClose,
  onSelectProperty,
}) => {
  const [tab, setTab] = useState<'properties' | 'debts' | 'history'>('properties');

  const playerProperties = properties.filter((p) => p.owner_id === player.id);
  const debtsOwed = debts.filter((d) => d.debtor_id === player.id && d.status === 'open');
  const debtsReceivable = debts.filter((d) => d.creditor_id === player.id && d.status === 'open');

  const totalOwed = debtsOwed.reduce((acc, d) => acc + d.current_amount, 0);
  const totalReceivable = debtsReceivable.reduce((acc, d) => acc + d.current_amount, 0);

  const playerTransactions = transactions.filter(
    (t) =>
      t.from_player_id === player.id ||
      t.to_player_id === player.id ||
      t.created_by_player_id === player.id
  );

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
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--emerald-primary)',
              }}
            >
              <User size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h3 style={{ fontSize: '18px' }}>{player.name}</h3>
                {player.is_banker && <span className="badge badge-emerald">Bankacı</span>}
              </div>
              <p className="num-font" style={{ fontSize: '15px', color: 'var(--emerald-primary)', fontWeight: 700 }}>
                {formatMoney(player.balance)}
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

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
            Borç & Alacak
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
            İşlem Geçmişi ({playerTransactions.length})
          </button>
        </div>

        <div className="modal-body">
          {/* TAB 1: Mülkler */}
          {tab === 'properties' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {playerProperties.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  Oyuncunun şu anda tapulu bir mülkü bulunmuyor.
                </div>
              ) : (
                playerProperties.map((p) => (
                  <div
                    key={p.id}
                    className="card card-interactive"
                    style={{
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderLeft: `4px solid ${p.group_color}`,
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      onClose();
                      onSelectProperty(p);
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '14px', display: 'block' }}>{p.name}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                        {p.group_name} • Standart Kira: {formatMoney(p.rent_base)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {p.is_mortgaged && <span className="badge badge-rose">İpotekli</span>}
                      {p.hotel_count > 0 && (
                        <span className="badge badge-amber">
                          <Hotel size={12} /> 1 Otel
                        </span>
                      )}
                      {p.house_count > 0 && (
                        <span className="badge badge-emerald">
                          <Home size={12} /> {p.house_count} Ev
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: Borç & Alacaklar */}
          {tab === 'debts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Borç Özeti */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Toplam Borç</p>
                  <strong className="num-font" style={{ fontSize: '18px', color: 'var(--rose-primary)' }}>
                    {formatMoney(totalOwed)}
                  </strong>
                </div>

                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Toplam Alacak</p>
                  <strong className="num-font" style={{ fontSize: '18px', color: 'var(--emerald-primary)' }}>
                    {formatMoney(totalReceivable)}
                  </strong>
                </div>
              </div>

              {/* Borç Detayları */}
              <div>
                <h4 style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Başkalarına Olan Açık Borçları
                </h4>
                {debtsOwed.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                    Açık borcu bulunmuyor.
                  </p>
                ) : (
                  debtsOwed.map((d) => {
                    const creditor = players.find((p) => p.id === d.creditor_id);
                    return (
                      <div
                        key={d.id}
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '10px 12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '6px',
                        }}
                      >
                        <div>
                          <p style={{ fontSize: '13px', fontWeight: 600 }}>Alacaklı: {creditor?.name}</p>
                          <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{d.reason}</p>
                        </div>
                        <span className="badge badge-rose">{formatMoney(d.current_amount)}</span>
                      </div>
                    );
                  })
                )}
              </div>

              <div>
                <h4 style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Başkalarından Olan Alacakları
                </h4>
                {debtsReceivable.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                    Açık alacağı bulunmuyor.
                  </p>
                ) : (
                  debtsReceivable.map((d) => {
                    const debtor = players.find((p) => p.id === d.debtor_id);
                    return (
                      <div
                        key={d.id}
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '10px 12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '6px',
                        }}
                      >
                        <div>
                          <p style={{ fontSize: '13px', fontWeight: 600 }}>Borçlu: {debtor?.name}</p>
                          <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{d.reason}</p>
                        </div>
                        <span className="badge badge-emerald">{formatMoney(d.current_amount)}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Oyuncu İşlem Geçmişi */}
          {tab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {playerTransactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  Henüz işlem kaydı yok.
                </div>
              ) : (
                playerTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 600 }}>{tx.description}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{formatDateTime(tx.created_at)}</p>
                    </div>
                    {tx.amount > 0 && (
                      <strong className="num-font" style={{ fontSize: '14px' }}>
                        {formatMoney(tx.amount)}
                      </strong>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
