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
  Users,
  RefreshCw,
  Zap,
  MoreHorizontal,
  ArrowRight,
  ShieldAlert,
  Info,
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

  // Active Bottom Navigation Tab: 'game' | 'actions' | 'properties' | 'more'
  const [activeTab, setActiveTab] = useState<'game' | 'actions' | 'properties' | 'more'>('game');

  // Sub-view overlay state (for banker panel or standalone views)
  const [view, setView] = useState<'main' | 'banker'>('main');
  const [moreSubView, setMoreSubView] = useState<'menu' | 'history'>('menu');

  // Modals state
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [showRentModal, setShowRentModal] = useState<boolean>(false);
  const [showBankModal, setShowBankModal] = useState<boolean>(false);
  const [showDebtModal, setShowDebtModal] = useState<boolean>(false);
  const [selectedPropertyForModal, setSelectedPropertyForModal] = useState<Property | null>(null);
  const [selectedPlayerForDetail, setSelectedPlayerForDetail] = useState<Player | null>(null);
  const [transferTargetPlayerId, setTransferTargetPlayerId] = useState<string | undefined>(undefined);
  const [isManualRefreshing, setIsManualRefreshing] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'info' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 2800);
  }, []);

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

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    await refreshRoomData();
    showToast('Veriler güncellendi! 🔄');
    setTimeout(() => setIsManualRefreshing(false), 600);
  };

  // Masa Bankacısının tek dokunuşla oyuncuya maaş (+200 ₺) dağıtması
  const handleBankerGiveSalary = async (targetPlayerId: string, targetPlayerName: string) => {
    if (!room || !session || !currentPlayer) return;
    if (!currentPlayer.is_banker) {
      showToast('Yalnızca Masa Bankacısı para dağıtabilir!', 'error');
      return;
    }
    try {
      await GameService.bankTransaction(
        room.id,
        session.sessionToken,
        targetPlayerId,
        200,
        'bank_to_player',
        'Başlangıç Çizgisi Maaşı (+200 ₺)'
      );
      showToast(`${targetPlayerName} oyuncusuna +200 ₺ maaş verildi! ⚡`);
      await refreshRoomData();
    } catch (err: any) {
      showToast(err.message || 'Maaş ödemesi başarısız', 'error');
    }
  };

  // Initial load, Realtime subscription, and active Polling Heartbeat
  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }

    // 1. Initial fetch
    refreshRoomData();

    // 2. Realtime WebSocket subscription (Broadcast + Postgres CDC)
    const unsubscribe = GameService.subscribeToRoom(session.roomId, () => {
      refreshRoomData();
    });

    // 3. 2-second background polling heartbeat for bulletproof cross-device sync
    const pollInterval = setInterval(() => {
      refreshRoomData();
    }, 2000);

    // 4. Instant sync when player unlocks phone or switches tabs
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshRoomData();
      }
    };
    const handleFocus = () => {
      refreshRoomData();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [session, refreshRoomData]);

  // Handle Session Entry (Instant transition)
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
    setView('main');
    setActiveTab('game');
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
      setView('main');
      setActiveTab('game');
    }
  };

  // Copy Room Code
  const handleCopyCode = () => {
    if (room?.code) {
      navigator.clipboard.writeText(room.code);
      setCopiedCode(true);
      showToast(`Oda kodu kopyalandı: ${room.code} 📋`);
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

  // Summary counts for current player
  const myProperties = properties.filter((p) => p.owner_id === currentPlayer?.id);
  const myHouses = myProperties.reduce((sum, p) => sum + p.house_count, 0);
  const myHotels = myProperties.reduce((sum, p) => sum + p.hotel_count, 0);
  const myDebtsOwed = debts.filter((d) => d.debtor_id === currentPlayer?.id && d.status === 'open');
  const myDebtsReceivable = debts.filter((d) => d.creditor_id === currentPlayer?.id && d.status === 'open');
  const openDebtsCount = debts.filter((d) => d.status === 'open').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      {/* 1. BANKACI PANELİ TAM EKRAN GÖRÜNÜMÜ */}
      {view === 'banker' && isBanker && room && currentPlayer ? (
        <BankerPanel
          room={room}
          players={players}
          properties={properties}
          transactions={transactions}
          debts={debts}
          currentBanker={currentPlayer}
          onBack={() => setView('main')}
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
      ) : (
        <>
          {/* 2. STANDART MOBİL HEADER */}
          <header className="app-header">
            {/* Sol Taraf: Logo & Oda Kodu (1-Dokunuşla Kopyalama) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--emerald-primary)',
                }}
              >
                <Building2 size={17} />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="badge badge-slate"
                    style={{
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      gap: '4px',
                      color: 'var(--text-main)',
                      padding: '2px 8px',
                    }}
                    title="Oda kodunu kopyala"
                  >
                    <span>#{room?.code}</span>
                    {copiedCode ? <Check size={12} color="var(--emerald-primary)" /> : <Copy size={11} />}
                  </button>

                  <span className="badge badge-slate" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {players.length} Oyuncu
                  </span>
                </div>
              </div>
            </div>

            {/* Sağ Taraf: Bankacı Butonu (varsa) & Yenile Butonu */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isBanker && (
                <button
                  type="button"
                  className="btn"
                  style={{
                    padding: '5px 9px',
                    fontSize: '11px',
                    fontWeight: 700,
                    minHeight: '32px',
                    borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    borderColor: 'rgba(16, 185, 129, 0.35)',
                    color: 'var(--emerald-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  onClick={() => setView('banker')}
                  title="Bankacı Yönetim Paneli"
                >
                  <ShieldCheck size={13} />
                  <span>Bankacı</span>
                </button>
              )}

              <button
                type="button"
                className="btn-icon"
                style={{ width: '32px', height: '32px', minHeight: '32px' }}
                onClick={handleManualRefresh}
                title="Verileri Yenile"
              >
                <RefreshCw
                  size={14}
                  style={{
                    animation: isManualRefreshing ? 'spin 0.8s linear infinite' : 'none',
                    color: isManualRefreshing ? 'var(--emerald-primary)' : 'var(--text-muted)',
                  }}
                />
              </button>
            </div>
          </header>

          {/* 3. ANA İÇERİK ALANI (4 ALT SEKMEYE GÖRE DEĞİŞEN İÇERİK) */}
          <main className="main-content-scroll" style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* ========================================================= */}
            {/* SEKME 1: OYUN (OYUNCULAR VE BAKİYELER) */}
            {/* ========================================================= */}
            {activeTab === 'game' && (
              <>
                {/* AKTİF OYUNCU KİŞİSEL BAKİYE KARTI */}
                {currentPlayer && (
                  <div
                    className="card"
                    style={{
                      background: 'linear-gradient(180deg, #131c2e 0%, #0e1524 100%)',
                      borderColor: 'rgba(16, 185, 129, 0.25)',
                      padding: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Mevcut Bakiyeniz
                        </span>
                        <h1
                          className="num-font"
                          style={{
                            fontSize: '32px',
                            fontWeight: 800,
                            color: 'var(--emerald-primary)',
                            letterSpacing: '-0.02em',
                            lineHeight: 1.1,
                            marginTop: '2px',
                          }}
                        >
                          {formatMoney(currentPlayer.balance)}
                        </h1>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {currentPlayer.is_owner && <span className="badge badge-emerald">Oda Kurucusu</span>}
                          {currentPlayer.is_banker && <span className="badge badge-amber">👑 Bankacı</span>}
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                          {currentPlayer.name}
                        </span>
                      </div>
                    </div>

                    {/* Varlık & Borç Özeti (3 Sütun) */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '6px',
                        marginTop: '12px',
                        paddingTop: '10px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                      }}
                    >
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Tapular</span>
                        <p style={{ fontWeight: 700, fontSize: '13px' }}>{myProperties.length} Adet</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Binalar</span>
                        <p style={{ fontWeight: 700, fontSize: '13px' }}>
                          {myHouses} Ev {myHotels > 0 ? `• ${myHotels} Otel` : ''}
                        </p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Borç Durumu</span>
                        <p style={{ fontWeight: 700, fontSize: '13px' }}>
                          {myDebtsOwed.length > 0 ? (
                            <span style={{ color: 'var(--rose-primary)' }}>{myDebtsOwed.length} Borç</span>
                          ) : myDebtsReceivable.length > 0 ? (
                            <span style={{ color: 'var(--emerald-primary)' }}>{myDebtsReceivable.length} Alacak</span>
                          ) : (
                            <span style={{ color: 'var(--text-dim)' }}>Temiz</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* DİKEY SIRALANMIŞ OYUNCU KARTLARI */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 2px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>
                      Masa Oyuncuları ({players.length})
                    </h3>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Detay için dokunun</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {players.map((p) => {
                      const pProps = properties.filter((pr) => pr.owner_id === p.id);
                      const pHouses = pProps.reduce((sum, pr) => sum + pr.house_count, 0);
                      const pHotels = pProps.reduce((sum, pr) => sum + pr.hotel_count, 0);
                      const pDebts = debts.filter((d) => d.debtor_id === p.id && d.status === 'open');
                      const isCurrent = p.id === currentPlayer?.id;
                      const uniqueColors = Array.from(new Set(pProps.map((pr) => pr.group_color)));

                      return (
                        <div
                          key={p.id}
                          className="card card-interactive"
                          style={{
                            padding: '10px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            borderColor: isCurrent ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-subtle)',
                            background: isCurrent ? 'rgba(16, 185, 129, 0.04)' : 'var(--bg-card)',
                          }}
                          onClick={() => setSelectedPlayerForDetail(p)}
                        >
                          {/* Sol: Avatar, İsim ve Varlıklar */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: isCurrent ? 'var(--emerald-primary)' : 'rgba(255, 255, 255, 0.08)',
                                color: isCurrent ? '#03140a' : 'var(--text-main)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '15px',
                                flexShrink: 0,
                              }}
                            >
                              {p.name.charAt(0).toUpperCase()}
                            </div>

                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <strong style={{ fontSize: '14px' }}>{p.name}</strong>
                                {isCurrent && (
                                  <span className="badge badge-emerald" style={{ fontSize: '9px', padding: '1px 5px' }}>
                                    Siz
                                  </span>
                                )}
                                {p.is_banker && (
                                  <span className="badge badge-amber" style={{ fontSize: '9px', padding: '1px 5px' }}>
                                    Bankacı
                                  </span>
                                )}
                              </div>

                              {/* İkincil Bilgiler: Tapu rengi noktaları & Bina sayısı */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                {uniqueColors.length > 0 && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginRight: '3px' }}>
                                    {uniqueColors.map((col, idx) => (
                                      <span
                                        key={idx}
                                        style={{
                                          width: '6px',
                                          height: '6px',
                                          borderRadius: '50%',
                                          backgroundColor: col,
                                          display: 'inline-block',
                                        }}
                                      />
                                    ))}
                                  </div>
                                )}

                                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                                  {pProps.length} tapu
                                </span>

                                {(pHouses > 0 || pHotels > 0) && (
                                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                                    • {pHouses > 0 ? `${pHouses}E` : ''} {pHotels > 0 ? `${pHotels}O` : ''}
                                  </span>
                                )}

                                {pDebts.length > 0 && (
                                  <span className="badge badge-rose" style={{ fontSize: '9px', padding: '0 4px' }}>
                                    Borçlu
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Sağ: Büyük Bakiye ve Hızlı Aksiyon Butonu */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ textAlign: 'right' }}>
                              <strong
                                className="num-font"
                                style={{ fontSize: '16px', fontWeight: 800, color: 'var(--emerald-primary)', display: 'block' }}
                              >
                                {formatMoney(p.balance)}
                              </strong>
                            </div>

                            {/* Masa Bankacısı ise: Tek Dokunuşla Maaş Butonu */}
                            {currentPlayer?.is_banker && (
                              <button
                                type="button"
                                className="btn"
                                style={{
                                  padding: '4px 7px',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  minHeight: '28px',
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  color: 'var(--emerald-primary)',
                                  border: '1px solid rgba(16, 185, 129, 0.35)',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBankerGiveSalary(p.id, p.name);
                                }}
                                title={`${p.name} başlangıçtan geçtiğinde +200 ₺ maaş ver`}
                              >
                                <Zap size={11} /> +200
                              </button>
                            )}

                            {/* Kendisi değilse: Hızlı Gönder Butonu */}
                            {!isCurrent && (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  minHeight: '28px',
                                  color: 'var(--emerald-primary)',
                                  borderColor: 'rgba(16, 185, 129, 0.35)',
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTransferTargetPlayerId(p.id);
                                  setShowTransferModal(true);
                                }}
                                title={`${p.name}'a Para Gönder`}
                              >
                                Gönder
                              </button>
                            )}

                            <ChevronRight size={14} color="var(--text-dim)" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* ========================================================= */}
            {/* SEKME 2: İŞLEMLER (HIZLI İŞLEM MERKEZİ) */}
            {/* ========================================================= */}
            {activeTab === 'actions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800 }}>İşlem Merkezi</h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sık kullanılan Monopoly eylemleri</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {/* 1. PARA GÖNDER */}
                  <div
                    className="card card-interactive"
                    style={{
                      padding: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      borderColor: 'rgba(16, 185, 129, 0.3)',
                    }}
                    onClick={() => {
                      setTransferTargetPlayerId(undefined);
                      setShowTransferModal(true);
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: 'var(--emerald-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Send size={18} />
                    </div>
                    <div>
                      <strong style={{ fontSize: '14px', display: 'block' }}>Para Gönder</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Arkadaşına para aktar</span>
                    </div>
                  </div>

                  {/* 2. KİRA ÖDE */}
                  <div
                    className="card card-interactive"
                    style={{
                      padding: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      borderColor: 'rgba(245, 158, 11, 0.3)',
                    }}
                    onClick={() => setShowRentModal(true)}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: 'var(--amber-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Receipt size={18} />
                    </div>
                    <div>
                      <strong style={{ fontSize: '14px', display: 'block' }}>Kira Öde</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Arsa sahibine kira ver</span>
                    </div>
                  </div>

                  {/* 3. VERGİ ÖDE / BANKA */}
                  <div
                    className="card card-interactive"
                    style={{
                      padding: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      borderColor: 'rgba(239, 68, 68, 0.3)',
                    }}
                    onClick={() => setShowBankModal(true)}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: 'var(--rose-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Landmark size={18} />
                    </div>
                    <div>
                      <strong style={{ fontSize: '14px', display: 'block' }}>Vergi Öde</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Banka, gelir veya ceza</span>
                    </div>
                  </div>

                  {/* 4. BORÇ İŞLEMLERİ */}
                  <div
                    className="card card-interactive"
                    style={{
                      padding: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      borderColor: 'rgba(56, 189, 248, 0.3)',
                    }}
                    onClick={() => setShowDebtModal(true)}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'rgba(56, 189, 248, 0.15)',
                        color: 'var(--blue-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <HandCoins size={18} />
                    </div>
                    <div>
                      <strong style={{ fontSize: '14px', display: 'block' }}>Borç Ver</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Borç aç veya kapat</span>
                    </div>
                  </div>
                </div>

                {/* Masa Bankacısı Özel Bölümü (Yalnızca bankacıya gösterilir) */}
                {currentPlayer?.is_banker && (
                  <div
                    className="card"
                    style={{
                      marginTop: '6px',
                      background: 'rgba(16, 185, 129, 0.05)',
                      borderColor: 'rgba(16, 185, 129, 0.25)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--emerald-primary)' }}>
                        👑 Masa Bankacısı Hızlı Aksiyonları
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn"
                        style={{
                          flex: 1,
                          fontSize: '12px',
                          fontWeight: 700,
                          minHeight: '38px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: 'var(--emerald-primary)',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                        }}
                        onClick={() => handleBankerGiveSalary(currentPlayer.id, 'Kendinize')}
                      >
                        <Zap size={14} /> +200 ₺ Maaşım
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{
                          flex: 1,
                          fontSize: '12px',
                          fontWeight: 700,
                          minHeight: '38px',
                        }}
                        onClick={() => setView('banker')}
                      >
                        <ShieldCheck size={14} /> Bankacı Paneli
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* SEKME 3: MÜLKLER (BÜTÜN MÜLKLERİN LİSTESİ) */}
            {/* ========================================================= */}
            {activeTab === 'properties' && currentPlayer && (
              <PropertiesView
                properties={properties}
                players={players}
                currentPlayer={currentPlayer}
                onSelectProperty={(p) => setSelectedPropertyForModal(p)}
                onQuickBuy={async (propId) => {
                  if (!room || !session) return;
                  try {
                    await GameService.buyPropertyFromBank(room.id, session.sessionToken, currentPlayer.id, propId);
                    showToast('Mülk satın alındı! 🏠');
                    await refreshRoomData();
                  } catch (e: any) {
                    showToast(e.message || 'Satın alma başarısız', 'error');
                  }
                }}
              />
            )}

            {/* ========================================================= */}
            {/* SEKME 4: DAHA FAZLA (BORÇLAR, GEÇMİŞ, BİLGİLER) */}
            {/* ========================================================= */}
            {activeTab === 'more' && (
              <>
                {moreSubView === 'history' ? (
                  <HistoryView
                    transactions={transactions}
                    players={players}
                    onBack={() => setMoreSubView('menu')}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Daha Fazla</h2>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Borçlar, geçmiş ve oda ayarları</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* 1. Borçlar Yönetimi */}
                      <div
                        className="card card-interactive"
                        style={{
                          padding: '12px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                        }}
                        onClick={() => setShowDebtModal(true)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '8px',
                              background: 'rgba(56, 189, 248, 0.15)',
                              color: 'var(--blue-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <HandCoins size={17} />
                          </div>
                          <div>
                            <strong style={{ fontSize: '14px', display: 'block' }}>Borç Yönetimi</strong>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Oyuncular arası açık borçlar ve mutabakat
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {openDebtsCount > 0 ? (
                            <span className="badge badge-amber">{openDebtsCount} Açık</span>
                          ) : (
                            <span className="badge badge-slate">Temiz</span>
                          )}
                          <ChevronRight size={14} color="var(--text-dim)" />
                        </div>
                      </div>

                      {/* 2. İşlem Geçmişi */}
                      <div
                        className="card card-interactive"
                        style={{
                          padding: '12px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                        }}
                        onClick={() => setMoreSubView('history')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '8px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: 'var(--text-main)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <History size={17} />
                          </div>
                          <div>
                            <strong style={{ fontSize: '14px', display: 'block' }}>İşlem Geçmişi</strong>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Para, kira ve tapu kayıtları denetimi
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="badge badge-slate">{transactions.length}</span>
                          <ChevronRight size={14} color="var(--text-dim)" />
                        </div>
                      </div>

                      {/* 3. Bankacı Paneli (Yalnızca bankacıya gösterilir) */}
                      {isBanker && (
                        <div
                          className="card card-interactive"
                          style={{
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            borderColor: 'rgba(16, 185, 129, 0.3)',
                          }}
                          onClick={() => setView('banker')}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '8px',
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: 'var(--emerald-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <ShieldCheck size={17} />
                            </div>
                            <div>
                              <strong style={{ fontSize: '14px', display: 'block', color: 'var(--emerald-primary)' }}>
                                Bankacı Yönetim Paneli
                              </strong>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                Bakiye düzeltme, tapu müdahalesi ve ters işlem
                              </span>
                            </div>
                          </div>

                          <ChevronRight size={14} color="var(--text-dim)" />
                        </div>
                      )}

                      {/* 4. Masa Bilgileri & Senkronizasyon */}
                      <div className="card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
                          Oda & Bağlantı Durumu
                        </span>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                          <span style={{ color: 'var(--text-dim)' }}>Oda Kodu:</span>
                          <strong className="num-font" style={{ color: 'var(--text-main)' }}>#{room?.code}</strong>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                          <span style={{ color: 'var(--text-dim)' }}>Veritabanı:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Radio
                              size={10}
                              style={{
                                color: isSupabaseConfigured ? 'var(--emerald-primary)' : 'var(--blue-primary)',
                              }}
                            />
                            <span style={{ fontSize: '12px', color: 'var(--text-main)' }}>
                              {isSupabaseConfigured ? 'Supabase Canlı Bulut' : 'Yerel Senkron'}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                          <span style={{ color: 'var(--text-dim)' }}>Senkronizasyon:</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Gerçek Zamanlı WebSocket + 2s Nabız
                          </span>
                        </div>
                      </div>

                      {/* 5. Odadan Ayrıl */}
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{
                          marginTop: '6px',
                          borderColor: 'rgba(239, 68, 68, 0.3)',
                          color: 'var(--rose-primary)',
                          justifyContent: 'center',
                        }}
                        onClick={handleLeaveRoom}
                      >
                        <LogOut size={16} /> Odadan Ayrıl
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </main>

          {/* 4. MOBİL SABİT ALT NAVİGASYON (EN FAZLA 4 ANA BÖLÜM) */}
          <nav className="bottom-nav">
            <div className="bottom-nav-inner">
              {/* Sekme 1: Oyun */}
              <button
                type="button"
                className={`bottom-nav-item ${activeTab === 'game' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('game');
                  setMoreSubView('menu');
                }}
              >
                <div className="nav-icon-wrapper">
                  <Users size={18} />
                </div>
                <span>Oyun</span>
              </button>

              {/* Sekme 2: İşlemler */}
              <button
                type="button"
                className={`bottom-nav-item ${activeTab === 'actions' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('actions');
                  setMoreSubView('menu');
                }}
              >
                <div className="nav-icon-wrapper">
                  <Zap size={18} />
                </div>
                <span>İşlemler</span>
              </button>

              {/* Sekme 3: Mülkler */}
              <button
                type="button"
                className={`bottom-nav-item ${activeTab === 'properties' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('properties');
                  setMoreSubView('menu');
                }}
              >
                <div className="nav-icon-wrapper">
                  <Building2 size={18} />
                </div>
                <span>Mülkler</span>
              </button>

              {/* Sekme 4: Daha Fazla */}
              <button
                type="button"
                className={`bottom-nav-item ${activeTab === 'more' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('more');
                  setMoreSubView('menu');
                }}
              >
                <div className="nav-icon-wrapper" style={{ position: 'relative' }}>
                  <MoreHorizontal size={18} />
                  {openDebtsCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '1px',
                        right: '3px',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--amber-primary)',
                      }}
                    />
                  )}
                </div>
                <span>Daha Fazla</span>
              </button>
            </div>
          </nav>
        </>
      )}

      {/* 5. KÖK DÜZEYİNDE MODALLAR (HER SEKMEYLE 100% ENTEGRE) */}
      {showTransferModal && currentPlayer && (
        <TransferModal
          players={players}
          currentPlayer={currentPlayer}
          initialToPlayerId={transferTargetPlayerId}
          onClose={() => {
            setShowTransferModal(false);
            setTransferTargetPlayerId(undefined);
          }}
          onTransfer={async (fromId, toId, amount, note) => {
            if (!room || !session) return;
            await GameService.transferMoney(room.id, session.sessionToken, fromId, toId, amount, note);
            const toP = players.find((p) => p.id === toId);
            showToast(`${toP ? toP.name : 'Oyuncu'}'a ${formatMoney(amount)} gönderildi! 💸`);
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
            if (!room || !session) return;
            await GameService.payRent(room.id, session.sessionToken, payerId, propId, finalAmount, note);
            const pr = properties.find((p) => p.id === propId);
            showToast(`${pr ? pr.name : 'Mülk'} kirası (${formatMoney(finalAmount)}) ödendi! 🏠`);
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
            if (!room || !session) return;
            await GameService.bankTransaction(room.id, session.sessionToken, pId, amount, dir, desc);
            showToast(
              dir === 'bank_to_player'
                ? `Bankadan ${formatMoney(amount)} alındı! 💰`
                : `Bankaya ${formatMoney(amount)} ödendi! 🏦`
            );
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
            if (!room || !session) return;
            await GameService.createDebt(room.id, session.sessionToken, credId, debId, amt, rsn);
            showToast(`Borç kaydı oluşturuldu: ${formatMoney(amt)}`);
            await refreshRoomData();
          }}
          onPayDebt={async (debtId, payerId, payAmt, forgiveAmt) => {
            if (!room || !session) return;
            await GameService.payDebt(room.id, session.sessionToken, debtId, payerId, payAmt, forgiveAmt);
            showToast(`Borç ödendi: ${formatMoney(payAmt)}`);
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
          onBuyFromBank={async (propId, buyerId) => {
            if (!room || !session) return;
            const targetBuyerId = buyerId || currentPlayer.id;
            await GameService.buyPropertyFromBank(room.id, session.sessionToken, targetBuyerId, propId);
            const buyer = players.find((p) => p.id === targetBuyerId);
            showToast(`${selectedPropertyForModal.name} tapusu ${buyer ? buyer.name : ''} adlı oyuncuya verildi! 🏠`);
            await refreshRoomData();
          }}
          onTradeProperty={async (sellerId, buyerId, propId, price) => {
            if (!room || !session) return;
            await GameService.tradeProperty(room.id, session.sessionToken, sellerId, buyerId, propId, price);
            showToast(`Tapu devri gerçekleşti! (${formatMoney(price)})`);
            await refreshRoomData();
          }}
          onBuildHouse={async (propId) => {
            if (!room || !session) return;
            await GameService.buildHouse(room.id, session.sessionToken, currentPlayer.id, propId);
            showToast(`Ev/Otel inşa edildi! 🏗️`);
            await refreshRoomData();
          }}
          onToggleMortgage={async (propId) => {
            if (!room || !session) return;
            await GameService.toggleMortgage(room.id, session.sessionToken, currentPlayer.id, propId);
            showToast(`İpotek durumu güncellendi.`);
            await refreshRoomData();
          }}
        />
      )}

      {selectedPlayerForDetail && currentPlayer && (
        <PlayerDetailModal
          player={selectedPlayerForDetail}
          currentPlayer={currentPlayer}
          properties={properties}
          debts={debts}
          transactions={transactions}
          players={players}
          onClose={() => setSelectedPlayerForDetail(null)}
          onSelectProperty={(p) => setSelectedPropertyForModal(p)}
          onQuickSendMoney={async (toPlayerId, amount) => {
            if (!room || !session) return;
            await GameService.transferMoney(
              room.id,
              session.sessionToken,
              currentPlayer.id,
              toPlayerId,
              amount,
              'Hızlı Transfer'
            );
            showToast(`${selectedPlayerForDetail.name}'a ${formatMoney(amount)} gönderildi! 💸`);
            await refreshRoomData();
          }}
          onQuickPayRent={async (propId, amount) => {
            if (!room || !session) return;
            await GameService.payRent(
              room.id,
              session.sessionToken,
              currentPlayer.id,
              propId,
              amount,
              'Hızlı Kira'
            );
            const pr = properties.find((p) => p.id === propId);
            showToast(`${pr ? pr.name : 'Mülk'} kirası (${formatMoney(amount)}) ödendi! 🏠`);
            await refreshRoomData();
          }}
        />
      )}

      {/* Toast Bildirim Bannerı */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '70px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            backgroundColor:
              toast.type === 'error'
                ? 'var(--rose-primary)'
                : toast.type === 'info'
                ? 'var(--blue-primary)'
                : 'var(--emerald-primary)',
            color: toast.type === 'error' ? '#fff' : '#03140a',
            padding: '8px 16px',
            borderRadius: '999px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            fontSize: '13px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            animation: 'fadeIn 0.2s ease-out',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default App;
