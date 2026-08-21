import React, { useState } from 'react';
import { Search, Plus, ShieldCheck, ShieldAlert, Trash2, Zap, UserCheck, CreditCard, GraduationCap, Briefcase, Edit3, X, CheckCircle2, PlusCircle, AlertCircle } from 'lucide-react';
import { DEPARTMENTS, FACULTIES, STUDENT_DEPARTMENTS, GATES } from '../data/initialData';

export default function CardListScreen({ cards = [], gates = [], onUpdateCard, onToggleCardStatus, onDeleteCard, onNavigateToAdd, onSimulateCard }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');

  // Edit Modal State
  const [editingCard, setEditingCard] = useState(null);
  const [editHolderName, setEditHolderName] = useState('');
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [editCardType, setEditCardType] = useState('Öğrenci');
  const [editFaculty, setEditFaculty] = useState(FACULTIES[0]);
  const [editDepartment, setEditDepartment] = useState(STUDENT_DEPARTMENTS[0]);
  const [editGates, setEditGates] = useState(["Ana Giriş Turnikesi"]);
  const [editStatus, setEditStatus] = useState('Aktif');
  const [editError, setEditError] = useState('');

  const safeGates = Array.isArray(gates) && gates.length > 0 ? gates.map(g => g.name || g) : [];
  const ALL_PERMISSIONS = ["Tüm Kapılar / Yönetici", ...safeGates];
  const safeCards = Array.isArray(cards) ? cards : [];

  const filteredCards = safeCards.filter(card => {
    if (!card) return false;
    const matchesSearch = (card.holderName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (card.employeeId || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'ALL' || card.cardType === selectedType;
    return matchesSearch && matchesType;
  });

  const activeCount = safeCards.filter(c => c && c.status === 'Aktif').length;
  const blockedCount = safeCards.filter(c => c && c.status === 'Engelli').length;
  const studentCount = safeCards.filter(c => c && c.cardType === 'Öğrenci').length;
  const staffCount = safeCards.filter(c => c && (c.cardType === 'Personel' || !c.cardType)).length;

  const openEditModal = (card) => {
    setEditingCard(card);
    setEditHolderName(card.holderName || '');
    setEditEmployeeId(card.employeeId || '');
    setEditCardType(card.cardType || 'Personel');
    setEditFaculty(card.faculty || FACULTIES[0]);
    setEditDepartment(card.department || DEPARTMENTS[0]);
    
    let gatesArr = card.allowedGates;
    if (typeof gatesArr === 'string') {
      gatesArr = [gatesArr];
    }
    if (!Array.isArray(gatesArr) || gatesArr.length === 0) {
      gatesArr = ["Ana Giriş Turnikesi"];
    }
    setEditGates(gatesArr);
    setEditStatus(card.status || 'Aktif');
    setEditError('');
  };

  const toggleEditGatePermission = (gateName) => {
    if (gateName === "Tüm Kapılar / Yönetici") {
      if (editGates.includes("Tüm Kapılar / Yönetici")) {
        setEditGates(["Ana Giriş Turnikesi"]);
      } else {
        setEditGates(["Tüm Kapılar / Yönetici"]);
      }
      return;
    }

    let updated = editGates.filter(g => g !== "Tüm Kapılar / Yönetici");
    if (updated.includes(gateName)) {
      updated = updated.filter(g => g !== gateName);
    } else {
      updated.push(gateName);
    }

    if (updated.length === 0) {
      updated = ["Ana Giriş Turnikesi"];
    }
    setEditGates(updated);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editHolderName.trim() || editHolderName.trim().length < 3) {
      setEditError('Kart sahibi adı soyadı en az 3 karakter olmalıdır.');
      return;
    }

    if (editCardType === 'Öğrenci') {
      const digitsOnly = editEmployeeId.replace(/\D/g, '');
      if (digitsOnly.length !== 10 || editEmployeeId.length !== 10) {
        setEditError('Öğrenci numarası TAM 10 HANELİ rakamdan oluşmalıdır.');
        return;
      }
    } else {
      if (!editEmployeeId.trim() || editEmployeeId.trim().length < 4) {
        setEditError('Personel Sicil / T.C. numarası en az 4 karakter olmalıdır.');
        return;
      }
    }

    const formattedAccessLevel = editGates.includes("Tüm Kapılar / Yönetici")
      ? "Tüm Kapılar / Yönetici"
      : editGates.join(", ");

    const updatedCard = {
      holderName: editHolderName.trim(),
      cardType: editCardType,
      employeeId: editEmployeeId.trim(),
      faculty: editCardType === 'Öğrenci' ? editFaculty : 'N/A',
      department: editDepartment,
      accessLevel: formattedAccessLevel,
      allowedGates: editGates,
      status: editStatus
    };

    onUpdateCard(editingCard.id, updatedCard);
    setEditingCard(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Glowing Info Metric Cards Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
        {/* Total Cards Glow Card */}
        <div className="glass-panel glow-card-cyan" style={{ padding: '22px 24px', minHeight: '96px', display: 'flex', alignItems: 'center', gap: '18px', background: '#162038' }}>
          <div style={{ padding: '12px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', borderRadius: '12px', boxShadow: '0 0 14px rgba(56, 189, 248, 0.3)' }}>
            <CreditCard size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>Toplam Kayıtlı Kullanıcı</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
              {cards.length} <span style={{ fontSize: '0.8rem', color: '#7dd3fc', fontWeight: 500 }}>({studentCount} Öğrenci / {staffCount} Personel)</span>
            </div>
          </div>
        </div>

        {/* Active Cards Glow Card */}
        <div className="glass-panel glow-card-emerald" style={{ padding: '22px 24px', minHeight: '96px', display: 'flex', alignItems: 'center', gap: '18px', background: '#162038' }}>
          <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', borderRadius: '12px', boxShadow: '0 0 14px rgba(16, 185, 129, 0.3)' }}>
            <UserCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>Aktif Kullanıcılar</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>{activeCount}</div>
          </div>
        </div>

        {/* Blocked Cards Glow Card */}
        <div className="glass-panel glow-card-rose" style={{ padding: '22px 24px', minHeight: '96px', display: 'flex', alignItems: 'center', gap: '18px', background: '#162038' }}>
          <div style={{ padding: '12px', background: 'rgba(244, 63, 94, 0.2)', color: '#fb7185', borderRadius: '12px', boxShadow: '0 0 14px rgba(244, 63, 94, 0.3)' }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>Engelli Kullanıcılar</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fb7185', marginTop: '2px' }}>{blockedCount}</div>
          </div>
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="glass-panel" style={{ padding: '24px', background: '#162038' }}>
        {/* Header Title & Controls Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>Sistemdeki Kayıtlı Kullanıcılar</h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>Kullanıcı isimlerine göre yetkileri yönetin ve düzenleyin.</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '240px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1' }} />
              <input
                type="text"
                placeholder="İsim veya No ile Ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '38px', fontSize: '0.88rem' }}
              />
            </div>

            <select 
              value={selectedType} 
              onChange={(e) => setSelectedType(e.target.value)}
              className="form-select"
              style={{ width: 'auto', padding: '9px 14px', fontSize: '0.88rem' }}
            >
              <option value="ALL">Tüm Türler</option>
              <option value="Öğrenci">Öğrenciler</option>
              <option value="Personel">Personeller</option>
            </select>

            <button onClick={onNavigateToAdd} className="btn btn-primary" style={{ padding: '9px 18px', fontSize: '0.88rem' }}>
              <Plus size={16} /> Yeni Kayıt Ekle (Adım 2)
            </button>
          </div>
        </div>

        {/* Table - Omit UID Column Completely */}
        <table className="custom-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Kart Sahibi Ad Soyad</th>
              <th>Tür</th>
              <th>Öğrenci / Sicil No</th>
              <th>Fakülte / Birim & Bölüm</th>
              <th>İzinli Kapılar</th>
              <th>Durum</th>
              <th style={{ textAlign: 'right' }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {filteredCards.length > 0 ? (
              filteredCards.map((card, idx) => {
                if (!card) return null;
                const cardKey = card.id || card.uid || `card-key-${idx}`;
                return (
                  <tr key={cardKey}>
                    <td style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.94rem' }}>
                      {card.holderName || 'Tanımsız Kullanıcı'}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        background: card.cardType === 'Öğrenci' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(2, 132, 199, 0.2)',
                        color: card.cardType === 'Öğrenci' ? '#7dd3fc' : '#38bdf8',
                        border: `1px solid ${card.cardType === 'Öğrenci' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(2, 132, 199, 0.4)'}`
                      }}>
                        {card.cardType === 'Öğrenci' ? <GraduationCap size={13} /> : <Briefcase size={13} />}
                        {card.cardType || 'Personel'}
                      </span>
                    </td>
                    <td style={{ color: '#cbd5e1', fontSize: '0.84rem', fontFamily: 'var(--font-mono)' }}>{card.employeeId || '-'}</td>
                    <td style={{ fontSize: '0.84rem', color: '#e2e8f0' }}>
                      {card.cardType === 'Öğrenci' && card.faculty && card.faculty !== 'N/A' ? (
                        <div>
                          <div style={{ fontWeight: 600, color: '#f8fafc' }}>{card.faculty}</div>
                          <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>{card.department || '-'}</div>
                        </div>
                      ) : (
                        card.department || card.faculty || '-'
                      )}
                    </td>
                    <td style={{ fontSize: '0.84rem', color: '#7dd3fc', fontWeight: 600 }}>
                      {Array.isArray(card.allowedGates) ? card.allowedGates.join(', ') : (card.accessLevel || 'Ana Giriş Turnikesi')}
                    </td>
                    <td>
                      <span className={card.status === 'Aktif' ? 'badge badge-active' : 'badge badge-blocked'}>
                        {card.status === 'Aktif' ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
                        {card.status || 'Aktif'}
                      </span>
                    </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      <button 
                        onClick={() => openEditModal(card)}
                        className="btn btn-secondary btn-sm"
                        title="Kullanıcı Bilgilerini Düzenle"
                        style={{ borderColor: '#38bdf8', color: '#38bdf8' }}
                      >
                        <Edit3 size={13} /> Düzenle
                      </button>
                      <button 
                        onClick={() => onSimulateCard(card)}
                        className="btn btn-secondary btn-sm"
                        title="Turnikede Okut"
                      >
                        <Zap size={13} color="#38bdf8" /> Simüle
                      </button>
                      <button 
                        onClick={() => onToggleCardStatus(card.id, card.status)}
                        className={`btn btn-sm ${card.status === 'Aktif' ? 'btn-secondary' : 'btn-primary'}`}
                      >
                        {card.status === 'Aktif' ? 'Engelle' : 'Aktif'}
                      </button>
                      <button 
                        onClick={() => onDeleteCard(card.id)}
                        className="btn btn-danger btn-sm"
                        title="Kullanıcıyı Sil"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#cbd5e1' }}>
                  Kayıtlı kullanıcı bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* EDIT CARD MODAL */}
      {editingCard && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '580px',
            background: '#162038',
            border: '1px solid #38bdf8',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 25px rgba(56,189,248,0.3)',
            padding: '24px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #293859', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit3 size={20} color="#38bdf8" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                  Kullanıcı Bilgilerini Güncelle ({editingCard.holderName})
                </h3>
              </div>
              <button 
                onClick={() => setEditingCard(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Error Banner */}
            {editError && (
              <div style={{ padding: '10px 14px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: '8px', color: '#fb7185', fontSize: '0.82rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit}>
              {/* Type Switcher */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <button
                  type="button"
                  onClick={() => setEditCardType('Öğrenci')}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: `1px solid ${editCardType === 'Öğrenci' ? '#38bdf8' : '#293859'}`,
                    background: editCardType === 'Öğrenci' ? 'rgba(56, 189, 248, 0.2)' : '#0b1329',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  Öğrenci
                </button>
                <button
                  type="button"
                  onClick={() => setEditCardType('Personel')}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: `1px solid ${editCardType === 'Personel' ? '#38bdf8' : '#293859'}`,
                    background: editCardType === 'Personel' ? 'rgba(56, 189, 248, 0.2)' : '#0b1329',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  Personel
                </button>
              </div>

              {/* Holder Name */}
              <div className="form-group">
                <label className="form-label">Kullanıcı Ad Soyad</label>
                <input
                  type="text"
                  value={editHolderName}
                  onChange={(e) => setEditHolderName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              {/* Student No / Staff ID */}
              <div className="form-group">
                <label className="form-label">
                  {editCardType === 'Öğrenci' ? 'Öğrenci Numarası (Tam 10 Rakam)' : 'Sicil / T.C. No'}
                </label>
                <input
                  type="text"
                  value={editEmployeeId}
                  onChange={(e) => setEditEmployeeId(editCardType === 'Öğrenci' ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value)}
                  className="form-input form-input-mono"
                  maxLength={editCardType === 'Öğrenci' ? 10 : 30}
                  required
                />
              </div>

              {/* Faculty & Department */}
              {editCardType === 'Öğrenci' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Fakülte</label>
                    <select
                      value={editFaculty}
                      onChange={(e) => setEditFaculty(e.target.value)}
                      className="form-select"
                    >
                      {FACULTIES.map(fac => <option key={fac} value={fac}>{fac}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Bölüm</label>
                    <select
                      value={editDepartment}
                      onChange={(e) => setEditDepartment(e.target.value)}
                      className="form-select"
                    >
                      {STUDENT_DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Birim / Departman</label>
                  <select
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="form-select"
                  >
                    {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                  </select>
                </div>
              )}

              {/* Multi-Gate Permissions */}
              <div className="form-group">
                <label className="form-label">Erişim İzni Verilen Kapılar</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px' }}>
                  {ALL_PERMISSIONS.map(gateName => {
                    const isSelected = editGates.includes(gateName);
                    return (
                      <div
                        key={gateName}
                        onClick={() => toggleEditGatePermission(gateName)}
                        style={{
                          padding: '7px 10px',
                          borderRadius: '6px',
                          background: isSelected ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : '#0b1329',
                          border: `1px solid ${isSelected ? '#38bdf8' : '#293859'}`,
                          color: isSelected ? '#ffffff' : '#94a3b8',
                          fontSize: '0.78rem',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {isSelected ? <CheckCircle2 size={13} /> : <PlusCircle size={13} />}
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{gateName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button 
                  type="button" 
                  onClick={() => setEditingCard(null)} 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                >
                  İptal
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                >
                  Değişiklikleri Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
