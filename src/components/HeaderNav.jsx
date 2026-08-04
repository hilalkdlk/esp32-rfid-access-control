import React from 'react';
import { CreditCard, UserPlus, FileText, Wifi, WifiOff, Cpu, HardDrive } from 'lucide-react';

export default function HeaderNav({ activeTab, setActiveTab, esp32Status, toggleESP32Online }) {
  const steps = [
    { id: 'list', label: '1. Kart Listeleme', icon: CreditCard, subtitle: 'Yetkili Kart Listesi & Durumlar' },
    { id: 'add', label: '2. Kart Ekleme', icon: UserPlus, subtitle: 'Yeni RFID Kart Kaydı & Canlı Önizleme' },
    { id: 'logs', label: '3. Giriş-Çıkış Logları', icon: FileText, subtitle: 'Turnike Geçiş Kayıtları & ESP32 Simülatörü' }
  ];

  return (
    <header style={{ marginBottom: '28px' }}>
      {/* Top Banner with ESP32 Status */}
      <div className="glass-panel" style={{ padding: '16px 24px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '10px', background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)', borderRadius: '12px', display: 'flex' }}>
            <Cpu size={26} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, background: 'linear-gradient(90deg, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ESP32 Akıllı Kartlı Geçiş Kontrol Sistemi
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>W5500 Ethernet</span> • <span>MFRC522 RFID</span> • <span>Firebase Firestore API</span> • <span>LittleFS Offline Fallback</span>
            </p>
          </div>
        </div>

        {/* Connection Toggle & Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0, 0, 0, 0.3)', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span className={esp32Status.isOnline ? "pulse-dot pulse-online" : "pulse-dot pulse-offline"}></span>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: esp32Status.isOnline ? '#22d3ee' : '#f59e0b' }}>
              {esp32Status.isOnline ? 'ESP32 ÇEVRİMİÇİ (Online API)' : 'ESP32 ÇEVRİMDİŞİ (LittleFS Active)'}
            </span>
          </div>

          <button 
            onClick={toggleESP32Online}
            className={`btn btn-sm ${esp32Status.isOnline ? 'btn-secondary' : 'btn-primary'}`}
            title="ESP32 İnternet Bağlantısını Kes / Bağla (Offline Mod Simülasyonu)"
            style={{ fontSize: '0.78rem' }}
          >
            {esp32Status.isOnline ? (
              <> <WifiOff size={14} color="#f59e0b" /> İnterneti Kes (Offline Mod) </>
            ) : (
              <> <Wifi size={14} color="#34d399" /> İnterneti Bağla (Online Mod) </>
            )}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#9ca3af' }}>
            <HardDrive size={14} />
            <span>LittleFS Pending: <strong>{esp32Status.pendingLogsCount} log</strong></span>
          </div>
        </div>
      </div>

      {/* Sequential Navigation Flow Bar (1 -> 2 -> 3) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = activeTab === step.id;
          return (
            <button
              key={step.id}
              onClick={() => setActiveTab(step.id)}
              className="glass-panel"
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-glass)',
                background: isActive ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.18) 0%, rgba(6, 182, 212, 0.08) 100%)' : 'var(--bg-card)',
                boxShadow: isActive ? '0 0 20px rgba(99, 102, 241, 0.25)' : 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s ease',
                position: 'relative'
              }}
            >
              <div style={{
                padding: '10px',
                borderRadius: '10px',
                background: isActive ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)',
                color: isActive ? '#ffffff' : '#9ca3af',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icon size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isActive ? '#ffffff' : '#d1d5db' }}>
                  {step.label}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '2px' }}>
                  {step.subtitle}
                </div>
              </div>
              {idx < steps.length - 1 && (
                <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.2)', fontWeight: 'bold' }}>
                  ➔
                </div>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
}
