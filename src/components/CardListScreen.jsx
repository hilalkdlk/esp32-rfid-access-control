import React, { useState } from 'react';
import { Search, Filter, Plus, ShieldCheck, ShieldAlert, Trash2, Zap, RefreshCw, CheckCircle2, UserCheck, CreditCard } from 'lucide-react';

export default function CardListScreen({ cards, setCards, onNavigateToAdd, onSimulateCard, logsCount, pendingCount }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Filter logic
  const filteredCards = cards.filter(card => {
    const matchesSearch = card.holderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          card.uid.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          card.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'ALL' || card.department === selectedDept;
    const matchesStatus = selectedStatus === 'ALL' || card.status === selectedStatus;
    return matchesSearch && matchesDept && matchesStatus;
  });

  const toggleCardStatus = (cardId) => {
    setCards(prev => prev.map(c => {
      if (c.id === cardId) {
        const nextStatus = c.status === 'Aktif' ? 'Engelli' : 'Aktif';
        return { ...c, status: nextStatus, syncedToESP32: false };
      }
      return c;
    }));
  };

  const deleteCard = (cardId) => {
    if (window.confirm('Bu kartı sistemden ve ESP32 cards.json belleğinden silmek istediğinize emin misiniz?')) {
      setCards(prev => prev.filter(c => c.id !== cardId));
    }
  };

  const activeCount = cards.filter(c => c.status === 'Aktif').length;
  const blockedCount = cards.filter(c => c.status === 'Engelli').length;

  return (
    <div>
      {/* Overview Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', borderRadius: '12px' }}>
            <CreditCard size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600 }}>Toplam RFID Kart</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>{cards.length}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderRadius: '12px' }}>
            <UserCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600 }}>Aktif Geçiş Kartları</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399' }}>{activeCount}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', borderRadius: '12px' }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600 }}>Engellenen Kartlar</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f87171' }}>{blockedCount}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', borderRadius: '12px' }}>
            <RefreshCw size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600 }}>ESP32 LittleFS Senkron</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#22d3ee' }}>cards.json Güncel</div>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        {/* Table Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="Kart Sahibi, RFID UID veya Sicil No ile ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '42px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={16} color="#9ca3af" />
              <select 
                value={selectedDept} 
                onChange={(e) => setSelectedDept(e.target.value)}
                className="form-select"
                style={{ width: 'auto', padding: '10px 14px' }}
              >
                <option value="ALL">Tüm Birimler</option>
                <option value="AR-GE Mühendisliği">AR-GE Mühendisliği</option>
                <option value="Bilgi İşlem / IT">Bilgi İşlem / IT</option>
                <option value="İnsan Kaynakları">İnsan Kaynakları</option>
                <option value="Yazılım Stajyer">Yazılım Stajyer</option>
                <option value="Lojistik & Depo">Lojistik & Depo</option>
              </select>
            </div>

            <select 
              value={selectedStatus} 
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="form-select"
              style={{ width: 'auto', padding: '10px 14px' }}
            >
              <option value="ALL">Tüm Durumlar</option>
              <option value="Aktif">Aktif</option>
              <option value="Engelli">Engelli</option>
            </select>

            <button onClick={onNavigateToAdd} className="btn btn-primary">
              <Plus size={18} />
              Yeni Kart Ekle (Adım 2)
            </button>
          </div>
        </div>

        {/* Cards Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>RFID Card UID</th>
                <th>Kart Sahibi</th>
                <th>Sicil / ID No</th>
                <th>Birim / Departman</th>
                <th>Erişim Yetkisi</th>
                <th>Durum</th>
                <th>LittleFS Senkron</th>
                <th style={{ textAlign: 'right' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredCards.length > 0 ? (
                filteredCards.map(card => (
                  <tr key={card.id}>
                    <td>
                      <span className="form-input-mono" style={{ padding: '4px 8px', background: 'rgba(99, 102, 241, 0.12)', color: '#818cf8', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                        {card.uid}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{card.holderName}</td>
                    <td style={{ color: '#9ca3af', fontFamily: 'var(--font-mono)' }}>{card.employeeId}</td>
                    <td>
                      <span style={{ fontSize: '0.82rem', padding: '4px 10px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px' }}>
                        {card.department}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{card.accessLevel}</td>
                    <td>
                      <span className={card.status === 'Aktif' ? 'badge badge-active' : 'badge badge-blocked'}>
                        {card.status === 'Aktif' ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                        {card.status}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.78rem', color: card.syncedToESP32 ? '#34d399' : '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={14} /> {card.syncedToESP32 ? 'cards.json ok' : 'Güncelleme Bekliyor'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        <button 
                          onClick={() => onSimulateCard(card)}
                          className="btn btn-secondary btn-sm"
                          title="Turnikede Okutma Simülasyonu Çalıştır"
                        >
                          <Zap size={14} color="#06b6d4" /> Simüle Et
                        </button>
                        <button 
                          onClick={() => toggleCardStatus(card.id)}
                          className={`btn btn-sm ${card.status === 'Aktif' ? 'btn-secondary' : 'btn-primary'}`}
                          title={card.status === 'Aktif' ? 'Kartı Geçici Engelle' : 'Kartı Aktifleştir'}
                        >
                          {card.status === 'Aktif' ? 'Engelle' : 'Aktif Yap'}
                        </button>
                        <button 
                          onClick={() => deleteCard(card.id)}
                          className="btn btn-danger btn-sm"
                          title="Kartı Sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                    Arama kriterlerine uygun RFID kartı bulunamadı.
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
