import React from 'react';
import { CreditCard, UserPlus, FileText, BarChart2, Wifi, WifiOff, Cpu } from 'lucide-react';

export default function HeaderNav({ activeTab, setActiveTab, esp32Status, toggleESP32Online }) {
  const steps = [
    { id: 'list', label: '1. Kart Listeleme', icon: CreditCard, countInfo: `${esp32Status.cardsJsonCount || 0} Kart Kayıtlı` },
    { id: 'add', label: '2. Kart Ekleme', icon: UserPlus, countInfo: 'Yeni RFID Kaydı' },
    { id: 'logs', label: '3. Giriş Logları', icon: FileText, countInfo: 'Canlı Turnike Logları' },
    { id: 'analytics', label: '4. İstatistik & Analiz', icon: BarChart2, countInfo: 'Grafik ve Raporlar' }
  ];

  return (
    <header style={{ marginBottom: '24px' }}>
      {/* Header Top Banner */}
      <div className="glass-panel glow-card-cyan" style={{ padding: '18px 24px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', background: '#162038' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '10px', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', borderRadius: '10px', color: '#ffffff', display: 'flex', boxShadow: '0 0 14px rgba(56, 189, 248, 0.45)' }}>
            <Cpu size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.2px' }}>
              ESP32 Akıllı Kartlı Geçiş Kontrol Sistemi
            </h1>
            <p style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '2px' }}>
              W5500 Ethernet • MFRC522 RFID • LittleFS Offline Desteği • Firebase Firestore
            </p>
          </div>
        </div>

        {/* ESP32 Status Badge & Online Switch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: '#0b1329', border: '1px solid #293859', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>
            <span className={esp32Status.isOnline ? "pulse-dot pulse-online" : "pulse-dot pulse-offline"}></span>
            <span style={{ color: esp32Status.isOnline ? '#38bdf8' : '#f59e0b' }}>
              {esp32Status.isOnline ? 'ESP32 Online (REST API)' : 'ESP32 Offline (LittleFS)'}
            </span>
          </div>

          <button 
            onClick={toggleESP32Online}
            className={`btn btn-sm ${esp32Status.isOnline ? 'btn-secondary' : 'btn-primary'}`}
            style={{ fontSize: '0.78rem', padding: '8px 14px' }}
          >
            {esp32Status.isOnline ? (
              <> <WifiOff size={14} color="#f59e0b" /> İnterneti Kes (Offline Mod) </>
            ) : (
              <> <Wifi size={14} /> İnterneti Bağla (Online Mod) </>
            )}
          </button>
        </div>
      </div>

      {/* 4-Step Navigation Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = activeTab === step.id;
          return (
            <button
              key={step.id}
              onClick={() => setActiveTab(step.id)}
              className={`glass-panel ${isActive ? 'neon-active-step' : ''}`}
              style={{
                padding: '14px 18px',
                minHeight: '64px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: isActive ? '#1e2d4d' : '#162038',
                borderColor: isActive ? '#38bdf8' : '#293859',
                cursor: 'pointer',
                transition: 'all 0.25s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  padding: '9px',
                  borderRadius: '9px',
                  background: isActive ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : '#293859',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  display: 'flex',
                  boxShadow: isActive ? '0 0 14px rgba(56, 189, 248, 0.5)' : 'none'
                }}>
                  <Icon size={18} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: isActive ? '#ffffff' : '#e2e8f0' }}>
                    {step.label}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: isActive ? '#7dd3fc' : '#94a3b8', marginTop: '1px' }}>
                    {step.countInfo}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </header>
  );
}
