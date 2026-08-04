import React, { useState } from 'react';
import HeaderNav from './components/HeaderNav';
import CardListScreen from './components/CardListScreen';
import AddCardScreen from './components/AddCardScreen';
import AccessLogsScreen from './components/AccessLogsScreen';
import { INITIAL_CARDS, INITIAL_LOGS, INITIAL_ESP32_STATUS } from './data/initialData';
import { CheckCircle, AlertTriangle } from 'lucide-react';

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
    }, 4000);
  };

  // Toggle ESP32 Online / Offline Mode
  const toggleESP32Online = () => {
    setEsp32Status(prev => {
      const nextOnline = !prev.isOnline;
      showToast(
        nextOnline 
          ? 'ESP32 W5500 Ethernet Bağlantısı Kuruldu (Online API Aktif)' 
          : 'ESP32 İnternet Bağlantısı Kesildi! (LittleFS Offline Fallback Aktif)',
        nextOnline ? 'success' : 'warning'
      );
      return {
        ...prev,
        isOnline: nextOnline
      };
    });
  };

  // Add new card handler
  const handleAddCard = (newCard) => {
    setCards(prev => [newCard, ...prev]);
    setEsp32Status(prev => ({
      ...prev,
      cardsJsonCount: prev.cardsJsonCount + 1,
      lastSyncTime: new Date().toLocaleTimeString('tr-TR')
    }));
    showToast(`Yeni RFID Kart (${newCard.uid}) başarıyla kaydedildi ve cards.json'a senkronize edildi!`, 'success');
  };

  // Simulate card tap from List screen
  const handleSimulateFromList = (card) => {
    setActiveTab('logs');
    showToast(`"${card.holderName}" kartı için turnike okutma ekranına yönlendirildiniz.`, 'success');
  };

  // Sync pending logs from LittleFS to Firestore
  const syncPendingLogs = () => {
    setLogs(prev => prev.map(l => ({ ...l, syncedToFirestore: true })));
    setEsp32Status(prev => ({ ...prev, pendingLogsCount: 0 }));
    showToast('LittleFS pendingLogs.json üzerindeki tüm kayıtlar Firebase Cloud Firestore veritabanına aktarıldı!', 'success');
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
          background: notification.type === 'success' ? '#065f46' : '#92400e',
          color: '#ffffff',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.9rem',
          fontWeight: 600,
          border: '1px solid rgba(255,255,255,0.2)',
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
