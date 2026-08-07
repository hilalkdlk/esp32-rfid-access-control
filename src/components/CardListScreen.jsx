import React, { useState } from 'react';
import { Search, Plus, ShieldCheck, ShieldAlert, Trash2, Zap, UserCheck, CreditCard, GraduationCap, Briefcase } from 'lucide-react';

export default function CardListScreen({ cards, onToggleCardStatus, onDeleteCard, onNavigateToAdd, onSimulateCard }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');

  const filteredCards = cards.filter(card => {
    const matchesSearch = (card.holderName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (card.uid || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (card.employeeId || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'ALL' || card.cardType === selectedType;
    return matchesSearch && matchesType;
  });

  const activeCount = cards.filter(c => c.status === 'Aktif').length;
  const blockedCount = cards.filter(c => c.status === 'Engelli').length;
  const studentCount = cards.filter(c => c.cardType === 'Öğrenci').length;
  const staffCount = cards.filter(c => c.cardType === 'Personel' || !c.cardType).length;

  return (
    <div>
      {/* Glowing Info Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        {/* Total Cards Glow Card */}
        <div className="glass-panel glow-card-indigo" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '10px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', borderRadius: '10px', boxShadow: '0 0 10px rgba(56, 189, 248, 0.3)' }}>
            <CreditCard size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600 }}>Toplam Kayıtlı Kart</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
              {cards.length} <span style={{ fontSize: '0.75rem', color: '#7dd3fc', fontWeight: 500 }}>({studentCount} Öğrenci / {staffCount} Personel)</span>
            </div>
          </div>
        </div>

        {/* Active Cards Glow Card */}
        <div className="glass-panel glow-card-emerald" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', borderRadius: '10px', boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)' }}>
            <UserCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600 }}>Aktif Kartlar</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399' }}>{activeCount}</div>
          </div>
        </div>

        {/* Blocked Cards Glow Card */}
        <div className="glass-panel glow-card-rose" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '10px', background: 'rgba(244, 63, 94, 0.2)', color: '#fb7185', borderRadius: '10px', boxShadow: '0 0 10px rgba(244, 63, 94, 0.3)' }}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600 }}>Engelli Kartlar</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fb7185' }}>{blockedCount}</div>
          </div>
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1' }} />
              <input
                type="text"
                placeholder="Kart Sahibi, No veya UID ile ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '38px' }}
              />
            </div>

            <select 
              value={selectedType} 
              onChange={(e) => setSelectedType(e.target.value)}
              className="form-select"
              style={{ width: 'auto', padding: '8px 12px', fontSize: '0.85rem' }}
            >
              <option value="ALL">Tüm Türler</option>
              <option value="Öğrenci">🎓 Öğrenciler</option>
              <option value="Personel">💼 Personeller</option>
            </select>
          </div>

          <button onClick={onNavigateToAdd} className="btn btn-primary">
            <Plus size={16} /> Yeni Kart Ekle (Adım 2)
          </button>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>RFID UID</th>
                <th>Tür</th>
                <th>Kart Sahibi</th>
                <th>Öğrenci / Sicil No</th>
                <th>Fakülte / Birim & Bölüm</th>
                <th>İzinli Kapılar</th>
                <th>Durum</th>
                <th style={{ textAlign: 'right' }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filteredCards.length > 0 ? (
                filteredCards.map(card => (
                  <tr key={card.id}>
                    <td>
                      <span className="form-input-mono" style={{ padding: '3px 8px', background: '#0b1329', color: '#38bdf8', borderRadius: '4px', fontSize: '0.82rem', fontWeight: 600, border: '1px solid rgba(56,189,248,0.3)', boxShadow: '0 0 6px rgba(56,189,248,0.2)' }}>
                        {card.uid}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: card.cardType === 'Öğrenci' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(2, 132, 199, 0.2)',
                        color: card.cardType === 'Öğrenci' ? '#7dd3fc' : '#38bdf8',
                        border: `1px solid ${card.cardType === 'Öğrenci' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(2, 132, 199, 0.4)'}`
                      }}>
                        {card.cardType === 'Öğrenci' ? <GraduationCap size={12} /> : <Briefcase size={12} />}
                        {card.cardType || 'Personel'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#ffffff' }}>{card.holderName}</td>
                    <td style={{ color: '#cbd5e1', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>{card.employeeId}</td>
                    <td style={{ fontSize: '0.82rem', color: '#e2e8f0' }}>
                      {card.cardType === 'Öğrenci' && card.faculty && card.faculty !== 'N/A' ? (
                        <div>
                          <div style={{ fontWeight: 600, color: '#f8fafc' }}>{card.faculty}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{card.department}</div>
                        </div>
                      ) : (
                        card.department
                      )}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#7dd3fc', fontWeight: 600 }}>
                      {card.accessLevel}
                    </td>
                    <td>
                      <span className={card.status === 'Aktif' ? 'badge badge-active' : 'badge badge-blocked'}>
                        {card.status === 'Aktif' ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                        {card.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <button 
                          onClick={() => onSimulateCard(card)}
                          className="btn btn-secondary btn-sm"
                          title="Turnikede Okut"
                        >
                          <Zap size={13} color="#38bdf8" /> Simüle Et
                        </button>
                        <button 
                          onClick={() => onToggleCardStatus(card.id, card.status)}
                          className={`btn btn-sm ${card.status === 'Aktif' ? 'btn-secondary' : 'btn-primary'}`}
                        >
                          {card.status === 'Aktif' ? 'Engelle' : 'Aktif Yap'}
                        </button>
                        <button 
                          onClick={() => onDeleteCard(card.id)}
                          className="btn btn-danger btn-sm"
                          title="Kartı Veritabanından Sil"
                        >
                          <Trash2 size={13} /> Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#cbd5e1' }}>
                    Kayıtlı kart bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
