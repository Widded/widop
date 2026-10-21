import React, { useState, useEffect, useCallback } from 'react';
import {
  Debt,
  Player,
  Property,
  Room,
  Transaction,
  UserSession,
} from './types';
import { GameService } from './services/gameService';
import { isSupabaseConfigured } from './services/supabaseClient';
import { formatMoney } from './utils/formatters';

// Modals and Views
import { RoomEntryView } from './components/RoomEntryView';
import { TransferModal } from './components/TransferModal';
import { RentModal } from './components/RentModal';
import { BankModal } from './components/BankModal';
import { DebtModal } from './components/DebtModal';
import { PropertyDetailModal } from './components/PropertyDetailModal';
import { PropertiesView } from './components/PropertiesView';
import { HistoryView } from './components/HistoryView';
import { PlayerDetailModal } from './components/PlayerDetailModal';
import { BankerPanel } from './components/BankerPanel';

// Icons
import {
  Building2,
  Copy,
  Check,
  Send,
  Receipt,
  HandCoins,
  Landmark,
  Building,
  History,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Home,
  Hotel,
  AlertCircle,
  Radio,
  User,
} from 'lucide-react';

export const App: React.FC = () => {
  const [session, setSession] = useState<UserSession | null>(() => GameService.getSession());
  const [room, setRoom] = useState<Room | null>(() => {
    const s = GameService.getSession();
    if (!s) return null;
    const st = GameService.getLocalRoomState(s.roomId);
    return st ? st.room : null;
  });
  const [players, setPlayers] = useState<Player[]>(() => {
    const s = GameService.getSession();
    if (!s) return [];
    const st = GameService.getLocalRoomState(s.roomId);
    return st ? st.players : [];
  });
  const [properties, setProperties] = useState<Property[]>(() => {
    const s = GameService.getSession();
    if (!s) return [];
    const st = GameService.getLocalRoomState(s.roomId);
    return st ? st.properties : [];
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const s = GameService.getSession();
    if (!s) return [];
    const st = GameService.getLocalRoomState(s.roomId);
    return st ? st.transactions : [];
  });
  const [debts, setDebts] = useState<Debt[]>(() => {
    const s = GameService.getSession();
    if (!s) return [];
    const st = GameService.getLocalRoomState(s.roomId);
    return st ? st.debts : [];
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Active View / Subpage
  const [view, setView] = useState<'home' | 'properties' | 'history' | 'banker'>('home');

  // Modals state
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [showRentModal, setShowRentModal] = useState<boolean>(false);
  const [showBankModal, setShowBankModal] = useState<boolean>(false);
  const [showDebtModal, setShowDebtModal] = useState<boolean>(false);
  const [selectedPropertyForModal, setSelectedPropertyForModal] = useState<Property | null>(null);
  const [selectedPlayerForDetail, setSelectedPlayerForDetail] = useState<Player | null>(null);

  // Refresh Room Data
  const refreshRoomData = useCallback(async () => {
    if (!session) return;
    try {
      const state = await GameService.fetchRoomState(session.roomId);
      if (state) {
        setRoom(state.room);
        setPlayers(state.players);
        setProperties(state.properties);
        setTransactions(state.transactions);
        setDebts(state.debts);
      }
    } catch (e) {
      console.error('Failed to refresh room data', e);
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Initial load and Realtime subscription
  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }

    refreshRoomData();
    const unsubscribe = GameService.subscribeToRoom(session.roomId, () => {
      refreshRoomData();
    });

    return () => {
      unsubscribe();
    };
  }, [session, refreshRoomData]);

  // Handle Session Entry (Instant 0ms transition)
  const handleJoinSuccess = (newSession: UserSession) => {
    setSession(newSession);
    const st = GameService.getLocalRoomState(newSession.roomId);
    if (st) {
      setRoom(st.room);
      setPlayers(st.players);
      setProperties(st.properties);
      setTransactions(st.transactions);
      setDebts(st.debts);
    }
    setView('home');
    setLoading(false);
    refreshRoomData();
  };

  // Handle Leave Room
  const handleLeaveRoom = () => {
    if (window.confirm('Bu odadan çıkmak istediğinize emin misiniz?')) {
      GameService.clearSession();
      setSession(null);
      setRoom(null);
      setPlayers([]);
      setProperties([]);
      setTransactions([]);
      setDebts([]);
      setView('home');
    }
  };

  // Copy Room Code
  const handleCopyCode = () => {
    if (room?.code) {
      navigator.clipboard.writeText(room.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Current Player
  const currentPlayer = players.find((p) => p.id === session?.playerId) || null;
  const isBanker = currentPlayer?.is_banker || currentPlayer?.is_owner || false;

  // Render entry view if not authenticated
  if (!session || !room) {
    return <RoomEntryView onJoinSuccess={handleJoinSuccess} savedSession={session} />;
  }

  // 1. DEDICATED BANKER PANEL
  if (view === 'banker' && isBanker && room && currentPlayer) {
    return (
      <BankerPanel
        room={room}
        players={players}
        properties={properties}
        transactions={transactions}
        debts={debts}
        currentBanker={currentPlayer}
        onBack={() => setView('home')}
        onAdjustBalance={async (targetId, diff, reason) => {
          await GameService.bankerAdjustBalance(room.id, session.sessionToken, targetId, diff, reason);
          await refreshRoomData();
        }}
        onOverrideProperty={async (propId, newOwnerId, houses, hotels, mortgaged, reason) => {
          await GameService.bankerOverrideProperty(
            room.id,
            session.sessionToken,
            propId,
            newOwnerId,
            houses,
            hotels,
            mortgaged,
            reason
          );
          await refreshRoomData();
        }}
        onRevertTransaction={async (txId, reason) => {
          await GameService.bankerRevertTransaction(room.id, session.sessionToken, txId, reason);
          await refreshRoomData();
        }}
      />
    );
  }

  // 2. PROPERTIES DIRECTORY VIEW
  if (view === 'properties' && currentPlayer) {
    return (
      <PropertiesView
        properties={properties}
        players={players}
        currentPlayer={currentPlayer}
        onSelectProperty={(p) => setSelectedPropertyForModal(p)}
        onBack={() => setView('home')}
      />
    );
  }

  // 3. TRANSACTION HISTORY VIEW
  if (view === 'history') {
    return (
      <HistoryView
        transactions={transactions}
        players={players}
        onBack={() => setView('home')}
      />
    );
  }

  // Summary counts for current player
  const myProperties = properties.filter((p) => p.owner_id === currentPlayer?.id);
  const myHouses = myProperties.reduce((sum, p) => sum + p.house_count, 0);
  const myHotels = myProperties.reduce((sum, p) => sum + p.hotel_count, 0);
  const myDebtsOwed = debts.filter((d) => d.debtor_id === currentPlayer?.id && d.status === 'open');
  const myDebtsReceivable = debts.filter((d) => d.creditor_id === currentPlayer?.id && d.status === 'open');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      {/* ÜST BAŞLIK (HEADER) */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#03140a',
            }}
          >
            <Building2 size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>ODA:</span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="badge badge-slate"
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  gap: '5px',
                  color: 'var(--text-main)',
                }}
                title="Oda kodunu kopyala"
              >
                {room?.code}
                {copiedCode ? <Check size={12} color="var(--emerald-primary)" /> : <Copy size={12} />}
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
              <Radio
                size={10}
                style={{
                  color: isSupabaseConfigured ? 'var(--emerald-primary)' : 'var(--blue-primary)',
                  animation: 'pulse 2s infinite',
                }}
              />
              <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                {isSupabaseConfigured ? 'Supabase Canlı' : 'Yerel Senkron'}
              </span>
            </div>
          </div>
        </div>

        {/* Sağ Butonlar (Bankacı Paneli ve Çıkış) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isBanker && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{
                padding: '6px 10px',
                fontSize: '12px',
                minHeight: '34px',
                borderColor: 'rgba(16, 185, 129, 0.4)',
                color: 'var(--emerald-primary)',
              }}
              onClick={() => setView('banker')}
            >
              <ShieldCheck size={14} />
              Bankacı Paneli
            </button>
          )}

          <button
            type="button"
            className="btn-icon"
            style={{ width: '34px', height: '34px', minHeight: '34px' }}
            onClick={handleLeaveRoom}
            title="Odadan Ayrıl"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* ANA İÇERİK ALANI */}
      <main style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
        {/* AKTİF OYUNCU ÖZET KARTI */}
        {currentPlayer && (
          <div
            className="card"
            style={{
              background: 'linear-gradient(145deg, #151e30 0%, #0f1624 100%)',
              borderColor: 'rgba(16, 185, 129, 0.3)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Hoş Geldin,</span>
                <h2 style={{ fontSize: '18px', fontWeight: 800 }}>{currentPlayer.name}</h2>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {currentPlayer.is_owner && <span className="badge badge-emerald">Oda Sahibi</span>}
                {currentPlayer.is_banker && <span className="badge badge-slate">Bankacı</span>}
              </div>
            </div>

            <div style={{ marginTop: '14px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                Kullanılabilir Nakit Bakiye
              </span>
              <h1
                className="num-font"
                style={{
                  fontSize: '36px',
                  fontWeight: 800,
                  color: 'var(--emerald-primary)',
                  letterSpacing: '-0.03em',
                  marginTop: '2px',
                }}
              >
                {formatMoney(currentPlayer.balance)}
              </h1>
            </div>

            {/* Varlık & Borç İstatistikleri */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                marginTop: '14px',
                paddingTop: '12px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Mülkler</span>
                <p style={{ fontWeight: 700, fontSize: '14px' }}>{myProperties.length}</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Binalar</span>
                <p style={{ fontWeight: 700, fontSize: '14px' }}>
                  {myHouses} Ev / {myHotels} Otel
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Borç Durumu</span>
                <p style={{ fontWeight: 700, fontSize: '14px' }}>
                  {myDebtsOwed.length > 0 ? (
                    <span style={{ color: 'var(--rose-primary)' }}>{myDebtsOwed.length} Borç</span>
                  ) : myDebtsReceivable.length > 0 ? (
                    <span style={{ color: 'var(--emerald-primary)' }}>{myDebtsReceivable.length} Alacak</span>
                  ) : (
                    <span style={{ color: 'var(--text-dim)' }}>Borç Yok</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* HIZLI İŞLEM ALANI (QUICK ACTION GRID) */}
        <div>
          <h3 style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>Hızlı İşlemler</h3>
          <div className="quick-action-grid">
            <div className="quick-action-tile" onClick={() => setShowTransferModal(true)}>
              <div className="tile-icon">
                <Send size={18} />
              </div>
              <span className="tile-label">Para Gönder</span>
            </div>

            <div className="quick-action-tile" onClick={() => setShowRentModal(true)}>
              <div className="tile-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--amber-primary)' }}>
                <Receipt size={18} />
              </div>
              <span className="tile-label">Kira Öde</span>
            </div>

            <div className="quick-action-tile" onClick={() => setShowDebtModal(true)}>
              <div className="tile-icon" style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--blue-primary)' }}>
                <HandCoins size={18} />
              </div>
              <span className="tile-label">Borç Ver / Al</span>
            </div>

            <div className="quick-action-tile" onClick={() => setShowBankModal(true)}>
              <div className="tile-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--emerald-primary)' }}>
                <Landmark size={18} />
              </div>
              <span className="tile-label">Banka İşlemi</span>
            </div>

            <div className="quick-action-tile" onClick={() => setView('properties')}>
              <div className="tile-icon" style={{ background: 'rgba(148, 163, 184, 0.1)', color: 'var(--text-main)' }}>
                <Building size={18} />
              </div>
              <span className="tile-label">Mülkler</span>
            </div>

            <div className="quick-action-tile" onClick={() => setView('history')}>
              <div className="tile-icon" style={{ background: 'rgba(148, 163, 184, 0.1)', color: 'var(--text-main)' }}>
                <History size={18} />
              </div>
              <span className="tile-label">Geçmiş</span>
            </div>
          </div>
        </div>

        {/* OYUNCU KARTLARI LİSTESİ */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Oyuncular ({players.length})</h3>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Detay için dokunun</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {players.map((p) => {
              const pProps = properties.filter((pr) => pr.owner_id === p.id);
              const pHouses = pProps.reduce((sum, pr) => sum + pr.house_count, 0);
              const pHotels = pProps.reduce((sum, pr) => sum + pr.hotel_count, 0);
              const pDebts = debts.filter((d) => d.debtor_id === p.id && d.status === 'open');
              const isCurrent = p.id === currentPlayer?.id;

              return (
                <div
                  key={p.id}
                  className="card card-interactive"
                  style={{
                    padding: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    borderColor: isCurrent ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-subtle)',
                  }}
                  onClick={() => setSelectedPlayerForDetail(p)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: isCurrent ? 'var(--emerald-primary)' : 'rgba(255, 255, 255, 0.08)',
                        color: isCurrent ? '#03140a' : 'var(--text-main)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '16px',
                      }}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ fontSize: '15px' }}>{p.name}</strong>
                        {isCurrent && <span className="badge badge-emerald">Siz</span>}
                        {p.is_banker && <span className="badge badge-slate">Bankacı</span>}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{pProps.length} mülk</span>
                        {(pHouses > 0 || pHotels > 0) && (
                          <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                            • {pHouses} Ev, {pHotels} Otel
                          </span>
                        )}
                        {pDebts.length > 0 && (
                          <span className="badge badge-rose" style={{ fontSize: '10px', padding: '1px 6px' }}>
                            Borçlu
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong
                      className="num-font"
                      style={{ fontSize: '17px', color: 'var(--emerald-primary)' }}
                    >
                      {formatMoney(p.balance)}
                    </strong>
                    <ChevronRight size={18} color="var(--text-dim)" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* MODALLAR */}
      {showTransferModal && currentPlayer && (
        <TransferModal
          players={players}
          currentPlayer={currentPlayer}
          onClose={() => setShowTransferModal(false)}
          onTransfer={async (fromId, toId, amount, note) => {
            await GameService.transferMoney(room.id, session.sessionToken, fromId, toId, amount, note);
            await refreshRoomData();
          }}
        />
      )}

      {showRentModal && currentPlayer && (
        <RentModal
          properties={properties}
          players={players}
          currentPlayer={currentPlayer}
          onClose={() => setShowRentModal(false)}
          onPayRent={async (payerId, propId, finalAmount, note) => {
            await GameService.payRent(room.id, session.sessionToken, payerId, propId, finalAmount, note);
            await refreshRoomData();
          }}
        />
      )}

      {showBankModal && currentPlayer && (
        <BankModal
          players={players}
          currentPlayer={currentPlayer}
          onClose={() => setShowBankModal(false)}
          onBankTransaction={async (pId, amount, dir, desc) => {
            await GameService.bankTransaction(room.id, session.sessionToken, pId, amount, dir, desc);
            await refreshRoomData();
          }}
        />
      )}

      {showDebtModal && currentPlayer && (
        <DebtModal
          players={players}
          debts={debts}
          currentPlayer={currentPlayer}
          onClose={() => setShowDebtModal(false)}
          onCreateDebt={async (credId, debId, amt, rsn) => {
            await GameService.createDebt(room.id, session.sessionToken, credId, debId, amt, rsn);
            await refreshRoomData();
          }}
          onPayDebt={async (debtId, payerId, payAmt, forgiveAmt) => {
            await GameService.payDebt(room.id, session.sessionToken, debtId, payerId, payAmt, forgiveAmt);
            await refreshRoomData();
          }}
        />
      )}

      {selectedPropertyForModal && currentPlayer && (
        <PropertyDetailModal
          property={selectedPropertyForModal}
          allProperties={properties}
          players={players}
          currentPlayer={currentPlayer}
          onClose={() => setSelectedPropertyForModal(null)}
          onBuyFromBank={async (propId) => {
            await GameService.buyPropertyFromBank(room.id, session.sessionToken, currentPlayer.id, propId);
            await refreshRoomData();
          }}
          onTradeProperty={async (sellerId, buyerId, propId, price) => {
            await GameService.tradeProperty(room.id, session.sessionToken, sellerId, buyerId, propId, price);
            await refreshRoomData();
          }}
          onBuildHouse={async (propId) => {
            await GameService.buildHouse(room.id, session.sessionToken, currentPlayer.id, propId);
            await refreshRoomData();
          }}
          onToggleMortgage={async (propId) => {
            await GameService.toggleMortgage(room.id, session.sessionToken, currentPlayer.id, propId);
            await refreshRoomData();
          }}
        />
      )}

      {selectedPlayerForDetail && (
        <PlayerDetailModal
          player={selectedPlayerForDetail}
          properties={properties}
          debts={debts}
          transactions={transactions}
          players={players}
          onClose={() => setSelectedPlayerForDetail(null)}
          onSelectProperty={(p) => setSelectedPropertyForModal(p)}
        />
      )}
    </div>
  );
};

export default App;
