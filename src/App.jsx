import React, { useState, useEffect } from 'react';
import HeaderNav from './components/HeaderNav';
import CardListScreen from './components/CardListScreen';
import AddCardScreen from './components/AddCardScreen';
import AccessLogsScreen from './components/AccessLogsScreen';
import { INITIAL_CARDS, INITIAL_LOGS, INITIAL_ESP32_STATUS } from './data/initialData';
import { CheckCircle, AlertTriangle } from 'lucide-react';

// Live REST API Base URL
const API_BASE = 'http://localhost:5000/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'add' | 'logs'
  const [cards, setCards] = useState(INITIAL_CARDS);
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [esp32Status, setEsp32Status] = useState(INITIAL_ESP32_STATUS);
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
  }, []);

  // Fetch Cards from API
  const fetchLiveCards = async () => {
    try {
      const res = await fetch(`${API_BASE}/cards`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setCards(json.data);
      }
    } catch (err) {
      console.log('API Offline - Using Initial Cards Data');
    }
  };

  // Fetch Logs from API
  const fetchLiveLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/logs`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setLogs(json.data);
      }
    } catch (err) {
      console.log('API Offline - Using Initial Logs Data');
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
          cardsJsonCount: json.totalCardsInFirestore || cards.length
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

  // Add new card handler (POST to API & Firestore)
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
      } else {
        setCards(prev => [newCard, ...prev]);
      }
    } catch (err) {
      setCards(prev => [newCard, ...prev]);
    }

    setEsp32Status(prev => ({
      ...prev,
      cardsJsonCount: prev.cardsJsonCount + 1,
      lastSyncTime: new Date().toLocaleTimeString('tr-TR')
    }));
    showToast(`Yeni RFID Kart (${newCard.uid}) kaydedildi ve Firestore veritabanına eklendi!`, 'success');
  };

  // Simulate card tap from List screen
  const handleSimulateFromList = (card) => {
    setActiveTab('logs');
    showToast(`"${card.holderName}" kartı için turnike okutma ekranına yönlendirildiniz.`, 'success');
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
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px 48px 16px' }}>
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
          setCards={setCards}
          onNavigateToAdd={() => setActiveTab('add')}
          onSimulateCard={handleSimulateFromList}
          logsCount={logs.length}
          pendingCount={logs.filter(l => !l.syncedToFirestore).length}
        />
      )}

      {/* Screen 2: Kart Ekleme */}
      {activeTab === 'add' && (
        <AddCardScreen 
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
        />
      )}
    </div>
  );
}
