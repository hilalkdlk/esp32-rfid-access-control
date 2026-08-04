import React, { useState } from 'react';
import { Zap, Wifi, WifiOff, RefreshCw, HardDrive, CheckCircle2, XCircle, Volume2, ShieldCheck, ShieldAlert, Filter, Search, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';
import { GATES } from '../data/initialData';

export default function AccessLogsScreen({ logs, setLogs, cards, esp32Status, toggleESP32Online, syncPendingLogs }) {
  const [selectedCardId, setSelectedCardId] = useState(cards[0]?.id || '');
  const [selectedGate, setSelectedGate] = useState(GATES[0]);
  const [customUid, setCustomUid] = useState('');
  const [useCustomCard, setUseCustomCard] = useState(false);
  const [simFeedback, setSimFeedback] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [gateFilter, setGateFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modeFilter, setModeFilter] = useState('ALL');

  // Trigger Card Tap Simulation
  const handleSimulateTap = (direction) => {
    let targetCard = null;
    let cardUid = '';
    let holderName = '';

    if (useCustomCard) {
      cardUid = customUid.trim().toUpperCase() || 'FF FF FF FF';
      holderName = 'Tanımlanmamış Yabancı Kart';
      targetCard = cards.find(c => c.uid.replace(/\s+/g, '') === cardUid.replace(/\s+/g, ''));
      if (targetCard) {
        holderName = targetCard.holderName;
      }
    } else {
      targetCard = cards.find(c => c.id === selectedCardId);
      if (targetCard) {
        cardUid = targetCard.uid;
        holderName = targetCard.holderName;
      } else {
        cardUid = 'UNKNOWN';
        holderName = 'Bilinmeyen Kart';
      }
    }

    const isAuthorized = targetCard && targetCard.status === 'Aktif';
    const now = new Date();
    const timestamp = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + ' ' +
      String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0') + ':' +
      String(now.getSeconds()).padStart(2, '0');

    const newLog = {
      id: `log-${Date.now()}`,
      timestamp,
      uid: cardUid,
      holderName,
      gate: selectedGate,
      direction,
      status: isAuthorized ? 'Yetkili (İzin Verildi)' : 'Yetkisiz (Reddedildi)',
      mode: esp32Status.isOnline ? 'Online (API)' : 'Offline (LittleFS)',
      relayTriggered: isAuthorized,
      buzzerBeeps: isAuthorized ? 1 : 3,
      syncedToFirestore: esp32Status.isOnline
    };

    // Add log to top
    setLogs(prev => [newLog, ...prev]);

    // Show simulation visual & audio feedback
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
    }, 4500);
  };

  // Filtered Logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.holderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.uid.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGate = gateFilter === 'ALL' || log.gate === gateFilter;
    const matchesStatus = statusFilter === 'ALL' || 
                          (statusFilter === 'Yetkili' && log.relayTriggered) ||
                          (statusFilter === 'Yetkisiz' && !log.relayTriggered);
    const matchesMode = modeFilter === 'ALL' ||
                        (modeFilter === 'Online' && log.mode.includes('Online')) ||
                        (modeFilter === 'Offline' && log.mode.includes('Offline'));
    return matchesSearch && matchesGate && matchesStatus && matchesMode;
  });

  const pendingCount = logs.filter(l => !l.syncedToFirestore).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ESP32 Turnstile Simulator Interactive Banner */}
      <div className="glass-panel" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.9) 0%, rgba(30, 27, 75, 0.8) 100%)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)', borderRadius: '12px', color: '#white', display: 'flex' }}>
              <Zap size={22} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>ESP32 Turnike & Geçiş Kontrol Simülatörü</h2>
              <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Donanım okutması yapmadan RFID kart geçişlerini anlık olarak simüle edin.</p>
            </div>
          </div>

          {/* Sync Pending Logs Button */}
          {pendingCount > 0 && (
            <button 
              onClick={syncPendingLogs}
              className="btn btn-primary"
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)' }}
            >
              <HardDrive size={16} /> {pendingCount} Bekleyen Logu Firestore'a Senkronize Et
            </button>
          )}
        </div>

        {/* Simulator Controls Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'end' }}>
          <div>
            <label className="form-label">Okutulacak RFID Kartı</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <button 
                type="button"
                onClick={() => setUseCustomCard(false)}
                className={`btn btn-sm ${!useCustomCard ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.75rem', flex: 1 }}
              >
                Sistemdeki Kartlar
              </button>
              <button 
                type="button"
                onClick={() => setUseCustomCard(true)}
                className={`btn btn-sm ${useCustomCard ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.75rem', flex: 1 }}
              >
                Yabancı / Tanımsız UID
              </button>
            </div>

            {!useCustomCard ? (
              <select
                value={selectedCardId}
                onChange={(e) => setSelectedCardId(e.target.value)}
                className="form-select"
              >
                {cards.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.holderName} ({c.uid}) - [{c.status}]
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="Örn: 99 88 77 66"
                value={customUid}
                onChange={(e) => setCustomUid(e.target.value)}
                className="form-input form-input-mono"
              />
            )}
          </div>

          <div>
            <label className="form-label">Giriş / Çıkış Kapısı (Turnike)</label>
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

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => handleSimulateTap('Giriş')}
              className="btn btn-success"
              style={{ flex: 1, padding: '12px' }}
            >
              <ArrowDownLeft size={18} /> GİRİŞ YAP
            </button>
            <button
              onClick={() => handleSimulateTap('Çıkış')}
              className="btn btn-primary"
              style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}
            >
              <ArrowUpRight size={18} /> ÇIKIŞ YAP
            </button>
          </div>
        </div>

        {/* Live Simulation Feedback Popup Bar */}
        {simFeedback && (
          <div style={{
            marginTop: '20px',
            padding: '16px 20px',
            borderRadius: '12px',
            background: simFeedback.isAuthorized ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${simFeedback.isAuthorized ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            animation: 'pulseGlow 1s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {simFeedback.isAuthorized ? (
                <ShieldCheck size={28} color="#34d399" />
              ) : (
                <ShieldAlert size={28} color="#f87171" />
              )}
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: simFeedback.isAuthorized ? '#34d399' : '#f87171' }}>
                  {simFeedback.isAuthorized ? '🔓 KAPIDA ERİŞİM İZNİ VERİLDİ (RÖLE TETİKLENDİ)' : '🔒 YETKİSİZ ERİŞİM! KAPIDA KİLİTLİ KALDI'}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '2px' }}>
                  <strong>{simFeedback.holderName}</strong> ({simFeedback.cardUid}) • {simFeedback.gate} • Mod: {simFeedback.isOnline ? 'Online REST API' : 'LittleFS Offline (pendingLogs.json)'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0, 0, 0, 0.3)', padding: '8px 14px', borderRadius: '8px', fontSize: '0.8rem' }}>
              <Volume2 size={16} color={simFeedback.isAuthorized ? '#34d399' : '#f87171'} />
              <span>Buzzer: <strong>{simFeedback.buzzerBeeps} Kısa Bip Ses Uyarısı</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Access Logs Table Section */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Geçiş Kontrol Kayıtları (Loglar)</h3>
            <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Firestore & LittleFS üzerinden senkronize edilen zaman sıralı tüm geçişler.</p>
          </div>

          {/* Search & Filter controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="İsim veya UID Ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '36px', padding: '8px 12px 8px 36px', fontSize: '0.85rem' }}
              />
            </div>

            <select
              value={gateFilter}
              onChange={(e) => setGateFilter(e.target.value)}
              className="form-select"
              style={{ width: 'auto', padding: '8px 12px', fontSize: '0.85rem' }}
            >
              <option value="ALL">Tüm Kapılar</option>
              {GATES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-select"
              style={{ width: 'auto', padding: '8px 12px', fontSize: '0.85rem' }}
            >
              <option value="ALL">Tüm Sonuçlar</option>
              <option value="Yetkili">İzin Verilenler</option>
              <option value="Yetkisiz">Reddedilenler</option>
            </select>

            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="form-select"
              style={{ width: 'auto', padding: '8px 12px', fontSize: '0.85rem' }}
            >
              <option value="ALL">Tüm Modlar</option>
              <option value="Online">Online API</option>
              <option value="Offline">Offline LittleFS</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Tarih & Saat</th>
                <th>Kart Sahibi</th>
                <th>RFID UID</th>
                <th>Kapı / Turnike</th>
                <th>Yön</th>
                <th>Röle & Buzzer Durumu</th>
                <th>Çalışma Modu</th>
                <th>Firestore Senkron</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length > 0 ? (
                filteredLogs.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.82rem', color: '#9ca3af', fontFamily: 'var(--font-mono)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={13} /> {log.timestamp}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{log.holderName}</td>
                    <td>
                      <span className="form-input-mono" style={{ fontSize: '0.8rem', padding: '2px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }}>
                        {log.uid}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>{log.gate}</td>
                    <td>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: log.direction === 'Giriş' ? '#34d399' : '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {log.direction === 'Giriş' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                        {log.direction}
                      </span>
                    </td>
                    <td>
                      <span className={log.relayTriggered ? 'badge badge-active' : 'badge badge-blocked'}>
                        {log.relayTriggered ? '🔓 Röle Açık (1 Bip)' : '🔒 Röle Kapalı (3 Bip)'}
                      </span>
                    </td>
                    <td>
                      <span className={log.mode.includes('Online') ? 'badge badge-online' : 'badge badge-offline'}>
                        {log.mode}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.78rem', color: log.syncedToFirestore ? '#34d399' : '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {log.syncedToFirestore ? (
                          <> <CheckCircle2 size={13} /> Firestore ok </>
                        ) : (
                          <> <HardDrive size={13} /> pendingLogs.json </>
                        )}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#9ca3af' }}>
                    Henüz kayıtlı bir geçiş logu bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
