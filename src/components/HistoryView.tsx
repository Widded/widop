import React, { useState, useMemo } from 'react';
import { Player, Transaction } from '../types';
import { formatDateTime, formatMoney } from '../utils/formatters';
import { History, ArrowLeft, Filter, ArrowUpRight, ArrowDownLeft, ShieldCheck } from 'lucide-react';

interface HistoryViewProps {
  transactions: Transaction[];
  players: Player[];
  onBack?: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ transactions, players, onBack }) => {
  const [playerFilter, setPlayerFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      // Player filter
      if (playerFilter !== 'all') {
        const matchesPlayer =
          t.from_player_id === playerFilter ||
          t.to_player_id === playerFilter ||
          t.created_by_player_id === playerFilter;
        if (!matchesPlayer) return false;
      }

      // Type filter
      if (typeFilter !== 'all') {
        if (typeFilter === 'transfer' && t.type !== 'transfer') return false;
        if (typeFilter === 'rent' && t.type !== 'rent') return false;
        if (typeFilter === 'bank' && t.type !== 'bank_deposit' && t.type !== 'bank_withdraw') return false;
        if (
          typeFilter === 'debt' &&
          t.type !== 'debt_create' &&
          t.type !== 'debt_payment' &&
          t.type !== 'debt_settle'
        )
          return false;
        if (
          typeFilter === 'property' &&
          t.type !== 'property_buy' &&
          t.type !== 'property_trade' &&
          t.type !== 'property_build' &&
          t.type !== 'mortgage' &&
          t.type !== 'unmortgage'
        )
          return false;
        if (
          typeFilter === 'banker' &&
          t.type !== 'banker_adjustment' &&
          t.type !== 'banker_property_override'
        )
          return false;
      }

      return true;
    });
  }, [transactions, playerFilter, typeFilter]);

  const getPlayerName = (id: string | null) => {
    if (!id) return 'Banka';
    const p = players.find((pl) => pl.id === id);
    return p ? p.name : 'Bilinmeyen Oyuncu';
  };

  const getBadgeForType = (type: string) => {
    switch (type) {
      case 'transfer':
        return <span className="badge badge-emerald">Transfer</span>;
      case 'rent':
        return <span className="badge badge-amber">Kira</span>;
      case 'bank_deposit':
        return <span className="badge badge-emerald">Maaş/Gelir</span>;
      case 'bank_withdraw':
        return <span className="badge badge-rose">Banka/Vergi</span>;
      case 'debt_create':
        return <span className="badge badge-amber">Borç</span>;
      case 'debt_payment':
      case 'debt_settle':
        return <span className="badge badge-emerald">Borç Ödeme</span>;
      case 'property_buy':
      case 'property_trade':
      case 'property_build':
        return <span className="badge badge-slate">Mülk/Yapı</span>;
      case 'mortgage':
      case 'unmortgage':
        return <span className="badge badge-rose">İpotek</span>;
      case 'banker_adjustment':
      case 'banker_property_override':
        return <span className="badge badge-rose"><ShieldCheck size={10} /> Bankacı</span>;
      default:
        return <span className="badge badge-slate">{type}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '14px' }}>
      {/* Başlık ve Geri Butonu */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {onBack ? (
          <button
            className="btn btn-secondary"
            style={{ padding: '8px 12px', minHeight: '36px', fontSize: '13px' }}
            onClick={onBack}
          >
            <ArrowLeft size={16} />
            Geri
          </button>
        ) : (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800 }}>İşlem Geçmişi</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Masa hareketleri denetim kaydı</p>
          </div>
        )}
        <span className="badge badge-slate" style={{ fontSize: '12px' }}>{filtered.length} Kayıt</span>
      </div>

      {/* Filtre Barı */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 14px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
        }}
      >
        <div>
          <label className="input-label" style={{ marginBottom: '4px' }}>
            Oyuncu Filtresi
          </label>
          <select
            className="input-field select-field"
            style={{ minHeight: '38px', padding: '6px 12px', fontSize: '13px' }}
            value={playerFilter}
            onChange={(e) => setPlayerFilter(e.target.value)}
          >
            <option value="all">Tüm Oyuncular</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="input-label" style={{ marginBottom: '4px' }}>
            İşlem Türü
          </label>
          <select
            className="input-field select-field"
            style={{ minHeight: '38px', padding: '6px 12px', fontSize: '13px' }}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">Tüm İşlemler</option>
            <option value="transfer">Para Transferleri</option>
            <option value="rent">Kira Ödemeleri</option>
            <option value="bank">Banka (Maaş / Vergi)</option>
            <option value="debt">Borç İşlemleri</option>
            <option value="property">Mülk / İnşaat</option>
            <option value="banker">Bankacı Düzeltmeleri</option>
          </select>
        </div>
      </div>

      {/* İşlem Listesi */}
      {filtered.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '36px 16px',
            color: 'var(--text-muted)',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <History size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
          <p>Kayıtlı işlem bulunamadı.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map((tx) => {
            const hasAmount = tx.amount > 0;
            return (
              <div
                key={tx.id}
                className="card"
                style={{
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {getBadgeForType(tx.type)}
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                      {formatDateTime(tx.created_at)}
                    </span>
                  </div>

                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                    {tx.description}
                  </p>

                  <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                    {tx.from_player_id && tx.to_player_id ? (
                      <span>
                        {getPlayerName(tx.from_player_id)} ➔ {getPlayerName(tx.to_player_id)}
                      </span>
                    ) : tx.to_player_id ? (
                      <span>Alıcı: {getPlayerName(tx.to_player_id)}</span>
                    ) : tx.from_player_id ? (
                      <span>Ödeyen: {getPlayerName(tx.from_player_id)}</span>
                    ) : null}
                  </div>
                </div>

                {hasAmount && (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span
                      className="num-font"
                      style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        color:
                          tx.type === 'bank_deposit' || tx.type === 'mortgage'
                            ? 'var(--emerald-primary)'
                            : tx.type === 'bank_withdraw' || tx.type === 'unmortgage'
                            ? 'var(--rose-primary)'
                            : 'var(--text-main)',
                      }}
                    >
                      {formatMoney(tx.amount)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
