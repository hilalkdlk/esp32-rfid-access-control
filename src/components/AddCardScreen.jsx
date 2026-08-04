import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Cpu, RefreshCw, CheckCircle2, ArrowRight, Shield, Sparkles, User, AlertCircle } from 'lucide-react';
import { DEPARTMENTS, ACCESS_LEVELS } from '../data/initialData';

export default function AddCardScreen({ onAddCard, onNavigateToLogs }) {
  const [uid, setUid] = useState('E4 9A 12 77');
  const [holderName, setHolderName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [accessLevel, setAccessLevel] = useState(ACCESS_LEVELS[0]);
  const [expiryDate, setExpiryDate] = useState('2026-12-31');
  const [status, setStatus] = useState('Aktif');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const generateRandomUID = () => {
    const hex = () => Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2, '0');
    setUid(`${hex()} ${hex()} ${hex()} ${hex()}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!holderName.trim()) {
      setErrorMsg('Lütfen kart sahibinin adını ve soyadını giriniz.');
      return;
    }
    if (!employeeId.trim()) {
      setErrorMsg('Lütfen Sicil / T.C. No bilgisini giriniz.');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);

    const newCard = {
      id: `card-${Date.now()}`,
      uid,
      holderName,
      employeeId,
      department,
      accessLevel,
      status,
      issueDate: new Date().toISOString().split('T')[0],
      expiryDate,
      syncedToESP32: true,
      lastAccess: 'Henüz Geçiş Yapılmadı'
    };

    setTimeout(() => {
      onAddCard(newCard);
      setIsSubmitting(false);

      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } catch (err) {
        console.log(err);
      }
    }, 400);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
      {/* Left Column: Form */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ padding: '8px', background: '#e0e7ff', color: '#4f46e5', borderRadius: '8px' }}>
            <Sparkles size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Yeni RFID Kart Kaydı</h2>
            <p style={{ fontSize: '0.78rem', color: '#64748b' }}>ESP32 LittleFS cards.json yetkili listesine ekleyin.</p>
          </div>
        </div>

        {errorMsg && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#dc2626', fontSize: '0.82rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Card UID */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>RFID Card UID</span>
              <button 
                type="button" 
                onClick={generateRandomUID}
                style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <RefreshCw size={12} /> Otomatik UID Üret
              </button>
            </label>
            <input
              type="text"
              value={uid}
              onChange={(e) => setUid(e.target.value.toUpperCase())}
              className="form-input form-input-mono"
              placeholder="Örn: A3 8F 42 C1"
              required
            />
          </div>

          {/* Holder Name */}
          <div className="form-group">
            <label className="form-label">Kart Sahibi Ad Soyad</label>
            <input
              type="text"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              className="form-input"
              placeholder="Örn: Mehmet Yılmaz"
              required
            />
          </div>

          {/* Employee ID */}
          <div className="form-group">
            <label className="form-label">Sicil / T.C. No</label>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="form-input form-input-mono"
              placeholder="Örn: EMP-2026-104"
              required
            />
          </div>

          {/* Department & Access Level */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">Birim</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="form-select"
              >
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Erişim Yetkisi</label>
              <select
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value)}
                className="form-select"
              >
                {ACCESS_LEVELS.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '10px' }}
          >
            {isSubmitting ? 'Kaydediliyor...' : 'Kartı Kaydet & ESP32\'ye Gönder'}
          </button>
        </form>
      </div>

      {/* Right Column: Live Preview */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '14px', alignSelf: 'flex-start' }}>
            Canlı Dijital RFID Kart Önizlemesi
          </h3>

          <div className="nfc-card-container" style={{ width: '100%' }}>
            <div className="nfc-card-preview">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="nfc-chip"></div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '1px', color: '#a5b4fc' }}>NFC RFID CARD</span>
              </div>

              <div>
                <div style={{ fontSize: '0.65rem', color: '#cbd5e1', textTransform: 'uppercase' }}>RFID UID</div>
                <div className="form-input-mono" style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '2px' }}>
                  {uid || '00 00 00 00'}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                    {holderName.trim() || 'KART SAHİBİ AD SOYAD'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                    {department} • {employeeId || 'ID NO'}
                  </div>
                </div>
                <span style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.2)', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700 }}>
                  {status}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Giriş-Çıkış Logları</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Turnikede kart okutma simülatörü</div>
          </div>
          <button onClick={onNavigateToLogs} className="btn btn-secondary btn-sm">
            3. Adıma Git <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
