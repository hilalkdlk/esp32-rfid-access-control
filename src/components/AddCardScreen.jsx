import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Cpu, RefreshCw, CheckCircle2, ArrowRight, Shield, Sparkles, User, Building, Calendar, Key, AlertCircle } from 'lucide-react';
import { DEPARTMENTS, ACCESS_LEVELS } from '../data/initialData';

export default function AddCardScreen({ onAddCard, onNavigateToLogs, onNavigateToList }) {
  const [uid, setUid] = useState('E4 9A 12 77');
  const [holderName, setHolderName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [accessLevel, setAccessLevel] = useState(ACCESS_LEVELS[0]);
  const [expiryDate, setExpiryDate] = useState('2026-12-31');
  const [status, setStatus] = useState('Aktif');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Random RFID UID Generator
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

      // Launch celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (err) {
        console.log(err);
      }
    }, 600);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
      {/* Left Column: Form */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', borderRadius: '10px' }}>
            <Sparkles size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Yeni RFID Kart Tanımla</h2>
            <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>ESP32 MFRC522 Okuyucu ve LittleFS cards.json için yetkili kart oluşturun.</p>
          </div>
        </div>

        {errorMsg && (
          <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#f87171', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Card UID */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>RFID Card UID (Seri No)</span>
              <button 
                type="button" 
                onClick={generateRandomUID}
                style={{ background: 'none', border: 'none', color: '#06b6d4', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
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
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                className="form-input"
                placeholder="Örn: Mehmet Yılmaz"
                style={{ paddingLeft: '42px' }}
                required
              />
            </div>
          </div>

          {/* Employee ID / TC */}
          <div className="form-group">
            <label className="form-label">Sicil / T.C. Kimlik No</label>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Birim / Departman</label>
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

          {/* Expiry Date & Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Son Kullanma Tarihi</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Kart Durumu</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="form-select"
              >
                <option value="Aktif">Aktif (Geçiş Yetkili)</option>
                <option value="Engelli">Engelli (Geçiş Yasaklı)</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{ flex: 1, padding: '14px' }}
            >
              {isSubmitting ? (
                <> <RefreshCw size={18} className="animate-spin" /> Kaydediliyor... </>
              ) : (
                <> <CheckCircle2 size={18} /> Kartı Kaydet & ESP32'ye Gönder </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Right Column: Live Visual Card Preview */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ alignSelf: 'flex-start', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f3f4f6' }}>Canlı Dijital RFID Kart Önizlemesi</h3>
            <p style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Form doldurulurken anlık değişen 3D akıllı kart görünümü.</p>
          </div>

          {/* Glassmorphic 3D Visual Card */}
          <div className="nfc-card-container" style={{ width: '100%' }}>
            <div className="nfc-card-preview">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="nfc-chip"></div>
                  <Cpu size={20} color="rgba(255, 255, 255, 0.4)" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Shield size={16} color="#6366f1" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '1px', color: '#818cf8' }}>SECURE ACCESS</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', letterSpacing: '1px', textTransform: 'uppercase' }}>RFID CARD UID</div>
                <div className="form-input-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', letterSpacing: '2px' }}>
                  {uid || '00 00 00 00'}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                    {holderName.trim() || 'KART SAHİBİ AD SOYAD'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    {department} • {employeeId || 'ID NO'}
                  </div>
                </div>
                <span className={status === 'Aktif' ? 'badge badge-active' : 'badge badge-blocked'}>
                  {status}
                </span>
              </div>
            </div>
          </div>

          {/* ESP32 LittleFS Sync Note */}
          <div style={{ marginTop: '24px', width: '100%', padding: '14px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '12px', fontSize: '0.8rem', color: '#cbd5e1' }}>
            <div style={{ fontWeight: 700, color: '#818cf8', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={14} /> ESP32 Bellek Senkronizasyonu
            </div>
            Bu kart oluşturulduğunda API üzerinden Firestore'a kaydedilir ve ESP32'nin dahili <strong>cards.json</strong> dosyasına senkronize edilir.
          </div>
        </div>

        {/* Step Flow Action Card */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Sonraki Adım: Giriş-Çıkış Logları</div>
            <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Turnike okutma simülasyonunu çalıştırın.</div>
          </div>
          <button onClick={onNavigateToLogs} className="btn btn-secondary btn-sm">
            3. Adıma Git <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
