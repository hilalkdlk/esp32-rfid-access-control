import React from 'react';
import { CreditCard, UserPlus, FileText, Wifi, WifiOff, Cpu, HardDrive, ShieldCheck } from 'lucide-react';

export default function HeaderNav({ activeTab, setActiveTab, esp32Status, toggleESP32Online }) {
  const steps = [
    { id: 'list', label: '1. Kart Listeleme', icon: CreditCard, countInfo: `${esp32Status.cardsJsonCount} Kart` },
    { id: 'add', label: '2. Kart Ekleme', icon: UserPlus, countInfo: 'Yeni Kayıt' },
    { id: 'logs', label: '3. Giriş-Çıkış Logları', icon: FileText, countInfo: 'Canlı Turnike' }
  ];

  return (
    <header style={{ marginBottom: '24px' }}>
      {/* Header Top Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', background: '#4f46e5', borderRadius: '10px', color: '#ffffff', display: 'flex' }}>
            <Cpu size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              ESP32 Akıllı Kartlı Geçiş Sistemi
            </h1>
            <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
              W5500 Ethernet • MFRC522 RFID • LittleFS Offline Desteği
            </p>
          </div>
        </div>

        {/* ESP32 Status Badge & Online Switch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>
            <span className={esp32Status.isOnline ? "pulse-dot pulse-online" : "pulse-dot pulse-offline"}></span>
            <span style={{ color: esp32Status.isOnline ? '#059669' : '#d97706' }}>
              {esp32Status.isOnline ? 'ESP32 Online (API)' : 'ESP32 Offline (LittleFS)'}
            </span>
          </div>

          <button 
            onClick={toggleESP32Online}
            className={`btn btn-sm ${esp32Status.isOnline ? 'btn-secondary' : 'btn-primary'}`}
            style={{ fontSize: '0.78rem' }}
          >
            {esp32Status.isOnline ? (
              <> <WifiOff size={14} color="#d97706" /> İnterneti Kes (Offline Yap) </>
            ) : (
              <> <Wifi size={14} /> İnterneti Bağla (Online Yap) </>
            )}
          </button>
        </div>
      </div>

      {/* Simplified 3-Step Navigation Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = activeTab === step.id;
          return (
            <button
              key={step.id}
              onClick={() => setActiveTab(step.id)}
              className="glass-panel"
              style={{
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: isActive ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                background: isActive ? '#ffffff' : '#f8fafc',
                boxShadow: isActive ? '0 4px 12px rgba(79, 70, 229, 0.12)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  padding: '8px',
                  borderRadius: '8px',
                  background: isActive ? '#4f46e5' : '#e2e8f0',
                  color: isActive ? '#ffffff' : '#64748b',
                  display: 'flex'
                }}>
                  <Icon size={18} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: isActive ? '#0f172a' : '#475569' }}>
                    {step.label}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
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
