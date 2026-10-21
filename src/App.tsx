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
  RefreshCw,
  Zap,
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

        {/* Sağ Butonlar (Yenile, Bankacı Paneli ve Çıkış) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn-icon"
            style={{ width: '34px', height: '34px', minHeight: '34px' }}
            onClick={handleManualRefresh}
            title="Verileri Hemen Yenile"
          >
            <RefreshCw
              size={15}
              style={{
                animation: isManualRefreshing ? 'spin 0.8s linear infinite' : 'none',
                color: isManualRefreshing ? 'var(--emerald-primary)' : 'var(--text-muted)',
              }}
            />
          </button>

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
                {currentPlayer.is_banker && (
                  <span className="badge badge-emerald" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    👑 Bankacı
                  </span>
                )}
              </div>
            </div>

            <div
              style={{
                marginTop: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Kullanılabilir Nakit Bakiye
                </span>
                <h1
                  className="num-font"
                  style={{
                    fontSize: '34px',
                    fontWeight: 800,
                    color: 'var(--emerald-primary)',
                    letterSpacing: '-0.03em',
                    marginTop: '2px',
                    lineHeight: 1.1,
                  }}
                >
                  {formatMoney(currentPlayer.balance)}
                </h1>
              </div>

              {/* Yalnızca Masa Bankacısı için Hızlı Kendine Maaş Butonu */}
              {currentPlayer.is_banker && (
                <button
                  type="button"
                  onClick={() => handleBankerGiveSalary(currentPlayer.id, 'Kendinize')}
                  className="btn"
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#03140a',
                    fontWeight: 800,
                    fontSize: '12px',
                    padding: '6px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    minHeight: '34px',
                  }}
                  title="Başlangıç çizgisinden geçiş maaşı (+200 ₺)"
                >
                  <Zap size={14} /> +200 ₺ Maaşım
                </button>
              )}
            </div>

            {/* Varlık & Borç İstatistikleri */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                marginTop: '12px',
                paddingTop: '10px',
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
                    <span style={{ color: 'var(--text-dim)' }}>Temiz</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* HIZLI İŞLEM MERKEZİ (SADE 2x2 MOBİL KART DÜZENİ) */}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* 1. KİRA ÖDE */}
            <div
              className="card card-interactive"
              style={{
                padding: '12px 14px',
                background: 'linear-gradient(145deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.03) 100%)',
                borderColor: 'rgba(245, 158, 11, 0.35)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                cursor: 'pointer',
              }}
              onClick={() => setShowRentModal(true)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: 'var(--amber-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Receipt size={18} />
                </div>
                <span className="badge badge-slate" style={{ fontSize: '10px', padding: '1px 6px' }}>En Sık</span>
              </div>
              <div>
                <strong style={{ fontSize: '14px', color: 'var(--text-main)', display: 'block' }}>Kira Öde</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Arsa sahibine kira ver</span>
              </div>
            </div>

            {/* 2. PARA GÖNDER */}
            <div
              className="card card-interactive"
              style={{
                padding: '12px 14px',
                background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.03) 100%)',
                borderColor: 'rgba(16, 185, 129, 0.35)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                cursor: 'pointer',
              }}
              onClick={() => {
                setTransferTargetPlayerId(undefined);
                setShowTransferModal(true);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: 'var(--emerald-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Send size={18} />
                </div>
                <span className="badge badge-emerald" style={{ fontSize: '10px', padding: '1px 6px' }}>Hızlı</span>
              </div>
              <div>
                <strong style={{ fontSize: '14px', color: 'var(--text-main)', display: 'block' }}>Para Gönder</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Arkadaşına para aktar</span>
              </div>
            </div>

            {/* 3. VERGİ ÖDE */}
            <div
              className="card card-interactive"
              style={{
                padding: '12px 14px',
                background: isBanker
                  ? 'linear-gradient(145deg, rgba(16, 185, 129, 0.15) 0%, rgba(56, 189, 248, 0.05) 100%)'
                  : 'linear-gradient(145deg, rgba(244, 63, 94, 0.12) 0%, rgba(244, 63, 94, 0.03) 100%)',
                borderColor: isBanker ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.35)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                cursor: 'pointer',
              }}
              onClick={() => setShowBankModal(true)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: isBanker ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.2)',
                    color: isBanker ? 'var(--emerald-primary)' : 'var(--rose-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Landmark size={18} />
                </div>
                <span className={`badge ${isBanker ? 'badge-emerald' : 'badge-slate'}`} style={{ fontSize: '10px', padding: '1px 6px' }}>
                  {isBanker ? 'Kasa' : 'Banka'}
                </span>
              </div>
              <div>
                <strong style={{ fontSize: '14px', color: 'var(--text-main)', display: 'block' }}>
                  {isBanker ? 'Banka & Kasa' : 'Vergi Öde'}
                </strong>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {isBanker ? 'Maaş ver / tahsil et' : 'Gelir, ceza veya kodes'}
                </span>
              </div>
            </div>

            {/* 4. BORÇ VERME */}
            <div
              className="card card-interactive"
              style={{
                padding: '12px 14px',
                background: 'linear-gradient(145deg, rgba(56, 189, 248, 0.12) 0%, rgba(56, 189, 248, 0.03) 100%)',
                borderColor: 'rgba(56, 189, 248, 0.35)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                cursor: 'pointer',
              }}
              onClick={() => setShowDebtModal(true)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: 'rgba(56, 189, 248, 0.2)',
                    color: 'var(--blue-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <HandCoins size={18} />
                </div>
                {myDebtsOwed.length > 0 ? (
                  <span className="badge badge-rose" style={{ fontSize: '9px', padding: '1px 5px' }}>
                    {myDebtsOwed.length} Borç
                  </span>
                ) : (
                  <span className="badge badge-slate" style={{ fontSize: '10px', padding: '1px 6px' }}>Borç</span>
                )}
              </div>
              <div>
                <strong style={{ fontSize: '14px', color: 'var(--text-main)', display: 'block' }}>Borç Verme</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Arkadaşına borç aç/kapat</span>
              </div>
            </div>
          </div>

          {/* İkincil İnceleme Araçları (Tapu Rehberi & Geçmiş) */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{
                flex: 1,
                fontSize: '11px',
                padding: '7px 10px',
                minHeight: '34px',
                justifyContent: 'center',
                gap: '6px',
                color: 'var(--text-main)',
              }}
              onClick={() => setView('properties')}
            >
              <Building size={14} color="var(--blue-primary)" />
              Tapuları İncele ({properties.length})
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              style={{
                flex: 1,
                fontSize: '11px',
                padding: '7px 10px',
                minHeight: '34px',
                justifyContent: 'center',
                gap: '6px',
                color: 'var(--text-muted)',
              }}
              onClick={() => setView('history')}
            >
              <History size={14} color="var(--text-dim)" />
              İşlem Geçmişi
            </button>
          </div>
        </div>

        {/* OYUNCU KARTLARI LİSTESİ */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Masa Oyuncuları ({players.length})</h3>
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
                  }}
                  onClick={() => setSelectedPlayerForDetail(p)}
                >
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
                        {isCurrent && <span className="badge badge-emerald" style={{ fontSize: '9px', padding: '1px 5px' }}>Siz</span>}
                        {p.is_banker && <span className="badge badge-slate" style={{ fontSize: '9px', padding: '1px 5px' }}>Bankacı</span>}
                      </div>

                      {/* Mülk Renk Noktaları ve Varlık Özeti */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px', flexWrap: 'wrap' }}>
                        {uniqueColors.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginRight: '2px' }}>
                            {uniqueColors.map((col, idx) => (
                              <span
                                key={idx}
                                style={{
                                  width: '7px',
                                  height: '7px',
                                  borderRadius: '50%',
                                  backgroundColor: col,
                                  display: 'inline-block',
                                }}
                              />
                            ))}
                          </div>
                        )}

                        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{pProps.length} tapu</span>
                        {(pHouses > 0 || pHotels > 0) && (
                          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                            • {pHouses > 0 ? `${pHouses} Ev` : ''} {pHotels > 0 ? `${pHotels} Otel` : ''}
                          </span>
                        )}
                        {pDebts.length > 0 && (
                          <span className="badge badge-rose" style={{ fontSize: '9px', padding: '0 5px' }}>
                            Borçlu
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ textAlign: 'right', marginRight: '2px' }}>
                      <strong
                        className="num-font"
                        style={{ fontSize: '15px', color: 'var(--emerald-primary)', display: 'block' }}
                      >
                        {formatMoney(p.balance)}
                      </strong>
                    </div>

                    {/* Masa Bankacısı ise: Tek Dokunuşla +200 ₺ Maaş Verme Butonu */}
                    {currentPlayer?.is_banker && (
                      <button
                        type="button"
                        className="btn"
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: 800,
                          minHeight: '28px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: 'var(--emerald-primary)',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                          borderRadius: '8px',
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
                        <Zap size={12} /> +200 ₺
                      </button>
                    )}

                    {/* Başka oyuncu ise: Hızlı Para Gönder Butonu */}
                    {!isCurrent && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: 800,
                          minHeight: '28px',
                          color: 'var(--emerald-primary)',
                          borderColor: 'rgba(16, 185, 129, 0.4)',
                          gap: '3px',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setTransferTargetPlayerId(p.id);
                          setShowTransferModal(true);
                        }}
                        title={`${p.name}'a Para Gönder`}
                      >
                        <Send size={11} /> Gönder
                      </button>
                    )}

                    <ChevronRight size={14} color="var(--text-dim)" />
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
            bottom: '24px',
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
            padding: '10px 20px',
            borderRadius: '999px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
            fontSize: '13px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease-out',
            pointerEvents: 'none',
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default App;
