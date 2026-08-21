import React, { useState, useEffect } from 'react';
import { Zap, HardDrive, ShieldCheck, ShieldAlert, Volume2, Search, DoorClosed, FileSpreadsheet, FileText, Download, CreditCard, Calendar, Filter, RotateCcw } from 'lucide-react';
import { GATES } from '../data/initialData';
import { exportToExcel, exportToCSV } from '../utils/exportUtils';

const API_BASE = 'http://localhost:5000/api';

// Format timestamp to Turkey Local Time (YYYY-MM-DD HH:mm:ss)
const formatTurkeyTimestamp = (ts) => {
  if (!ts) {
    const now = new Date();
    return now.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
  }

  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) {
      return ts; // Already string formatted
    }
    return d.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
  } catch (err) {
    return ts;
  }
};

export default function AccessLogsScreen({ logs = [], setLogs, cards = [], gates = [], esp32Status = {}, syncPendingLogs, selectedCardForSim }) {
  const safeCards = Array.isArray(cards) ? cards : [];
  const safeLogs = Array.isArray(logs) ? logs : [];
  const safeGates = Array.isArray(gates) && gates.length > 0 ? gates.map(g => g.name || g) : ["Ana Giriş Turnikesi", "AR-GE Laboratuvar Kapısı"];
  const [selectedCardId, setSelectedCardId] = useState(selectedCardForSim || safeCards[0]?.id || safeCards[0]?.uid || '');
  const [selectedGate, setSelectedGate] = useState(safeGates[0]);
  const [simFeedback, setSimFeedback] = useState(null);
  
  // Search & Date Range Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'AUTHORIZED' | 'UNAUTHORIZED'

  // Automatically pre-select the card and its permitted gate when clicked from List Screen or Add Screen
  useEffect(() => {
    if (selectedCardForSim) {
      setSelectedCardId(selectedCardForSim);
      const card = cards.find(c => c.id === selectedCardForSim || c.uid === selectedCardForSim);
      if (card) {
        const allowed = card.allowedGates || card.accessLevel;
        if (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes("Tüm Kapılar / Yönetici")) {
          setSelectedGate(allowed[0]);
        }
      }
    } else if (cards.length > 0 && !selectedCardId) {
      setSelectedCardId(cards[0].id || cards[0].uid);
    }
  }, [selectedCardForSim, cards]);

  // When card dropdown changes, update selected card and auto-suggest gate
  const handleCardChange = (cardId) => {
    setSelectedCardId(cardId);
    const card = cards.find(c => c.id === cardId || c.uid === cardId);
    if (card) {
      const allowed = card.allowedGates || card.accessLevel;
      if (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes("Tüm Kapılar / Yönetici")) {
        setSelectedGate(allowed[0]);
      }
    }
  };

  const handleSimulateTap = async () => {
    const targetCard = cards.find(c => c.id === selectedCardId || c.uid === selectedCardId);
    const cardUid = targetCard ? targetCard.uid : (selectedCardId || 'FF FF FF FF');
    const holderName = targetCard ? targetCard.holderName : 'Tanımlanmamış Yabancı Kullanıcı';
    const activeGate = selectedGate || GATES[0];
    const direction = 'Giriş';
    
    // 1. Kart Durumu Aktif mi?
    const isActive = targetCard && targetCard.status === 'Aktif';

    // 2. Kartın Seçili Kapıya Yetkisi Var mı? (Strict Gate Control)
    let hasGatePermission = false;
    if (isActive) {
      const cardAccess = targetCard.allowedGates || targetCard.accessLevel;
      if (
        cardAccess === "Tüm Kapılar / Yönetici" ||
        (Array.isArray(cardAccess) && (cardAccess.includes("Tüm Kapılar / Yönetici") || cardAccess.includes(activeGate))) ||
        (typeof cardAccess === 'string' && (cardAccess.includes("Tüm Kapılar") || cardAccess.includes(activeGate)))
      ) {
        hasGatePermission = true;
      }
    }

    const isAuthorized = isActive && hasGatePermission;

    let statusText = 'Yetkili';
    if (!targetCard) {
      statusText = 'Tanımlanmamış Yabancı Kullanıcı';
    } else if (!isActive) {
      statusText = 'Kullanıcı Engelli (Pasif)';
    } else if (!hasGatePermission) {
      statusText = 'Kapı Yetkisi Yok (Yetkisiz Kapı)';
    }

    const timestamp = formatTurkeyTimestamp();

    if (esp32Status.isOnline) {
      // --- ONLINE MOD: CANLI REST API & FIRESTORE KANALI ---
      try {
        const res = await fetch(`${API_BASE}/logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: cardUid,
            gate: activeGate,
            direction
          })
        });
        const json = await res.json();

        if (json.success && json.data) {
          const newOnlineLog = {
            id: json.data.id || `log-${Date.now()}`,
            timestamp: formatTurkeyTimestamp(json.data.timestamp) || timestamp,
            holderName: json.data.holderName || holderName,
            gate: activeGate,
            direction,
            status: json.data.status || (json.authorized ? 'Yetkili' : 'Kapı Yetkisi Yok'),
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
        holderName,
        gate: activeGate,
        direction,
        status: statusText,
        mode: 'Offline (LittleFS)',
        relayTriggered: isAuthorized,
        buzzerBeeps: isAuthorized ? 1 : 3,
        syncedToFirestore: false
      };
      setLogs(prev => [offlineLog, ...prev]);
    }

    setSimFeedback({
      isAuthorized,
      hasGatePermission,
      isActive,
      holderName,
      gate: activeGate,
      statusText,
      isOnline: esp32Status.isOnline,
      buzzerBeeps: isAuthorized ? 1 : 3
    });

    setTimeout(() => {
      setSimFeedback(null);
    }, 4500);
  };

  // Quick Date Shortcut Filters (Bugün, Dün, Bu Hafta)
  const setQuickDate = (type) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (type === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (type === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (type === 'week') {
      const w = new Date(now);
      w.setDate(w.getDate() - 7);
      setStartDate(w.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else {
      setStartDate('');
      setEndDate('');
      setStatusFilter('ALL');
      setSearchTerm('');
    }
  };

  // STRICT CHRONOLOGICAL SORTING: Always sort purely by timestamp descending (newest first)
  const sortedLogs = [...logs].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime() || 0;
    const timeB = new Date(b.timestamp).getTime() || 0;
    return timeB - timeA;
  });

  // Comprehensive Date Range & Status & Name Search Filter Logic
  const filteredLogs = sortedLogs.filter(log => {
    // 1. Text Search (Holder Name or Gate)
    const matchesSearch = (log.holderName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (log.gate || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    // 2. Status Filter
    if (statusFilter === 'AUTHORIZED' && (!log.relayTriggered && (!log.status || !log.status.includes('Yetkili')))) {
      return false;
    }
    if (statusFilter === 'UNAUTHORIZED' && (log.relayTriggered || (log.status && log.status.includes('Yetkili')))) {
      return false;
    }

    // 3. Date Range Filter
    if (startDate || endDate) {
      try {
        const logDateObj = new Date(log.timestamp);
        if (!isNaN(logDateObj.getTime())) {
          const logDateStr = logDateObj.toISOString().split('T')[0];
          if (startDate && logDateStr < startDate) return false;
          if (endDate && logDateStr > endDate) return false;
        }
      } catch (err) {}
    }

    return true;
  });

  const pendingCount = logs.filter(l => !l.syncedToFirestore).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Simulator Box */}
      <div className="glass-panel" style={{ padding: '20px', background: '#162038' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#ffffff', borderRadius: '10px', display: 'flex' }}>
              <Zap size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>Turnike Kart Okutma Simülatörü</h2>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                {esp32Status.isOnline 
                  ? '🌐 Online Mod: Seçilen kullanıcı yetkisine göre dinamik doğrulama yapılır, loglar Firestore\'a işlenir.'
                  : '🔌 Offline Mod: İnternet yok. Geçiş yapan kullanıcılar LittleFS pendingLogs.json belgesine kaydedilir.'
                }
              </p>
            </div>
          </div>

          {pendingCount > 0 && (
            <button 
              onClick={syncPendingLogs}
              className="btn btn-primary"
              style={{ background: '#d97706', fontSize: '0.8rem', padding: '8px 14px' }}
            >
              <HardDrive size={15} /> {pendingCount} Bekleyen Çevrimdışı Logu Firestore'a Aktar
            </button>
          )}
        </div>

        {/* Controls - Balanced Button Height & Typography */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', alignItems: 'end' }}>
          <div>
            <label className="form-label">Okutulacak Kullanıcı</label>
            <select
              value={selectedCardId}
              onChange={(e) => handleCardChange(e.target.value)}
              className="form-select"
            >
              {cards.length === 0 ? (
                <option value="">(Henüz Kullanıcı Yok - Önce Kayıt Ekleyin)</option>
              ) : (
                cards.map(c => (
                  <option key={c.id || c.uid} value={c.id || c.uid}>
                    {c.holderName} ({c.department || c.faculty || 'Birim'}) - İzinler: [{Array.isArray(c.allowedGates) ? c.allowedGates.join(', ') : (c.accessLevel || 'Belirtilmedi')}]
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ color: '#38bdf8', fontWeight: 700 }}>
              Geçiş Yapılacak Kapı (Seçiniz):
            </label>
            <select
              value={selectedGate}
              onChange={(e) => setSelectedGate(e.target.value)}
              className="form-select"
              style={{ borderColor: '#38bdf8', fontWeight: 600, background: '#0b1329' }}
            >
              {safeGates.map(gate => (
                <option key={gate} value={gate}>{gate}</option>
              ))}
            </select>
          </div>

          <div>
            <button onClick={handleSimulateTap} className="btn btn-success" style={{ width: '100%', padding: '9px 14px', fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <CreditCard size={16} /> Kart Okut (Kapı Geçişi Yap)
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {simFeedback && (
          <div style={{
            marginTop: '16px',
            padding: '14px 18px',
            borderRadius: '10px',
            background: simFeedback.isAuthorized ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            border: `1px solid ${simFeedback.isAuthorized ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: simFeedback.isAuthorized ? '#34d399' : '#f87171'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {simFeedback.isAuthorized ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>
                  {simFeedback.isAuthorized 
                    ? `🔓 "${simFeedback.gate}" KAFESİNDE ERİŞİM İZNİ VERİLDİ (RÖLE AÇIK)` 
                    : `🔒 "${simFeedback.gate}" ERİŞİMİ REDDEDİLDİ! (${simFeedback.statusText})`
                  }
                </div>
                <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '2px' }}>
                  Kullanıcı: <strong>{simFeedback.holderName}</strong> • Denenen Kapı: <strong>{simFeedback.gate}</strong>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
              <Volume2 size={18} /> Buzzer: {simFeedback.buzzerBeeps} Kısa Bip
            </div>
          </div>
        )}
      </div>

      {/* Advanced Date Range & Status Filter Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', background: '#162038', border: '1px solid #293859' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Filter size={18} color="#38bdf8" />
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc' }}>Gelişmiş Tarih & Durum Filtresi:</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Start Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={15} color="#94a3b8" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="form-input"
                style={{ fontSize: '0.8rem', padding: '6px 10px', width: '135px' }}
                title="Başlangıç Tarihi"
              />
            </div>

            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>-</span>

            {/* End Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="form-input"
                style={{ fontSize: '0.8rem', padding: '6px 10px', width: '135px' }}
                title="Bitiş Tarihi"
              />
            </div>

            {/* Status Select */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-select"
              style={{ fontSize: '0.8rem', padding: '6px 10px', width: '150px' }}
            >
              <option value="ALL">Tüm Durumlar</option>
              <option value="AUTHORIZED">🟢 Sadece Yetkili</option>
              <option value="UNAUTHORIZED">🔴 Sadece Yetkisiz / Red</option>
            </select>

            {/* Quick Shortcuts */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <button 
                onClick={() => setQuickDate('today')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.74rem', padding: '5px 9px' }}
              >
                Bugün
              </button>
              <button 
                onClick={() => setQuickDate('yesterday')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.74rem', padding: '5px 9px' }}
              >
                Dün
              </button>
              <button 
                onClick={() => setQuickDate('week')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.74rem', padding: '5px 9px' }}
              >
                Bu Hafta
              </button>
              {(startDate || endDate || statusFilter !== 'ALL' || searchTerm) && (
                <button 
                  onClick={() => setQuickDate('clear')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.74rem', padding: '5px 9px', color: '#fb7185', display: 'flex', alignItems: 'center', gap: '3px' }}
                  title="Tüm filtreleri temizle"
                >
                  <RotateCcw size={12} /> Temizle
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Access Logs Table - Strict Chronological Order & Export Rapor Buttons */}
      <div className="glass-panel" style={{ padding: '20px', background: '#162038' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
              Giriş Logları Listesi
              <span style={{ fontSize: '0.82rem', color: '#38bdf8', fontWeight: 600, marginLeft: '10px' }}>
                ({filteredLogs.length} Kayıt Listeleniyor)
              </span>
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>Turnikelerden geçen kullanıcıların kronolojik zaman sıralı dökümü (En yeni en üstte).</p>
          </div>

          {/* Export Rapor Buttons & Search Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                onClick={() => exportToExcel(filteredLogs, 'Giris_Loglari')}
                className="btn btn-success btn-sm"
                style={{ fontSize: '0.78rem', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                title="Filtreli giriş loglarını Excel (.xlsx) olarak indir"
              >
                <FileSpreadsheet size={15} /> Excel İndir
              </button>

              <button 
                onClick={() => exportToCSV(filteredLogs, 'Giris_Loglari')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.78rem', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                title="Filtreli giriş loglarını CSV olarak indir"
              >
                <Download size={15} /> CSV
              </button>
            </div>

            <div style={{ position: 'relative', width: '200px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1' }} />
              <input
                type="text"
                placeholder="İsim veya Kapı Ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '36px', fontSize: '0.84rem' }}
              />
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Tarih & Saat (TRT)</th>
                <th>Kullanıcı Ad Soyad</th>
                <th>Kapı</th>
                <th>Geçiş Durumu / Sonuç</th>
                <th>Röle & Buzzer</th>
                <th>Firestore</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: '#cbd5e1', padding: '30px' }}>
                    Seçilen filtrelere uygun giriş kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.78rem', color: '#cbd5e1', fontFamily: 'var(--font-mono)' }}>
                      {formatTurkeyTimestamp(log.timestamp)}
                    </td>
                    <td style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.92rem' }}>{log.holderName}</td>
                    <td style={{ fontSize: '0.82rem', color: '#38bdf8', fontWeight: 700 }}>
                      <DoorClosed size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      {log.gate}
                    </td>
                    <td>
                      <span className={log.relayTriggered ? 'badge badge-online' : 'badge badge-offline'}>
                        {log.status}
                      </span>
                    </td>
                    <td>
                      <span className={log.relayTriggered ? 'badge badge-active' : 'badge badge-blocked'}>
                        {log.relayTriggered ? '🔓 Açık (1 Bip)' : '🔒 Kapalı (3 Bip)'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.78rem', fontWeight: 600, color: log.syncedToFirestore ? '#34d399' : '#fbbf24' }}>
                      {log.syncedToFirestore ? '✅ Firestore\'a İşlendi' : '⚠️ pendingLogs.json'}
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
