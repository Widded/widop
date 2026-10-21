import React, { useState } from 'react';
import { Debt, Player, Property, Room, Transaction } from '../types';
import { formatDateTime, formatMoney } from '../utils/formatters';
import {
  ShieldAlert,
  ArrowLeft,
  LayoutDashboard,
  Wallet,
  Building,
  HandCoins,
  History,
  Users,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';

interface BankerPanelProps {
  room: Room;
  players: Player[];
  properties: Property[];
  transactions: Transaction[];
  debts: Debt[];
  currentBanker: Player;
  onBack: () => void;
  onAdjustBalance: (playerId: string, diff: number, reason: string) => Promise<void>;
  onOverrideProperty: (
    propertyId: string,
    newOwnerId: string | null,
    houseCount: number,
    hotelCount: number,
    isMortgaged: boolean,
    reason: string
  ) => Promise<void>;
  onRevertTransaction: (transactionId: string, reason: string) => Promise<void>;
}

export const BankerPanel: React.FC<BankerPanelProps> = ({
  room,
  players,
  properties,
  transactions,
  debts,
  currentBanker,
  onBack,
  onAdjustBalance,
  onOverrideProperty,
  onRevertTransaction,
}) => {
  const [activeSection, setActiveSection] = useState<
    'overview' | 'money' | 'properties' | 'debts' | 'audit' | 'players'
  >('overview');

  // Balance adjustment state
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(players[0]?.id || '');
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');
  const [adjustReason, setAdjustReason] = useState<string>('');

  // Property override state
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(properties[0]?.id || '');
  const [newOwnerId, setNewOwnerId] = useState<string>('bank');
  const [overrideHouses, setOverrideHouses] = useState<number>(0);
  const [overrideHotels, setOverrideHotels] = useState<number>(0);
  const [overrideMortgage, setOverrideMortgage] = useState<boolean>(false);
  const [propReason, setPropReason] = useState<string>('');

  // Revert transaction state
  const [revertingTxId, setRevertingTxId] = useState<string | null>(null);
  const [revertReason, setRevertReason] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Overview stats
  const totalCirculation = players.reduce((sum, p) => sum + p.balance, 0);
  const totalHouses = properties.reduce((sum, p) => sum + p.house_count, 0);
  const totalHotels = properties.reduce((sum, p) => sum + p.hotel_count, 0);
  const mortgagedCount = properties.filter((p) => p.is_mortgaged).length;
  const openDebtsCount = debts.filter((d) => d.status === 'open').length;

  const handleBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const num = parseInt(adjustAmount, 10);
    if (!num || num <= 0) {
      setMessage({ text: 'Geçerli bir tutar girin', type: 'error' });
      return;
    }
    if (!adjustReason.trim()) {
      setMessage({ text: 'Yetkili düzeltme için açıklama zorunludur', type: 'error' });
      return;
    }

    const diff = adjustType === 'add' ? num : -num;
    setLoading(true);
    try {
      await onAdjustBalance(selectedPlayerId, diff, adjustReason.trim());
      setMessage({ text: 'Bakiye düzeltmesi başarıyla kaydedildi', type: 'success' });
      setAdjustAmount('');
      setAdjustReason('');
    } catch (err: any) {
      setMessage({ text: err.message || 'Hata oluştu', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePropertySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!propReason.trim()) {
      setMessage({ text: 'Mülk müdahalesi için gerekçe zorunludur', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      await onOverrideProperty(
        selectedPropertyId,
        newOwnerId === 'bank' ? null : newOwnerId,
        overrideHouses,
        overrideHotels,
        overrideMortgage,
        propReason.trim()
      );
      setMessage({ text: 'Mülk durumu güncellendi', type: 'success' });
      setPropReason('');
    } catch (err: any) {
      setMessage({ text: err.message || 'Mülk güncellenemedi', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRevertSubmit = async (txId: string) => {
    if (!revertReason.trim()) {
      setMessage({ text: 'Ters işlem için açıklama zorunludur', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      await onRevertTransaction(txId, revertReason.trim());
      setMessage({ text: 'Hatalı işlem için ters işlem oluşturuldu', type: 'success' });
      setRevertingTxId(null);
      setRevertReason('');
    } catch (err: any) {
      setMessage({ text: err.message || 'Ters işlem oluşturulamadı', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      {/* Üst Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          className="btn btn-secondary"
          style={{ padding: '8px 12px', minHeight: '38px', fontSize: '13px' }}
          onClick={onBack}
        >
          <ArrowLeft size={16} />
          Oyuncu Paneline Dön
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-emerald">
            <ShieldAlert size={12} /> Bankacı Paneli
          </span>
        </div>
      </div>

      {/* Mesaj Bildirimi */}
      {message && (
        <div
          style={{
            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
            border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: message.type === 'success' ? 'var(--emerald-primary)' : 'var(--rose-primary)',
            fontSize: '13px',
          }}
        >
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Alt Sekme Navigasyonu */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
        <button
          type="button"
          className={`btn ${activeSection === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '6px 12px', fontSize: '12px', minHeight: '34px', whiteSpace: 'nowrap' }}
          onClick={() => setActiveSection('overview')}
        >
          <LayoutDashboard size={14} /> Genel Bakış
        </button>
        <button
          type="button"
          className={`btn ${activeSection === 'money' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '6px 12px', fontSize: '12px', minHeight: '34px', whiteSpace: 'nowrap' }}
          onClick={() => setActiveSection('money')}
        >
          <Wallet size={14} /> Para Yönetimi
        </button>
        <button
          type="button"
          className={`btn ${activeSection === 'properties' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '6px 12px', fontSize: '12px', minHeight: '34px', whiteSpace: 'nowrap' }}
          onClick={() => setActiveSection('properties')}
        >
          <Building size={14} /> Mülk Yönetimi
        </button>
        <button
          type="button"
          className={`btn ${activeSection === 'debts' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '6px 12px', fontSize: '12px', minHeight: '34px', whiteSpace: 'nowrap' }}
          onClick={() => setActiveSection('debts')}
        >
          <HandCoins size={14} /> Borçlar ({openDebtsCount})
        </button>
        <button
          type="button"
          className={`btn ${activeSection === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '6px 12px', fontSize: '12px', minHeight: '34px', whiteSpace: 'nowrap' }}
          onClick={() => setActiveSection('audit')}
        >
          <History size={14} /> İşlem Düzeltme
        </button>
        <button
          type="button"
          className={`btn ${activeSection === 'players' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '6px 12px', fontSize: '12px', minHeight: '34px', whiteSpace: 'nowrap' }}
          onClick={() => setActiveSection('players')}
        >
          <Users size={14} /> Oyuncular
        </button>
      </div>

      {/* 1. BÖLÜM: GENEL BAKIŞ */}
      {activeSection === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* İstatistik Kartları */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <div className="card" style={{ padding: '14px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Dolaşımdaki Para</span>
              <h3 className="num-font" style={{ color: 'var(--emerald-primary)', marginTop: '4px' }}>
                {formatMoney(totalCirculation)}
              </h3>
            </div>
            <div className="card" style={{ padding: '14px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Toplam Oyuncu</span>
              <h3 style={{ marginTop: '4px' }}>{players.length} Oyuncu</h3>
            </div>
            <div className="card" style={{ padding: '14px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>İnşa Edilen Binalar</span>
              <h3 style={{ marginTop: '4px', fontSize: '16px' }}>
                {totalHouses} Ev / {totalHotels} Otel
              </h3>
            </div>
            <div className="card" style={{ padding: '14px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>İpotekli Mülk Sayısı</span>
              <h3 style={{ marginTop: '4px', color: 'var(--amber-primary)', fontSize: '16px' }}>
                {mortgagedCount} Mülk
              </h3>
            </div>
          </div>

          {/* Oyuncu Durum Tablosu */}
          <div className="card">
            <h4 style={{ fontSize: '14px', marginBottom: '12px' }}>Oyuncu Bakiyeleri ve Varlıkları</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {players.map((p) => {
                const pProps = properties.filter((pr) => pr.owner_id === p.id);
                return (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      background: 'rgba(15, 23, 42, 0.4)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '14px' }}>{p.name}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginLeft: '8px' }}>
                        {pProps.length} mülk
                      </span>
                    </div>
                    <strong className="num-font" style={{ color: 'var(--emerald-primary)' }}>
                      {formatMoney(p.balance)}
                    </strong>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. BÖLÜM: PARA YÖNETİMİ & AÇIKLAMALI DÜZELTME */}
      {activeSection === 'money' && (
        <form onSubmit={handleBalanceSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h4 style={{ fontSize: '15px' }}>Yetkili Para / Bakiye Düzeltmesi</h4>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Fiziksel oyundaki hatalı para alışverişlerini telafi etmek için açıklamalı düzeltme kaydı oluşturur.
          </p>

          <div>
            <label className="input-label">Düzeltme Yapılacak Oyuncu</label>
            <select
              className="input-field select-field"
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
            >
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — Güncel Bakiye: {formatMoney(p.balance)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="input-label">İşlem Türü</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                className={`btn ${adjustType === 'add' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setAdjustType('add')}
              >
                + Para Ekle
              </button>
              <button
                type="button"
                className={`btn ${adjustType === 'deduct' ? 'btn-danger' : 'btn-secondary'}`}
                onClick={() => setAdjustType('deduct')}
              >
                - Para Düş
              </button>
            </div>
          </div>

          <div>
            <label className="input-label">Tutar (₺)</label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="0"
              className="input-field num-font"
              style={{ fontSize: '18px', fontWeight: 700 }}
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
            />
          </div>

          <div>
            <label className="input-label">Düzeltme Gerekçesi (Zorunlu)</label>
            <input
              type="text"
              placeholder="Örn: Yanlış kira tahsilatı düzeltildi, eksik maaş verildi..."
              className="input-field"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Kaydediliyor...' : 'Yetkili Düzeltmeyi Uygula'}
          </button>
        </form>
      )}

      {/* 3. BÖLÜM: MÜLK YÖNETİMİ & MÜDAHALE */}
      {activeSection === 'properties' && (
        <form onSubmit={handlePropertySubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h4 style={{ fontSize: '15px' }}>Yetkili Mülk Müdahalesi</h4>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Mülk sahipliğini, ev/otel adetlerini veya ipotek durumunu doğrudan düzeltin.
          </p>

          <div>
            <label className="input-label">Mülk Seçin</label>
            <select
              className="input-field select-field"
              value={selectedPropertyId}
              onChange={(e) => {
                const pid = e.target.value;
                setSelectedPropertyId(pid);
                const p = properties.find((pr) => pr.id === pid);
                if (p) {
                  setNewOwnerId(p.owner_id || 'bank');
                  setOverrideHouses(p.house_count);
                  setOverrideHotels(p.hotel_count);
                  setOverrideMortgage(p.is_mortgaged);
                }
              }}
            >
              {properties.map((p) => {
                const owner = players.find((pl) => pl.id === p.owner_id);
                return (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.group_name}) — Sahibi: {owner?.name || 'Banka'}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="input-label">Yeni Sahip</label>
            <select
              className="input-field select-field"
              value={newOwnerId}
              onChange={(e) => setNewOwnerId(e.target.value)}
            >
              <option value="bank">Banka (Sahipsiz / Satılık)</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="input-label">Ev Sayısı (0-4)</label>
              <input
                type="number"
                min="0"
                max="4"
                className="input-field num-font"
                value={overrideHouses}
                onChange={(e) => setOverrideHouses(parseInt(e.target.value, 10) || 0)}
              />
            </div>
            <div>
              <label className="input-label">Otel Sayısı (0-1)</label>
              <input
                type="number"
                min="0"
                max="1"
                className="input-field num-font"
                value={overrideHotels}
                onChange={(e) => setOverrideHotels(parseInt(e.target.value, 10) || 0)}
              />
            </div>
          </div>

          <div>
            <label className="input-label">İpotek Durumu</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className={`btn ${!overrideMortgage ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setOverrideMortgage(false)}
              >
                Normal (Temiz)
              </button>
              <button
                type="button"
                className={`btn ${overrideMortgage ? 'btn-danger' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setOverrideMortgage(true)}
              >
                İpotekli
              </button>
            </div>
          </div>

          <div>
            <label className="input-label">Müdahale Açıklaması (Zorunlu)</label>
            <input
              type="text"
              placeholder="Örn: Fiziksel tahtada satın alınmıştı, ev satışı yapıldı..."
              className="input-field"
              value={propReason}
              onChange={(e) => setPropReason(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Güncelleniyor...' : 'Mülkü Yetkili Olarak Güncelle'}
          </button>
        </form>
      )}

      {/* 4. BÖLÜM: BORÇ YÖNETİMİ & DENETİMİ */}
      {activeSection === 'debts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="card">
            <h4 style={{ fontSize: '15px' }}>Açık Borçlar Denetim Listesi</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Bankacı borçları tarafsız olarak denetler; borcun kapatılması oyuncuların karşılıklı anlaşmasıyla
              gerçekleşir.
            </p>
          </div>

          {debts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
              Kayıtlı borç bulunmuyor.
            </div>
          ) : (
            debts.map((d) => {
              const creditor = players.find((p) => p.id === d.creditor_id);
              const debtor = players.find((p) => p.id === d.debtor_id);
              return (
                <div key={d.id} className="card" style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 700 }}>{debtor?.name}</span>
                      <span style={{ color: 'var(--text-dim)', margin: '0 6px' }}>➔</span>
                      <span>{creditor?.name}</span>
                    </div>
                    <span className={`badge ${d.status === 'open' ? 'badge-amber' : 'badge-emerald'}`}>
                      {d.status === 'open' ? formatMoney(d.current_amount) : 'KAPATILDI'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '6px' }}>
                    Sebep: {d.reason} | Başlangıç: {formatMoney(d.original_amount)} | Tarih:{' '}
                    {formatDateTime(d.created_at)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 5. BÖLÜM: İŞLEM DÜZELTME & TERS İŞLEM OLUŞTURMA */}
      {activeSection === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="card">
            <h4 style={{ fontSize: '15px' }}>İşlem Geçmişi & Hata Düzeltme</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Yanlış yapılan para transferleri geçmişten silinmez; bankacı yetkisiyle ters işlem (iptal) oluşturulur.
            </p>
          </div>

          {transactions.map((tx) => (
            <div key={tx.id} className="card" style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span className="badge badge-slate" style={{ fontSize: '10px' }}>
                    {tx.type} • {formatDateTime(tx.created_at)}
                  </span>
                  <p style={{ fontWeight: 600, fontSize: '13px', marginTop: '4px' }}>{tx.description}</p>
                </div>
                {tx.amount > 0 && <span className="num-font" style={{ fontWeight: 700 }}>{formatMoney(tx.amount)}</span>}
              </div>

              {revertingTxId === tx.id ? (
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                  <label className="input-label">Düzeltme / Ters İşlem Gerekçesi</label>
                  <input
                    type="text"
                    placeholder="Örn: Yanlış oyuncuya gönderildi..."
                    className="input-field"
                    style={{ marginBottom: '8px' }}
                    value={revertReason}
                    onChange={(e) => setRevertReason(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '6px', fontSize: '12px' }}
                      onClick={() => setRevertingTxId(null)}
                    >
                      Vazgeç
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      style={{ flex: 2, padding: '6px', fontSize: '12px' }}
                      onClick={() => handleRevertSubmit(tx.id)}
                      disabled={loading}
                    >
                      <RotateCcw size={14} /> Ters İşlemi Onayla
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '11px', minHeight: '30px' }}
                    onClick={() => {
                      setRevertingTxId(tx.id);
                      setRevertReason('');
                    }}
                  >
                    <RotateCcw size={12} /> Hatalı İşlemi İptal Et (Ters İşlem)
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 6. BÖLÜM: OYUNCU YÖNETİMİ */}
      {activeSection === 'players' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="card">
            <h4 style={{ fontSize: '15px' }}>Odadaki Oyuncular ({players.length})</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Oda Kodu: <strong style={{ color: 'var(--emerald-primary)' }}>{room.code}</strong>
            </p>
          </div>

          {players.map((p) => (
            <div
              key={p.id}
              className="card"
              style={{ padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div>
                <strong style={{ fontSize: '15px' }}>{p.name}</strong>
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  {p.is_owner && <span className="badge badge-emerald">Oda Kurucusu</span>}
                  {p.is_banker && <span className="badge badge-slate">Bankacı</span>}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <p className="num-font" style={{ fontWeight: 700, color: 'var(--emerald-primary)' }}>
                  {formatMoney(p.balance)}
                </p>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  Katılım: {formatDateTime(p.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
