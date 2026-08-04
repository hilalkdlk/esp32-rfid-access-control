import React, { useState } from 'react';
import { Search, Filter, Plus, ShieldCheck, ShieldAlert, Trash2, Zap, CheckCircle2, UserCheck, CreditCard } from 'lucide-react';

export default function CardListScreen({ cards, setCards, onNavigateToAdd, onSimulateCard }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  const filteredCards = cards.filter(card => {
    const matchesSearch = card.holderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          card.uid.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          card.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'ALL' || card.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const toggleCardStatus = (cardId) => {
    setCards(prev => prev.map(c => {
      if (c.id === cardId) {
        const nextStatus = c.status === 'Aktif' ? 'Engelli' : 'Aktif';
        return { ...c, status: nextStatus, syncedToESP32: true };
      }
      return c;
    }));
  };

  const deleteCard = (cardId) => {
    if (window.confirm('Bu kartı silmek istediğinize emin misiniz?')) {
      setCards(prev => prev.filter(c => c.id !== cardId));
    }
  };

  const activeCount = cards.filter(c => c.status === 'Aktif').length;
  const blockedCount = cards.filter(c => c.status === 'Engelli').length;

  return (
    <div>
      {/* Metric Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', borderRadius: '10px' }}>
            <CreditCard size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>Toplam Kart</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc' }}>{cards.length}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderRadius: '10px' }}>
            <UserCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>Aktif Kartlar</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399' }}>{activeCount}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '10px', background: 'rgba(244, 63, 94, 0.15)', color: '#f87171', borderRadius: '10px' }}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>Engelli Kartlar</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f87171' }}>{blockedCount}</div>
          </div>
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Kart Sahibi veya UID ile ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '38px' }}
              />
            </div>

            <select 
              value={selectedDept} 
              onChange={(e) => setSelectedDept(e.target.value)}
              className="form-select"
              style={{ width: 'auto', padding: '8px 12px', fontSize: '0.85rem' }}
            >
              <option value="ALL">Tüm Birimler</option>
              <option value="AR-GE Mühendisliği">AR-GE</option>
              <option value="Bilgi İşlem / IT">Bilgi İşlem</option>
              <option value="İnsan Kaynakları">İnsan Kaynakları</option>
              <option value="Yazılım Stajyer">Stajyer</option>
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
                <th>Kart Sahibi</th>
                <th>Sicil No</th>
                <th>Birim</th>
                <th>Yetki</th>
                <th>Durum</th>
                <th style={{ textAlign: 'right' }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filteredCards.length > 0 ? (
                filteredCards.map(card => (
                  <tr key={card.id}>
                    <td>
                      <span className="form-input-mono" style={{ padding: '3px 8px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', borderRadius: '4px', fontSize: '0.82rem', fontWeight: 600 }}>
                        {card.uid}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#f8fafc' }}>{card.holderName}</td>
                    <td style={{ color: '#94a3b8', fontSize: '0.82rem' }}>{card.employeeId}</td>
                    <td style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>{card.department}</td>
                    <td style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>{card.accessLevel}</td>
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
                          onClick={() => toggleCardStatus(card.id)}
                          className={`btn btn-sm ${card.status === 'Aktif' ? 'btn-secondary' : 'btn-primary'}`}
                        >
                          {card.status === 'Aktif' ? 'Engelle' : 'Aktif Yap'}
                        </button>
                        <button 
                          onClick={() => deleteCard(card.id)}
                          className="btn btn-danger btn-sm"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
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
