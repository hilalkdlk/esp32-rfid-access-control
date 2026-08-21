import React, { useState } from 'react';
import { DoorOpen, PlusCircle, Edit3, CheckCircle2, ShieldCheck, Sparkles, Cpu, Wifi, FileText, Hash, AlertCircle, Trash2, Save } from 'lucide-react';

export default function AddGateScreen({ gates = [], devices = [], onAddGate, onUpdateGate, onDeleteGate, onAssignDeviceGate, onNavigateToAddCard }) {
  // Editing State (null = Add mode, string = Edit mode)
  const [editingGateId, setEditingGateId] = useState(null);
  
  // Form Fields (Clean & Essential + ESP32 Hardware Selection)
  const [gateName, setGateName] = useState('');
  const [gateCode, setGateCode] = useState('');
  const [description, setDescription] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const safeGates = Array.isArray(gates) ? gates : [];
  const safeDevices = Array.isArray(devices) ? devices : [];

  const handleStartEdit = (gate) => {
    setEditingGateId(gate.id);
    setGateName(gate.name || '');
    setGateCode(gate.gateCode || '');
    setDescription(gate.description || '');
    setIpAddress(gate.ipAddress || '');

    // Find if an ESP32 device is currently assigned to this gate
    const matchedDev = safeDevices.find(d => d.assignedGate === gate.name || d.assignedGate === gate.id);
    setSelectedDeviceId(matchedDev ? (matchedDev.deviceId || matchedDev.id) : '');
    setErrorMsg('');
  };

  const handleCancelEdit = () => {
    setEditingGateId(null);
    setGateName('');
    setGateCode('');
    setDescription('');
    setIpAddress('');
    setSelectedDeviceId('');
    setErrorMsg('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!gateName.trim()) {
      setErrorMsg('Lütfen geçerli bir Kapı Adı giriniz.');
      return;
    }

    setErrorMsg('');

    const gateData = {
      name: gateName.trim(),
      gateCode: gateCode.trim() || `KAPI-0${safeGates.length + 1}`,
      description: description.trim(),
      ipAddress: ipAddress.trim() || '10.130.0.52'
    };

    if (editingGateId) {
      // UPDATE MODE
      onUpdateGate(editingGateId, gateData);
    } else {
      // ADD MODE
      onAddGate(gateData);
    }

    // If an ESP32 hardware device was selected from the dropdown, pair it!
    if (selectedDeviceId && onAssignDeviceGate) {
      onAssignDeviceGate(selectedDeviceId, gateName.trim());
    }

    handleCancelEdit();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      
      {/* 🚀 BANNER */}
      <div className="glass-panel" style={{ padding: '20px 24px', background: '#162038', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#ffffff', borderRadius: '12px', display: 'flex', boxShadow: '0 0 16px rgba(56, 189, 248, 0.4)' }}>
            <DoorOpen size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.2px' }}>
              Kapı Yönetimi ve ESP32 Donanım Eşleştirme
            </h1>
            <p style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '3px' }}>
              Yeni kapı ekleyin, ağdaki ESP32 kartıyla eşleştirin. Kapılar <strong>Kart Ekleme</strong> ekranındaki izinlerde anında görünür.
            </p>
          </div>
        </div>

        {onNavigateToAddCard && (
          <button
            onClick={onNavigateToAddCard}
            className="btn btn-primary"
            style={{ padding: '10px 18px', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 0 16px rgba(56, 189, 248, 0.4)' }}
          >
            <Sparkles size={16} /> Kart Ekleme Ekranına Git
          </button>
        )}
      </div>

      {/* 🏬 MAIN 2-COLUMN GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        
        {/* 👈 SOL PANEL: FORM (Yeni Kapı Tanımlama / Düzenleme + ESP32 Seçimi) */}
        <div className="glass-panel" style={{ padding: '24px', background: '#162038', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            {/* Form Header */}
            <div style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {editingGateId ? (
                  <>
                    <Edit3 size={20} color="#f59e0b" />
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>Kapı Bilgilerini Düzenle</h2>
                  </>
                ) : (
                  <>
                    <PlusCircle size={20} color="#38bdf8" />
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>Yeni Kapı Tanımlama</h2>
                  </>
                )}
              </div>

              {editingGateId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.78rem', padding: '4px 10px', background: 'rgba(255,255,255,0.08)', borderColor: '#475569' }}
                >
                  ✕ İptal
                </button>
              )}
            </div>

            {/* Edit Banner */}
            {editingGateId && (
              <div style={{ padding: '10px 14px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: '8px', color: '#fbbf24', fontSize: '0.84rem', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={16} />
                <span>✏️ <strong>'{gateName}'</strong> kapısını düzenliyorsunuz.</span>
              </div>
            )}

            {/* Validation Error Alert */}
            {errorMsg && (
              <div style={{ padding: '10px 14px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: '8px', color: '#fb7185', fontSize: '0.84rem', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form Fields */}
            <form id="gateForm" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* 1. Kapı Adı */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Kapı Adı <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <DoorOpen size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="text"
                    placeholder="Örn: AR-GE Laboratuvar Kapısı"
                    value={gateName}
                    onChange={(e) => setGateName(e.target.value)}
                    required
                    className="form-input"
                    style={{ paddingLeft: '38px', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              {/* 2. Bağlı ESP32 Donanımı Seçimi */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Bağlı ESP32 Donanımı (Kablosuz Sync)
                </label>
                <div style={{ position: 'relative' }}>
                  <Cpu size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#38bdf8', zIndex: 1 }} />
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => {
                      setSelectedDeviceId(e.target.value);
                      const chosenDev = safeDevices.find(d => (d.deviceId || d.id) === e.target.value);
                      if (chosenDev && chosenDev.ipAddress) {
                        setIpAddress(chosenDev.ipAddress);
                      }
                    }}
                    className="form-select"
                    style={{ width: '100%', paddingLeft: '38px', fontSize: '0.88rem', background: '#0b1329', borderColor: '#38bdf8', color: '#ffffff' }}
                  >
                    <option value="">-- Donanım Seçin --</option>
                    {safeDevices.map(dev => (
                      <option key={dev.id || dev.deviceId} value={dev.deviceId || dev.id}>
                        📡 {dev.deviceId || dev.id} ({dev.ipAddress || 'IP Alınamadı'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Kapı Kodu & Statik IP */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Kapı Kodu
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Hash size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input
                      type="text"
                      placeholder="Örn: KAPI-01"
                      value={gateCode}
                      onChange={(e) => setGateCode(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: '38px', fontSize: '0.9rem', fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Statik IP Adresi
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Wifi size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input
                      type="text"
                      placeholder="Örn: 10.40.80.221"
                      value={ipAddress}
                      onChange={(e) => setIpAddress(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: '38px', fontSize: '0.9rem', fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                </div>
              </div>

              {/* 4. Açıklama / Konum */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Açıklama / Konum
                </label>
                <div style={{ position: 'relative' }}>
                  <FileText size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="text"
                    placeholder="Örn: AR-GE ve Yazılım Laboratuvarı kapısı"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '38px', fontSize: '0.9rem' }}
                  />
                </div>
              </div>
            </form>
          </div>

          {/* Form Actions */}
          <div style={{ marginTop: '20px' }}>
            {editingGateId ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px' }}>
                <button
                  type="submit"
                  form="gateForm"
                  className="btn"
                  style={{
                    padding: '12px',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 0 16px rgba(217, 119, 6, 0.4)'
                  }}
                >
                  <Save size={18} /> Değişiklikleri Kaydet
                </button>

                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn btn-secondary"
                  style={{ padding: '12px 18px', fontSize: '0.9rem', fontWeight: 600 }}
                >
                  İptal
                </button>
              </div>
            ) : (
              <button
                type="submit"
                form="gateForm"
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  borderRadius: '8px',
                  boxShadow: '0 0 16px rgba(56, 189, 248, 0.4)'
                }}
              >
                <PlusCircle size={18} /> Kapıyı Sisteme Ekle
              </button>
            )}
          </div>
        </div>

        {/* 👉 SAĞ PANEL: MEVCUT KAPILAR LİSTESİ VE ESP32 BAĞLANTISI */}
        <div className="glass-panel" style={{ padding: '24px', background: '#162038' }}>
          
          {/* Header */}
          <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={20} color="#38bdf8" />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>Mevcut Kapı Listesi ve Donanım Eşleşmeleri</h2>
            </div>

            <span className="badge badge-active" style={{ fontSize: '0.78rem', padding: '4px 10px', background: '#0b1329', border: '1px solid #293859', color: '#38bdf8' }}>
              {safeGates.length} Kayıtlı Kapı
            </span>
          </div>

          {/* Gate Cards Stack */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {safeGates.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', background: '#0b1329', borderRadius: '10px', border: '1px dashed #293859' }}>
                Kayıtlı kapı bulunamadı. Soldaki formdan yeni kapı tanımlayabilirsiniz.
              </div>
            ) : (
              safeGates.map(gate => {
                const isSelected = editingGateId === gate.id;
                const matchedDevice = safeDevices.find(d => d.assignedGate === gate.name || d.assignedGate === gate.id);
                const displayIp = (matchedDevice && matchedDevice.ipAddress) ? matchedDevice.ipAddress : (gate.ipAddress || '10.130.0.52');

                return (
                  <div
                    key={gate.id}
                    className="glass-panel"
                    style={{
                      padding: '16px 18px',
                      background: isSelected ? 'rgba(245, 158, 11, 0.08)' : '#0b1329',
                      border: `1px solid ${isSelected ? '#f59e0b' : '#293859'}`,
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      boxShadow: isSelected ? '0 0 16px rgba(245, 158, 11, 0.3)' : 'none',
                      transition: 'all 0.25s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      {/* Icon Box */}
                      <div style={{
                        padding: '12px',
                        background: 'rgba(56, 189, 248, 0.12)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        borderRadius: '10px',
                        color: '#38bdf8',
                        display: 'flex'
                      }}>
                        <DoorOpen size={22} />
                      </div>

                      {/* Content Info */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#ffffff' }}>
                            {gate.name}
                          </h4>

                          {/* BAĞLI ESP32 DONANIM ROZETİ */}
                          {matchedDevice ? (
                            <span style={{ fontSize: '0.72rem', padding: '3px 9px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.18)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.35)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Cpu size={12} /> Bağlı Donanım: <strong>{matchedDevice.deviceId || matchedDevice.id}</strong>
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.72rem', padding: '3px 9px', borderRadius: '6px', background: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', border: '1px solid #334155', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Cpu size={12} /> Donanım Atanmadı
                            </span>
                          )}
                        </div>

                        {/* Detay Bilgi Satırı */}
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                          Kod: <strong style={{ color: '#cbd5e1', fontFamily: 'var(--font-mono)' }}>{gate.gateCode || 'KAPI-XX'}</strong>
                          {displayIp && ` • IP: ${displayIp}`}
                          {gate.description && ` • ${gate.description}`}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(gate)}
                        className="btn btn-secondary btn-sm"
                        title="Düzenle ve Donanım Eşleştir"
                        style={{
                          padding: '8px 12px',
                          borderColor: isSelected ? '#f59e0b' : '#293859',
                          color: isSelected ? '#f59e0b' : '#38bdf8',
                          background: isSelected ? 'rgba(245, 158, 11, 0.2)' : 'rgba(56, 189, 248, 0.1)'
                        }}
                      >
                        <Edit3 size={15} /> Düzenle
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteGate(gate.id)}
                        className="btn btn-danger btn-sm"
                        title="Sil"
                        style={{ padding: '8px 10px', background: 'rgba(244, 63, 94, 0.1)', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
