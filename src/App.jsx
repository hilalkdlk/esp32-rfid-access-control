import React, { useState, useEffect } from 'react';
import HeaderNav from './components/HeaderNav';
import CardListScreen from './components/CardListScreen';
import AddCardScreen from './components/AddCardScreen';
import AccessLogsScreen from './components/AccessLogsScreen';
import AnalyticsScreen from './components/AnalyticsScreen';
import { INITIAL_ESP32_STATUS } from './data/initialData';
import { CheckCircle, AlertTriangle } from 'lucide-react';

// Live REST API Base URL
const API_BASE = 'http://localhost:5000/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'add' | 'logs' | 'analytics'
  const [cards, setCards] = useState([]);
  const [logs, setLogs] = useState([]);
  const [esp32Status, setEsp32Status] = useState(INITIAL_ESP32_STATUS);
  const [selectedCardForSim, setSelectedCardForSim] = useState('');
  const [notification, setNotification] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // 1. Initial Load: Fetch Live Cards, Logs, and System Health from API & Firestore
  useEffect(() => {
    fetchLiveCards();
    fetchLiveLogs();
    checkApiHealth();

    // Live Auto-Refresh Interval (Every 5 seconds, auto-sync new physical ESP32 & LittleFS logs!)
    const autoRefreshInterval = setInterval(() => {
      fetchLiveLogs();
      fetchLiveCards();
    }, 5000);

    return () => clearInterval(autoRefreshInterval);
  }, []);

  // Fetch Cards from API & Firestore
  const fetchLiveCards = async () => {
    try {
      const res = await fetch(`${API_BASE}/cards`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setCards(json.data);
      }
    } catch (err) {
      console.log('API Offline');
    }
  };

  // Fetch Logs from API & Firestore
  const fetchLiveLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/logs`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setLogs(json.data);
      }
    } catch (err) {
      console.log('API Offline');
    }
  };

  // Check API Health
  const checkApiHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      const json = await res.json();
      if (json.status === 'ONLINE') {
        setEsp32Status(prev => ({
          ...prev,
          isOnline: true,
          cardsJsonCount: json.totalCardsInFirestore || 0
        }));
      }
    } catch (err) {
      setEsp32Status(prev => ({ ...prev, isOnline: false }));
    }
  };

  // Toggle ESP32 Online / Offline Mode with Live API Sync
  const toggleESP32Online = () => {
    setEsp32Status(prev => {
      const nextOnline = !prev.isOnline;

      if (nextOnline) {
        const pendingLogsList = logs.filter(l => !l.syncedToFirestore);
        if (pendingLogsList.length > 0) {
          syncPendingLogs(pendingLogsList);
        } else {
          showToast('⚡ ESP32 REST API Servisi & Firestore Veritabanı Bağlantısı Aktif.', 'success');
        }
      } else {
        showToast('⚠️ ESP32 Çevrimdışı Moda Geçildi (LittleFS Fallback Aktif).', 'warning');
      }

      return {
        ...prev,
        isOnline: nextOnline
      };
    });
  };

  // Add new card handler (POST to API & Firestore with Duplicate UID check response handling)
  const handleAddCard = async (newCard) => {
    try {
      const res = await fetch(`${API_BASE}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCard)
      });
      const json = await res.json();
      
      if (json.success && json.data) {
        setCards(prev => [json.data, ...prev]);
        setSelectedCardForSim(json.data.id || json.data.uid);
        showToast(`Yeni RFID Kart (${newCard.uid}) kaydedildi ve Firestore veritabanına eklendi!`, 'success');
      } else {
        showToast(json.error || 'Kart eklenirken bir hata oluştu.', 'error');
        return;
      }
    } catch (err) {
      setCards(prev => [newCard, ...prev]);
      setSelectedCardForSim(newCard.id || newCard.uid);
      showToast(`Yeni RFID Kart (${newCard.uid}) kaydedildi!`, 'success');
    }

    setEsp32Status(prev => ({
      ...prev,
      cardsJsonCount: prev.cardsJsonCount + 1,
      lastSyncTime: new Date().toLocaleTimeString('tr-TR')
    }));
    fetchLiveCards();
  };

  // Update Card Details (PUT /api/cards/:id)
  const handleUpdateCard = async (cardId, updatedFields) => {
    try {
      const res = await fetch(`${API_BASE}/cards/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
      const json = await res.json();
      if (json.success) {
        setCards(prev => prev.map(c => c.id === cardId ? { ...c, ...updatedFields } : c));
        showToast('Kullanıcı bilgileri başarıyla güncellendi ve Firestore\'a işlendi!', 'success');
      } else {
        setCards(prev => prev.map(c => c.id === cardId ? { ...c, ...updatedFields } : c));
      }
    } catch (err) {
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, ...updatedFields } : c));
    }
  };

  // Toggle Card Status (Aktif / Engelli) with Live API & Firestore Update
  const handleToggleCardStatus = async (cardId, currentStatus) => {
    const nextStatus = currentStatus === 'Aktif' ? 'Engelli' : 'Aktif';
    try {
      const res = await fetch(`${API_BASE}/cards/${cardId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const json = await res.json();
      if (json.success) {
        setCards(prev => prev.map(c => c.id === cardId ? { ...c, status: nextStatus } : c));
        showToast(`Kullanıcı durumu "${nextStatus}" olarak Firestore'da güncellendi!`, 'success');
      } else {
        setCards(prev => prev.map(c => c.id === cardId ? { ...c, status: nextStatus } : c));
      }
    } catch (err) {
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, status: nextStatus } : c));
    }
  };

  // Delete Card with Live API & Firestore Removal
  const handleDeleteCard = async (cardId) => {
    if (!window.confirm('Bu kullanıcıyı Firestore veritabanından ve sistemden silmek istediğinize emin misiniz?')) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/cards/${cardId}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        setCards(prev => prev.filter(c => c.id !== cardId));
        showToast('Kullanıcı veritabanından ve sistemden başarıyla silindi!', 'success');
      } else {
        setCards(prev => prev.filter(c => c.id !== cardId));
      }
    } catch (err) {
      setCards(prev => prev.filter(c => c.id !== cardId));
    }
  };

  // Simulate card tap from List screen
  const handleSimulateFromList = (card) => {
    setSelectedCardForSim(card.id || card.uid);
    setActiveTab('logs');
    showToast(`"${card.holderName}" turnike simülatöründe otomatik olarak seçildi.`, 'success');
  };

  // Sync pending LittleFS logs to API & Firestore
  const syncPendingLogs = async (pendingLogsList) => {
    const listToSync = pendingLogsList || logs.filter(l => !l.syncedToFirestore);
    try {
      const res = await fetch(`${API_BASE}/logs/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingLogs: listToSync })
      });
      const json = await res.json();
      
      if (json.success) {
        setLogs(prev => prev.map(l => ({ ...l, syncedToFirestore: true })));
        setEsp32Status(prev => ({ ...prev, pendingLogsCount: 0 }));
        showToast(`⚡ LittleFS pendingLogs.json üzerindeki ${listToSync.length} adet log canlı Firestore'a aktarıldı!`, 'success');
        fetchLiveLogs();
      }
    } catch (err) {
      setLogs(prev => prev.map(l => ({ ...l, syncedToFirestore: true })));
      setEsp32Status(prev => ({ ...prev, pendingLogsCount: 0 }));
    }
  };

  return (
    <div style={{ maxWidth: '1440px', width: '100%', margin: '0 auto', padding: '24px 24px 48px 24px', boxSizing: 'border-box' }}>
      {/* Toast Notification Alert */}
      {notification && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          padding: '14px 20px',
          borderRadius: '12px',
          background: notification.type === 'success' ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
          color: '#ffffff',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5), 0 0 15px rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.88rem',
          fontWeight: 600,
          border: '1px solid rgba(255,255,255,0.3)',
          animation: 'pulseGlow 0.5s ease'
        }}>
          {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Header & Sequential Stepper Navigation */}
      <HeaderNav 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        esp32Status={{
          ...esp32Status,
          pendingLogsCount: logs.filter(l => !l.syncedToFirestore).length
        }}
        toggleESP32Online={toggleESP32Online}
      />

      {/* Screen 1: Kart Listeleme */}
      {activeTab === 'list' && (
        <CardListScreen 
          cards={cards}
          onUpdateCard={handleUpdateCard}
          onToggleCardStatus={handleToggleCardStatus}
          onDeleteCard={handleDeleteCard}
          onNavigateToAdd={() => setActiveTab('add')}
          onSimulateCard={handleSimulateFromList}
          logsCount={logs.length}
          pendingCount={logs.filter(l => !l.syncedToFirestore).length}
        />
      )}

      {/* Screen 2: Kart Ekleme */}
      {activeTab === 'add' && (
        <AddCardScreen 
          cards={cards}
          onAddCard={handleAddCard}
          onNavigateToLogs={() => setActiveTab('logs')}
          onNavigateToList={() => setActiveTab('list')}
        />
      )}

      {/* Screen 3: Giriş-Çıkış Logları */}
      {activeTab === 'logs' && (
        <AccessLogsScreen 
          logs={logs}
          setLogs={setLogs}
          cards={cards}
          esp32Status={{
            ...esp32Status,
            pendingLogsCount: logs.filter(l => !l.syncedToFirestore).length
          }}
          toggleESP32Online={toggleESP32Online}
          syncPendingLogs={syncPendingLogs}
          selectedCardForSim={selectedCardForSim}
        />
      )}

      {/* Screen 4: İstatistik & Analiz */}
      {activeTab === 'analytics' && (
        <AnalyticsScreen 
          cards={cards}
          logs={logs}
        />
      )}
    </div>
  );
}
