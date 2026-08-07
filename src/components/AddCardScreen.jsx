import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { RefreshCw, ArrowRight, Sparkles, AlertCircle, CheckCircle2, PlusCircle, ShieldCheck, DoorClosed, GraduationCap, Briefcase } from 'lucide-react';
import { DEPARTMENTS, FACULTIES, STUDENT_DEPARTMENTS, GATES } from '../data/initialData';

export default function AddCardScreen({ onAddCard, onNavigateToLogs }) {
  // Card Type Selector: 'Öğrenci' | 'Personel' (Default: Öğrenci)
  const [cardType, setCardType] = useState('Öğrenci');

  const [uid, setUid] = useState('E4 9A 12 77');
  const [holderName, setHolderName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  
  // Student Specific Fields
  const [faculty, setFaculty] = useState(FACULTIES[0]);
  const [studentDepartment, setStudentDepartment] = useState(STUDENT_DEPARTMENTS[0]);
  
  // Staff Specific Fields
  const [staffDepartment, setStaffDepartment] = useState(DEPARTMENTS[0]);

  // Multi-select gates state
  const ALL_PERMISSIONS = ["Tüm Kapılar / Yönetici", ...GATES];
  const [selectedGates, setSelectedGates] = useState(["Ana Giriş Turnikesi"]);

  const [expiryDate, setExpiryDate] = useState('2026-12-31');
  const [status, setStatus] = useState('Aktif');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const generateRandomUID = () => {
    const hex = () => Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2, '0');
    setUid(`${hex()} ${hex()} ${hex()} ${hex()}`);
  };

  const toggleGatePermission = (gateName) => {
    if (gateName === "Tüm Kapılar / Yönetici") {
      if (selectedGates.includes("Tüm Kapılar / Yönetici")) {
        setSelectedGates(["Ana Giriş Turnikesi"]);
      } else {
        setSelectedGates(["Tüm Kapılar / Yönetici"]);
      }
      return;
    }

    let updated = selectedGates.filter(g => g !== "Tüm Kapılar / Yönetici");
    if (updated.includes(gateName)) {
      updated = updated.filter(g => g !== gateName);
    } else {
      updated.push(gateName);
    }

    if (updated.length === 0) {
      updated = ["Ana Giriş Turnikesi"];
    }
    setSelectedGates(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!holderName.trim()) {
      setErrorMsg('Lütfen kart sahibinin adını ve soyadını giriniz.');
      return;
    }
    if (!employeeId.trim()) {
      setErrorMsg(cardType === 'Öğrenci' ? 'Lütfen öğrenci numarasını giriniz.' : 'Lütfen Sicil / T.C. No bilgisini giriniz.');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);

    const formattedAccessLevel = selectedGates.includes("Tüm Kapılar / Yönetici")
      ? "Tüm Kapılar / Yönetici"
      : selectedGates.join(", ");

    const departmentValue = cardType === 'Öğrenci' ? studentDepartment : staffDepartment;

    const newCard = {
      id: `card-${Date.now()}`,
      uid,
      holderName,
      cardType, // 'Öğrenci' veya 'Personel'
      employeeId,
      faculty: cardType === 'Öğrenci' ? faculty : 'N/A',
      department: departmentValue,
      accessLevel: formattedAccessLevel,
      allowedGates: selectedGates,
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
      {/* Left Column: Form */}
      <div className="glass-panel" style={{ padding: '24px', background: '#162038' }}>
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#ffffff', borderRadius: '10px', display: 'flex' }}>
            <Sparkles size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>Yeni RFID Kart Tanımlama</h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Öğrenci veya Personel kartı oluşturun.</p>
          </div>
        </div>

        {/* Card Type Selector (Primary Sky Cyan / Ocean Blue Theme) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => setCardType('Öğrenci')}
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              border: `2px solid ${cardType === 'Öğrenci' ? '#38bdf8' : '#293859'}`,
              background: cardType === 'Öğrenci' ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(2, 132, 199, 0.3) 100%)' : '#0b1329',
              color: cardType === 'Öğrenci' ? '#ffffff' : '#94a3b8',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: cardType === 'Öğrenci' ? '0 0 18px rgba(56, 189, 248, 0.35)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <GraduationCap size={18} color={cardType === 'Öğrenci' ? '#38bdf8' : '#64748b'} />
            🎓 Öğrenci Kaydı
          </button>

          <button
            type="button"
            onClick={() => setCardType('Personel')}
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              border: `2px solid ${cardType === 'Personel' ? '#38bdf8' : '#293859'}`,
              background: cardType === 'Personel' ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(2, 132, 199, 0.3) 100%)' : '#0b1329',
              color: cardType === 'Personel' ? '#ffffff' : '#94a3b8',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: cardType === 'Personel' ? '0 0 18px rgba(56, 189, 248, 0.35)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Briefcase size={18} color={cardType === 'Personel' ? '#38bdf8' : '#64748b'} />
            💼 Personel Kaydı
          </button>
        </div>

        {errorMsg && (
          <div style={{ padding: '12px 16px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '8px', color: '#f87171', fontSize: '0.84rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Card UID */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>RFID Card UID Numarası</span>
              <button 
                type="button" 
                onClick={generateRandomUID}
                style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <RefreshCw size={13} /> Rastgele Üret
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
              placeholder={cardType === 'Öğrenci' ? 'Örn: Zeynep Çelik' : 'Örn: Ahmet Yılmaz'}
              required
            />
          </div>

          {/* Conditional Form Fields Based on Card Type */}
          {cardType === 'Öğrenci' ? (
            <>
              {/* Student No & Faculty */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Öğrenci Numarası</label>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="form-input form-input-mono"
                    placeholder="2026010402"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Fakülte</label>
                  <select
                    value={faculty}
                    onChange={(e) => setFaculty(e.target.value)}
                    className="form-select"
                  >
                    {FACULTIES.map(fac => (
                      <option key={fac} value={fac}>{fac}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Student Department */}
              <div className="form-group">
                <label className="form-label">Bölüm</label>
                <select
                  value={studentDepartment}
                  onChange={(e) => setStudentDepartment(e.target.value)}
                  className="form-select"
                >
                  {STUDENT_DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              {/* Staff Employee ID & Department */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Sicil / T.C. No</label>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="form-input form-input-mono"
                    placeholder="EMP-2026-104"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Birim / Departman</label>
                  <select
                    value={staffDepartment}
                    onChange={(e) => setStaffDepartment(e.target.value)}
                    className="form-select"
                  >
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Multi-Select Gate Access Pills Matrix (Primary Sky Cyan Palette) */}
          <div className="form-group" style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label className="form-label" style={{ margin: 0 }}>
                Erişim İzni Verilen Kapılar (Çoklu Seçim):
              </label>
              <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 600 }}>
                {selectedGates.includes("Tüm Kapılar / Yönetici") ? "Tüm Kapılar Açık" : `${selectedGates.length} Kapı Seçili`}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
              {ALL_PERMISSIONS.map(gateName => {
                const isSelected = selectedGates.includes(gateName);
                const isAllGates = gateName === "Tüm Kapılar / Yönetici";

                return (
                  <div
                    key={gateName}
                    onClick={() => toggleGatePermission(gateName)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      background: isSelected 
                        ? (isAllGates ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)')
                        : '#0b1329',
                      border: `1px solid ${isSelected ? (isAllGates ? '#34d399' : '#38bdf8') : '#293859'}`,
                      color: isSelected ? '#ffffff' : '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: isSelected ? 700 : 500,
                      boxShadow: isSelected ? (isAllGates ? '0 4px 12px rgba(16, 185, 129, 0.3)' : '0 4px 12px rgba(56, 189, 248, 0.35)') : 'none',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      userSelect: 'none'
                    }}
                  >
                    {isSelected ? (
                      <CheckCircle2 size={15} style={{ flexShrink: 0, color: isAllGates ? '#a7f3d0' : '#7dd3fc' }} />
                    ) : (
                      <PlusCircle size={15} style={{ flexShrink: 0, color: '#64748b' }} />
                    )}
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {gateName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '16px', fontSize: '0.92rem' }}
          >
            {isSubmitting ? 'Kaydediliyor...' : `${cardType} Kartını Kaydet & ESP32'ye Gönder`}
          </button>
        </form>
      </div>

      {/* Right Column: Live Preview */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="glass-panel" style={{ padding: '24px', background: '#162038', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginBottom: '16px', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} color="#38bdf8" /> Canlı Dijital RFID Kart Önizlemesi
          </h3>

          <div className="nfc-card-container" style={{ width: '100%' }}>
            <div className="nfc-card-preview" style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #0369a1 50%, #0284c7 100%)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="nfc-chip"></div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '1px', color: '#7dd3fc' }}>
                  {cardType === 'Öğrenci' ? '🎓 ÖĞRENCİ KARTI' : '💼 PERSONEL KARTI'}
                </span>
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
                    {cardType === 'Öğrenci' ? `${studentDepartment} • NO: ${employeeId || '20260000'}` : `${staffDepartment} • NO: ${employeeId || 'EMP-000'}`}
                  </div>
                  {cardType === 'Öğrenci' && (
                    <div style={{ fontSize: '0.68rem', color: '#e0f2fe', opacity: 0.9 }}>
                      {faculty}
                    </div>
                  )}
                  <div style={{ fontSize: '0.7rem', color: '#7dd3fc', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <DoorClosed size={12} /> {selectedGates.includes("Tüm Kapılar / Yönetici") ? "Tüm Kapılar Açık" : `${selectedGates.length} Kapı İzinli`}
                  </div>
                </div>
                <span style={{ padding: '3px 10px', background: 'rgba(255,255,255,0.2)', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700 }}>
                  {status}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px', background: '#162038', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f8fafc' }}>Giriş-Çıkış Logları</div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Turnikede kart okutma simülatörü</div>
          </div>
          <button onClick={onNavigateToLogs} className="btn btn-secondary btn-sm">
            3. Adıma Git <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
