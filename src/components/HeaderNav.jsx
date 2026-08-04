import React from 'react';
import { CreditCard, UserPlus, FileText, Wifi, WifiOff, Cpu, HardDrive } from 'lucide-react';

export default function HeaderNav({ activeTab, setActiveTab, esp32Status, toggleESP32Online }) {
  const steps = [
    { id: 'list', label: '1. Kart Listeleme', icon: CreditCard, countInfo: `${esp32Status.cardsJsonCount} Kart Kayıtlı` },
    { id: 'add', label: '2. Kart Ekleme', icon: UserPlus, countInfo: 'Yeni RFID Kaydı' },
    { id: 'logs', label: '3. Giriş-Çıkış Logları', icon: FileText, countInfo: 'Canlı Turnike Logları' }
  ];

  return (
    <header style={{ marginBottom: '24px' }}>
      {/* Header Top Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', background: 'linear-gradient(135deg, #6366f1 0%, #38bdf8 100%)', borderRadius: '10px', color: '#ffffff', display: 'flex' }}>
            <Cpu size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
              ESP32 Akıllı Kartlı Geçiş Kontrol Sistemi
            </h1>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              W5500 Ethernet • MFRC522 RFID • LittleFS Offline Desteği
            </p>
          </div>
        </div>

        {/* ESP32 Status Badge & Online Switch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>
            <span className={esp32Status.isOnline ? "pulse-dot pulse-online" : "pulse-dot pulse-offline"}></span>
            <span style={{ color: esp32Status.isOnline ? '#38bdf8' : '#fbbf24' }}>
              {esp32Status.isOnline ? 'ESP32 Online (API)' : 'ESP32 Offline (LittleFS)'}
            </span>
          </div>

          <button 
            onClick={toggleESP32Online}
            className={`btn btn-sm ${esp32Status.isOnline ? 'btn-secondary' : 'btn-primary'}`}
            style={{ fontSize: '0.78rem' }}
          >
            {esp32Status.isOnline ? (
              <> <WifiOff size={14} color="#fbbf24" /> İnterneti Kes (Offline Mod) </>
            ) : (
              <> <Wifi size={14} /> İnterneti Bağla (Online Mod) </>
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
                border: isActive ? '2px solid #6366f1' : '1px solid #334155',
                background: isActive ? '#1e293b' : '#0f172a',
                boxShadow: isActive ? '0 4px 16px rgba(99, 102, 241, 0.25)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  padding: '8px',
                  borderRadius: '8px',
                  background: isActive ? '#6366f1' : '#334155',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  display: 'flex'
                }}>
                  <Icon size={18} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: isActive ? '#ffffff' : '#cbd5e1' }}>
                    {step.label}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
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
