import React, { useState, useMemo } from 'react';
import { Player, Property } from '../types';
import { formatMoney } from '../utils/formatters';
import { Building2, Home, Hotel, ShieldAlert, ArrowLeft } from 'lucide-react';

interface PropertiesViewProps {
  properties: Property[];
  players: Player[];
  currentPlayer: Player;
  onSelectProperty: (property: Property) => void;
  onBack: () => void;
}

export const PropertiesView: React.FC<PropertiesViewProps> = ({
  properties,
  players,
  currentPlayer,
  onSelectProperty,
  onBack,
}) => {
  const [filter, setFilter] = useState<'all' | 'mine' | 'for_sale' | 'mortgaged'>('all');

  const filtered = useMemo(() => {
    switch (filter) {
      case 'mine':
        return properties.filter((p) => p.owner_id === currentPlayer.id);
      case 'for_sale':
        return properties.filter((p) => !p.owner_id);
      case 'mortgaged':
        return properties.filter((p) => p.is_mortgaged);
      default:
        return properties;
    }
  }, [properties, filter, currentPlayer.id]);

  // Group by group_key
  const grouped = useMemo(() => {
    const map = new Map<string, Property[]>();
    filtered.forEach((p) => {
      const list = map.get(p.group_name) || [];
      list.push(p);
      map.set(p.group_name, list);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      {/* Başlık ve Geri Butonu */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          className="btn btn-secondary"
          style={{ padding: '8px 12px', minHeight: '38px', fontSize: '13px' }}
          onClick={onBack}
        >
          <ArrowLeft size={16} />
          Ana Ekrana Dön
        </button>
        <h2 style={{ fontSize: '18px' }}>Monopoly Mülkleri</h2>
      </div>

      {/* Filtre Sekmeleri */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
        <button
          type="button"
          className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '6px 12px', fontSize: '12px', minHeight: '34px', whiteSpace: 'nowrap' }}
          onClick={() => setFilter('all')}
        >
          Tümü ({properties.length})
        </button>
        <button
          type="button"
          className={`btn ${filter === 'mine' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '6px 12px', fontSize: '12px', minHeight: '34px', whiteSpace: 'nowrap' }}
          onClick={() => setFilter('mine')}
        >
          Benimkiler ({properties.filter((p) => p.owner_id === currentPlayer.id).length})
        </button>
        <button
          type="button"
          className={`btn ${filter === 'for_sale' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '6px 12px', fontSize: '12px', minHeight: '34px', whiteSpace: 'nowrap' }}
          onClick={() => setFilter('for_sale')}
        >
          Satılık ({properties.filter((p) => !p.owner_id).length})
        </button>
        <button
          type="button"
          className={`btn ${filter === 'mortgaged' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '6px 12px', fontSize: '12px', minHeight: '34px', whiteSpace: 'nowrap' }}
          onClick={() => setFilter('mortgaged')}
        >
          İpotekli ({properties.filter((p) => p.is_mortgaged).length})
        </button>
      </div>

      {/* Mülk Grupları */}
      {grouped.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '36px 16px',
            color: 'var(--text-muted)',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <Building2 size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
          <p>Bu filtreye uygun mülk bulunamadı.</p>
        </div>
      ) : (
        grouped.map(([groupName, propsInGroup]) => (
          <div key={groupName} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '4px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '3px',
                  backgroundColor: propsInGroup[0]?.group_color,
                }}
              />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>
                {groupName} ({propsInGroup.length})
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '8px' }}>
              {propsInGroup.map((p) => {
                const owner = players.find((pl) => pl.id === p.owner_id);
                const isMine = p.owner_id === currentPlayer.id;

                return (
                  <div
                    key={p.id}
                    className="card card-interactive"
                    style={{
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      borderLeft: `4px solid ${p.group_color}`,
                    }}
                    onClick={() => onSelectProperty(p)}
                  >
                    <div>
                      <strong style={{ fontSize: '14px', display: 'block', color: 'var(--text-main)' }}>
                        {p.name}
                      </strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                        {owner ? (
                          <span style={{ color: isMine ? 'var(--emerald-primary)' : 'var(--text-muted)' }}>
                            {owner.name} {isMine ? '(Siz)' : ''}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--blue-primary)' }}>Banka • {formatMoney(p.price)}</span>
                        )}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {p.is_mortgaged && (
                        <span className="badge badge-rose" title="İpotekli">
                          <ShieldAlert size={12} />
                        </span>
                      )}
                      {p.hotel_count > 0 && (
                        <span className="badge badge-amber" title="1 Otel">
                          <Hotel size={12} /> 1
                        </span>
                      )}
                      {p.house_count > 0 && (
                        <span className="badge badge-emerald" title={`${p.house_count} Ev`}>
                          <Home size={12} /> {p.house_count}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
