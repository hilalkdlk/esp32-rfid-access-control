import React from 'react';
import { CreditCard, UserPlus, FileText, Wifi, WifiOff, Cpu } from 'lucide-react';

export default function HeaderNav({ activeTab, setActiveTab, esp32Status, toggleESP32Online }) {
  const steps = [
    { id: 'list', label: '1. Kart Listeleme', icon: CreditCard, countInfo: `${esp32Status.cardsJsonCount} Kart Kayıtlı` },
    { id: 'add', label: '2. Kart Ekleme', icon: UserPlus, countInfo: 'Yeni RFID Kaydı' },
    { id: 'logs', label: '3. Giriş-Çıkış Logları', icon: FileText, countInfo: 'Canlı Turnike Logları' }
  ];

  return (
    <header style={{ marginBottom: '24px' }}>
      {/* Header Top Bar */}
      <div className="glass-panel glow-card-indigo" style={{ padding: '16px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', background: 'linear-gradient(135deg, #6366f1 0%, #38bdf8 100%)', borderRadius: '10px', color: '#ffffff', display: 'flex', boxShadow: '0 0 14px rgba(99, 102, 241, 0.5)' }}>
            <Cpu size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
              ESP32 Akıllı Kartlı Geçiş Kontrol Sistemi
            </h1>
            <p style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
              W5500 Ethernet • MFRC522 RFID • LittleFS Offline Desteği
            </p>
          </div>
        </div>

        {/* ESP32 Status Badge & Online Switch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: '#1e293b', border: '1px solid #475569', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>
            <span className={esp32Status.isOnline ? "pulse-dot pulse-online" : "pulse-dot pulse-offline"}></span>
            <span style={{ color: esp32Status.isOnline ? '#38bdf8' : '#f59e0b' }}>
              {esp32Status.isOnline ? 'ESP32 Online (API)' : 'ESP32 Offline (LittleFS)'}
            </span>
          </div>

          <button 
            onClick={toggleESP32Online}
            className={`btn btn-sm ${esp32Status.isOnline ? 'btn-secondary' : 'btn-primary'}`}
            style={{ fontSize: '0.78rem' }}
          >
            {esp32Status.isOnline ? (
              <> <WifiOff size={14} color="#f59e0b" /> İnterneti Kes (Offline Mod) </>
            ) : (
              <> <Wifi size={14} /> İnterneti Bağla (Online Mod) </>
            )}
          </button>
        </div>
      </div>

      {/* 3-Step Navigation Bar with Neon Active Step Glow */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = activeTab === step.id;
          return (
            <button
              key={step.id}
              onClick={() => setActiveTab(step.id)}
              className={`glass-panel ${isActive ? 'neon-active-step' : ''}`}
              style={{
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: isActive ? '#334155' : '#1e293b',
                cursor: 'pointer',
                transition: 'all 0.25s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  padding: '8px',
                  borderRadius: '8px',
                  background: isActive ? '#6366f1' : '#475569',
                  color: isActive ? '#ffffff' : '#cbd5e1',
                  display: 'flex',
                  boxShadow: isActive ? '0 0 12px rgba(99, 102, 241, 0.6)' : 'none'
                }}>
                  <Icon size={18} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: isActive ? '#ffffff' : '#e2e8f0' }}>
                    {step.label}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
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
