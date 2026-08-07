import React, { useState } from 'react';
import { Zap, HardDrive, ShieldCheck, ShieldAlert, Volume2, Search, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { GATES } from '../data/initialData';

const API_BASE = 'http://localhost:5000/api';

export default function AccessLogsScreen({ logs, setLogs, cards, esp32Status, syncPendingLogs }) {
  const [selectedCardId, setSelectedCardId] = useState(cards[0]?.id || '');
  const [selectedGate, setSelectedGate] = useState(GATES[0]);
  const [simFeedback, setSimFeedback] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSimulateTap = async (direction) => {
    const targetCard = cards.find(c => c.id === selectedCardId || c.uid === selectedCardId);
    const cardUid = targetCard ? targetCard.uid : 'FF FF FF FF';
    const holderName = targetCard ? targetCard.holderName : 'Tanımsız Kart';
    const isAuthorized = targetCard && targetCard.status === 'Aktif';

    const now = new Date();
    const timestamp = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString('tr-TR')}`;

    if (esp32Status.isOnline) {
      // --- ONLINE MOD: CANLI REST API & FIRESTORE KANALI ---
      try {
        const res = await fetch(`${API_BASE}/logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: cardUid,
            gate: selectedGate,
            direction
          })
        });
        const json = await res.json();

        if (json.success && json.data) {
          const newOnlineLog = {
            id: json.data.id || `log-${Date.now()}`,
            timestamp: json.data.timestamp || timestamp,
            uid: cardUid,
            holderName: json.data.holderName || holderName,
            gate: selectedGate,
            direction,
            status: json.authorized ? 'Yetkili' : 'Yetkisiz',
            mode: 'Online (API & Firestore)',
            relayTriggered: json.relayTriggered,
            buzzerBeeps: json.buzzerBeeps,
            syncedToFirestore: true
          };
          setLogs(prev => [newOnlineLog, ...prev]);
        }
      } catch (err) {
        console.log('API Erişilemiyor, Çevrimdışı moda düşüldü.');
      }
    } else {
      // --- OFFLINE MOD: İNTERNET YOK, YALNIZCA LITTLEFS PENDINGLOGS.JSON DOSYASINA YAZ ---
      const offlineLog = {
        id: `offline-log-${Date.now()}`,
        timestamp,
        uid: cardUid,
        holderName,
        gate: selectedGate,
        direction,
        status: isAuthorized ? 'Yetkili' : 'Yetkisiz',
        mode: 'Offline (LittleFS)',
        relayTriggered: isAuthorized,
        buzzerBeeps: isAuthorized ? 1 : 3,
        syncedToFirestore: false // Firestore'a YAZILMADI, LittleFS belleğinde bekliyor!
      };
      setLogs(prev => [offlineLog, ...prev]);
    }

    setSimFeedback({
      isAuthorized,
      holderName,
      cardUid,
      direction,
      gate: selectedGate,
      isOnline: esp32Status.isOnline,
      buzzerBeeps: isAuthorized ? 1 : 3
    });

    setTimeout(() => {
      setSimFeedback(null);
    }, 4000);
  };

  const filteredLogs = logs.filter(log =>
    (log.holderName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.uid || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingCount = logs.filter(l => !l.syncedToFirestore).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Simulator Box */}
      <div className="glass-panel" style={{ padding: '20px', background: '#1e293b', border: '1px solid #334155' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)', color: '#ffffff', borderRadius: '8px', display: 'flex' }}>
              <Zap size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>Turnike Kart Okutma Simülatörü</h2>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                {esp32Status.isOnline 
                  ? '🌐 Online Mod: İletilen kartlar anında canlı Firestore veritabanına işlenir.'
                  : '🔌 Offline Mod: İnternet yok. İletilen kartlar LittleFS pendingLogs.json belgesine kaydedilir.'
                }
              </p>
            </div>
          </div>

          {pendingCount > 0 && (
            <button 
              onClick={syncPendingLogs}
              className="btn btn-primary"
              style={{ background: '#d97706', fontSize: '0.8rem' }}
            >
              <HardDrive size={15} /> {pendingCount} Bekleyen Çevrimdışı Logu Firestore'a Aktar
            </button>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', alignItems: 'end' }}>
          <div>
            <label className="form-label">Okutulacak Kart</label>
            <select
              value={selectedCardId}
              onChange={(e) => setSelectedCardId(e.target.value)}
              className="form-select"
            >
              {cards.length === 0 ? (
                <option value="">(Henüz Kart Yok - Önce Kart Ekleyin)</option>
              ) : (
                cards.map(c => (
                  <option key={c.id || c.uid} value={c.id || c.uid}>
                    {c.holderName} ({c.uid}) - [{c.status}]
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="form-label">Giriş/Çıkış Kapısı</label>
            <select
              value={selectedGate}
              onChange={(e) => setSelectedGate(e.target.value)}
              className="form-select"
            >
              {GATES.map(gate => (
                <option key={gate} value={gate}>{gate}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => handleSimulateTap('Giriş')} className="btn btn-success" style={{ flex: 1 }}>
              <ArrowDownLeft size={16} /> GİRİŞ YAP
            </button>
            <button onClick={() => handleSimulateTap('Çıkış')} className="btn btn-primary" style={{ flex: 1 }}>
              <ArrowUpRight size={16} /> ÇIKIŞ YAP
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {simFeedback && (
          <div style={{
            marginTop: '14px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: simFeedback.isAuthorized ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            border: `1px solid ${simFeedback.isAuthorized ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: simFeedback.isAuthorized ? '#34d399' : '#f87171'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {simFeedback.isAuthorized ? <ShieldCheck size={22} /> : <ShieldAlert size={22} />}
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                  {simFeedback.isAuthorized ? '🔓 KAPIDA ERİŞİM İZNİ VERİLDİ (RÖLE AÇIK)' : '🔒 YETKİSİZ ERİŞİM! (RÖLE KAPALI)'}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                  {simFeedback.holderName} ({simFeedback.cardUid}) • {simFeedback.gate} • {simFeedback.isOnline ? '🌐 Firestore\'a Yazıldı' : '📁 LittleFS pendingLogs.json Belleğine Yazıldı'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 600 }}>
              <Volume2 size={16} /> Buzzer: {simFeedback.buzzerBeeps} Kısa Bip
            </div>
          </div>
        )}
      </div>

      {/* Access Logs Table */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>Geçiş Kayıtları Log Listesi</h3>
          <div style={{ position: 'relative', width: '200px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="İsim veya UID Ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '32px', padding: '6px 10px 6px 32px', fontSize: '0.82rem' }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Tarih & Saat</th>
                <th>Kart Sahibi</th>
                <th>RFID UID</th>
                <th>Kapı</th>
                <th>Yön</th>
                <th>Röle & Buzzer</th>
                <th>Mod</th>
                <th>Firestore Durumu</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                    Henüz geçiş kaydı bulunmuyor. Turnikede kart okutun veya yukarıdan Giriş/Çıkış yapın.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.78rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                      {log.timestamp}
                    </td>
                    <td style={{ fontWeight: 600, color: '#f8fafc' }}>{log.holderName}</td>
                    <td>
                      <span className="form-input-mono" style={{ fontSize: '0.78rem', padding: '2px 6px', background: '#0f172a', borderRadius: '4px', color: '#818cf8' }}>
                        {log.uid}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>{log.gate}</td>
                    <td style={{ fontSize: '0.78rem', fontWeight: 700, color: log.direction === 'Giriş' ? '#34d399' : '#60a5fa' }}>
                      {log.direction}
                    </td>
                    <td>
                      <span className={log.relayTriggered ? 'badge badge-active' : 'badge badge-blocked'}>
                        {log.relayTriggered ? '🔓 Açık (1 Bip)' : '🔒 Kapalı (3 Bip)'}
                      </span>
                    </td>
                    <td>
                      <span className={log.mode && log.mode.includes('Online') ? 'badge badge-online' : 'badge badge-offline'}>
                        {log.mode || 'Online (API)'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.78rem', fontWeight: 600, color: log.syncedToFirestore ? '#34d399' : '#fbbf24' }}>
                      {log.syncedToFirestore ? '✅ Firestore\'a İşlendi' : '⚠️ pendingLogs.json (Bekliyor)'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
