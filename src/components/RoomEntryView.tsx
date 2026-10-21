import React, { useState } from 'react';
import { UserSession } from '../types';
import { GameService } from '../services/gameService';
import { Building2, Plus, LogIn, RotateCcw, AlertCircle, ArrowRight } from 'lucide-react';

interface RoomEntryViewProps {
  onJoinSuccess: (session: UserSession) => void;
  savedSession: UserSession | null;
}

export const RoomEntryView: React.FC<RoomEntryViewProps> = ({ onJoinSuccess, savedSession }) => {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [playerName, setPlayerName] = useState<string>('');
  const [roomCode, setRoomCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!playerName.trim()) {
      setError('Lütfen oyuncu adınızı girin');
      return;
    }

    setLoading(true);
    try {
      const { session } = await GameService.createRoom(playerName.trim());
      onJoinSuccess(session);
    } catch (err: any) {
      setError(err.message || 'Oda oluşturulurken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!roomCode.trim()) {
      setError('Lütfen oda kodunu girin');
      return;
    }
    if (!playerName.trim()) {
      setError('Lütfen oyuncu adınızı girin');
      return;
    }

    setLoading(true);
    try {
      const session = await GameService.joinRoom(roomCode.trim(), playerName.trim());
      onJoinSuccess(session);
    } catch (err: any) {
      setError(err.message || 'Odaya katılırken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeSavedSession = () => {
    if (savedSession) {
      onJoinSuccess(savedSession);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minHeight: '100dvh',
        padding: '24px 20px',
      }}
    >
      <div style={{ maxWidth: '420px', width: '100%', margin: '0 auto' }}>
        {/* App Logo & Branding */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#03140a',
              margin: '0 auto 14px',
              boxShadow: '0 8px 24px -4px rgba(16, 185, 129, 0.4)',
            }}
          >
            <Building2 size={32} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Monopoly İstanbul</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Mobil Oyun ve Finans Takip Asistanı
          </p>
        </div>

        {/* Önceki Oturuma Dön Kartı */}
        {savedSession && (
          <div
            className="card"
            style={{
              marginBottom: '20px',
              borderColor: 'rgba(16, 185, 129, 0.4)',
              background: 'rgba(16, 185, 129, 0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span className="badge badge-emerald" style={{ marginBottom: '6px' }}>
                  Kayıtlı Oturum
                </span>
                <p style={{ fontSize: '14px', fontWeight: 600 }}>
                  {savedSession.playerName} ({savedSession.roomCode})
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '8px 14px', minHeight: '38px', fontSize: '13px' }}
                onClick={handleResumeSavedSession}
              >
                <RotateCcw size={14} /> Devam Et
              </button>
            </div>
          </div>
        )}

        {/* Hata Bildirimi */}
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
              marginBottom: '16px',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Giriş Kartı */}
        <div className="card">
          {/* Tab Seçimi */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              background: 'rgba(15, 23, 42, 0.7)',
              borderRadius: 'var(--radius-md)',
              padding: '4px',
              marginBottom: '20px',
            }}
          >
            <button
              type="button"
              className="btn"
              style={{
                minHeight: '38px',
                padding: '6px',
                fontSize: '13px',
                background: tab === 'create' ? 'var(--emerald-primary)' : 'transparent',
                color: tab === 'create' ? '#03140a' : 'var(--text-muted)',
              }}
              onClick={() => {
                setTab('create');
                setError(null);
              }}
            >
              <Plus size={16} /> Yeni Oda Aç
            </button>
            <button
              type="button"
              className="btn"
              style={{
                minHeight: '38px',
                padding: '6px',
                fontSize: '13px',
                background: tab === 'join' ? 'var(--emerald-primary)' : 'transparent',
                color: tab === 'join' ? '#03140a' : 'var(--text-muted)',
              }}
              onClick={() => {
                setTab('join');
                setError(null);
              }}
            >
              <LogIn size={16} /> Odaya Katıl
            </button>
          </div>

          {tab === 'create' ? (
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="input-label">Oyuncu Adınız</label>
                <input
                  type="text"
                  placeholder="Örn: Harun, Can, Zeynep..."
                  className="input-field"
                  autoFocus
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                />
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                ✨ Odayı kurduğunuzda otomatik benzersiz oda kodu üretilecek, siz bankacı yetkisine sahip olacaksınız ve
                hesabınıza <strong>1.500 ₺</strong> başlangıç parası tanımlanacaktır.
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Oda Kuruluyor...' : 'Odayı Başlat ve Katıl'}
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="input-label">Oda Kodu</label>
                <input
                  type="text"
                  placeholder="Örn: IST-482"
                  className="input-field num-font"
                  style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  autoFocus
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                />
              </div>

              <div>
                <label className="input-label">Oyuncu Adınız</label>
                <input
                  type="text"
                  placeholder="Örn: Harun"
                  className="input-field"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                />
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                ✨ Odaya katıldığınızda hesabınıza otomatik olarak <strong>1.500 ₺</strong> başlangıç sermayesi aktarılır.
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Bağlanılıyor...' : 'Oyuna Katıl'}
                <ArrowRight size={16} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
