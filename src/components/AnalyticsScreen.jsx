import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid } from 'recharts';
import { BarChart3, Activity, ShieldCheck, ShieldAlert, DoorClosed, Filter, X, FileSpreadsheet, FileText, Download } from 'lucide-react';
import { exportToExcel, exportToCSV } from '../utils/exportUtils';

// Format timestamp to Turkey Local Time
const formatTurkeyTimestamp = (ts) => {
  if (!ts) {
    const now = new Date();
    return now.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
  }
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
  } catch (err) {
    return ts;
  }
};

export default function AnalyticsScreen({ cards = [], logs = [] }) {
  // State for interactive chart drill-down filter: null | 'ALL' | 'Yetkili' | 'Yetkisiz'
  const [selectedStatusFilter, setSelectedStatusFilter] = useState(null);

  // 1. Process Hourly Traffic Data (00:00 - 23:00)
  const hourlyCounts = Array(24).fill(0);
  logs.forEach(log => {
    if (log.timestamp) {
      try {
        const d = new Date(log.timestamp);
        if (!isNaN(d.getTime())) {
          const hour = d.getHours();
          hourlyCounts[hour]++;
        }
      } catch (err) {}
    }
  });

  const hourlyData = hourlyCounts.map((count, hour) => ({
    hour: `${hour.toString().padStart(2, '0')}:00`,
    Geçişler: count
  }));

  // 2. Process Gate Usage Data
  const gateMap = {};
  logs.forEach(l => {
    const g = l.gate || 'Ana Giriş Turnikesi';
    gateMap[g] = (gateMap[g] || 0) + 1;
  });
  const gateData = Object.keys(gateMap).map(gate => ({
    gate: gate.length > 15 ? gate.substring(0, 15) + '...' : gate,
    GeçişSayısı: gateMap[gate]
  }));

  // 3. Process Pass Result Breakdown (Başarılı Yetkili vs Başarısız/Red)
  const authorizedLogs = logs.filter(l => l.relayTriggered || (l.status && l.status.includes('Yetkili')));
  const unauthorizedLogs = logs.filter(l => !l.relayTriggered && (!l.status || !l.status.includes('Yetkili')));

  const authorizedCount = authorizedLogs.length;
  const unauthorizedCount = unauthorizedLogs.length;

  const statusData = [
    { name: 'Başarılı Yetkili Geçiş', value: authorizedCount, color: '#34d399', type: 'Yetkili' },
    { name: 'Başarısız / Reddedilen Geçiş', value: unauthorizedCount, color: '#fb7185', type: 'Yetkisiz' }
  ];

  // Drill-down filtered list
  const activeDrillLogs = selectedStatusFilter === 'ALL'
    ? logs
    : (selectedStatusFilter === 'Yetkili' ? authorizedLogs : (selectedStatusFilter === 'Yetkisiz' ? unauthorizedLogs : []));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: '#0b1329', border: '1px solid #38bdf8', padding: '10px 14px', borderRadius: '8px', boxShadow: '0 0 14px rgba(0,0,0,0.8)' }}>
          <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.82rem' }}>{label || payload[0].name}</div>
          <div style={{ color: '#7dd3fc', fontSize: '0.8rem', marginTop: '2px', fontWeight: 600 }}>
            {payload[0].name || 'Sayı'}: {payload[0].value} Kayıt (Tıklayarak Listeleyin)
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner Metric Summary - Clickable to filter */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div 
          onClick={() => setSelectedStatusFilter('ALL')}
          className="glass-panel glow-card-cyan" 
          style={{ padding: '20px 22px', background: selectedStatusFilter === 'ALL' ? '#1e2d4d' : '#162038', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', border: selectedStatusFilter === 'ALL' ? '2px solid #38bdf8' : '1px solid #293859' }}
        >
          <div style={{ padding: '12px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', borderRadius: '12px' }}>
            <Activity size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600 }}>Toplam İşlenen Log (Tıkla)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>{logs.length} Kayıt</div>
          </div>
        </div>

        <div 
          onClick={() => setSelectedStatusFilter('Yetkili')}
          className="glass-panel glow-card-emerald" 
          style={{ padding: '20px 22px', background: selectedStatusFilter === 'Yetkili' ? '#064e3b' : '#162038', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', border: selectedStatusFilter === 'Yetkili' ? '2px solid #34d399' : '1px solid #293859' }}
        >
          <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', borderRadius: '12px' }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600 }}>Başarılı Yetkili Geçiş (Tıkla)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>{authorizedCount}</div>
          </div>
        </div>

        <div 
          onClick={() => setSelectedStatusFilter('Yetkisiz')}
          className="glass-panel glow-card-rose" 
          style={{ padding: '20px 22px', background: selectedStatusFilter === 'Yetkisiz' ? '#4c0519' : '#162038', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', border: selectedStatusFilter === 'Yetkisiz' ? '2px solid #fb7185' : '1px solid #293859' }}
        >
          <div style={{ padding: '12px', background: 'rgba(244, 63, 94, 0.2)', color: '#fb7185', borderRadius: '12px' }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600 }}>Başarısız / Reddedilen (Tıkla)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fb7185', marginTop: '2px' }}>{unauthorizedCount}</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Clean 3-Card Symmetric Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {/* 1. Hourly Traffic Area Chart */}
        <div className="glass-panel" style={{ padding: '22px', background: '#162038' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <Activity size={20} color="#38bdf8" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>Saatlik Geçiş Yoğunluğu</h3>
          </div>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#293859" />
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Geçişler" stroke="#38bdf8" strokeWidth={3} fillOpacity={1} fill="url(#colorTraffic)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Gate Usage Bar Chart */}
        <div className="glass-panel" style={{ padding: '22px', background: '#162038' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <DoorClosed size={20} color="#38bdf8" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>Kapı Bazlı Geçiş Dağılımı</h3>
          </div>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gateData.length > 0 ? gateData : [{ gate: 'Ana Giriş', GeçişSayısı: logs.length }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#293859" />
                <XAxis dataKey="gate" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="GeçişSayısı" fill="#0284c7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Pass Status Breakdown Pie Chart (In Place of 3rd Slot) */}
        <div className="glass-panel" style={{ padding: '22px', background: '#162038', border: selectedStatusFilter ? '2px solid #38bdf8' : '1px solid #293859' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BarChart3 size={20} color="#38bdf8" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>Geçiş Sonucu Oranları</h3>
            </div>
            {selectedStatusFilter && (
              <button 
                onClick={() => setSelectedStatusFilter(null)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <X size={13} /> Temizle
              </button>
            )}
          </div>

          <div style={{ width: '100%', height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={statusData} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={45} 
                  outerRadius={75} 
                  paddingAngle={5} 
                  label={({ name, value }) => `${name}: ${value}`}
                  onClick={(entry) => setSelectedStatusFilter(entry.type)}
                >
                  {statusData.map((entry, index) => (
                    <Cell 
                      key={`cell-status-${index}`} 
                      fill={entry.color} 
                      stroke={selectedStatusFilter === entry.type ? '#ffffff' : 'none'}
                      strokeWidth={3}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
      </div>
      </div>

      {/* 4. INTERACTIVE DRILL-DOWN TABLE WHEN GRAPH OR METRIC CARD IS CLICKED */}
      {selectedStatusFilter && (
        <div className="glass-panel" style={{ padding: '22px', background: '#162038', border: `2px solid ${selectedStatusFilter === 'Yetkili' ? '#34d399' : (selectedStatusFilter === 'Yetkisiz' ? '#fb7185' : '#38bdf8')}`, animation: 'pulseGlow 0.4s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Filter size={20} color={selectedStatusFilter === 'Yetkili' ? '#34d399' : (selectedStatusFilter === 'Yetkisiz' ? '#fb7185' : '#38bdf8')} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                {selectedStatusFilter === 'ALL' && '🌐 Tüm Geçiş Kayıtları Detay Listesi'}
                {selectedStatusFilter === 'Yetkili' && '🟢 Başarılı Yetkili Geçişler Detay Listesi'}
                {selectedStatusFilter === 'Yetkisiz' && '🔴 Başarısız / Reddedilen Geçişler Detay Listesi'}
                <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 500, marginLeft: '10px' }}>
                  ({activeDrillLogs.length} Kayıt Bulundu)
                </span>
              </h3>
            </div>

            {/* Export Rapor Buttons for Filtered Drill Down Table */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => exportToExcel(activeDrillLogs, `Filtreli_Gecis_Raporu_${selectedStatusFilter}`)}
                className="btn btn-success btn-sm"
                style={{ fontSize: '0.78rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <FileSpreadsheet size={15} /> Excel
              </button>

              <button 
                onClick={() => exportToCSV(activeDrillLogs, `Filtreli_Gecis_Raporu_${selectedStatusFilter}`)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.78rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <Download size={15} /> CSV
              </button>

              <button 
                onClick={() => setSelectedStatusFilter(null)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.8rem', padding: '6px 14px' }}
              >
                <X size={14} /> Filtreyi Kaldır
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Tarih & Saat (TRT)</th>
                  <th>Kullanıcı Ad Soyad</th>
                  <th>Kapı</th>
                  <th>Geçiş Durumu / Sonuç</th>
                  <th>Röle & Buzzer</th>
                </tr>
              </thead>
              <tbody>
                {activeDrillLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: '#cbd5e1', padding: '24px' }}>
                      Bu kategoriye ait geçiş kaydı bulunamadı.
                    </td>
                  </tr>
                ) : (
                  activeDrillLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.78rem', color: '#cbd5e1', fontFamily: 'var(--font-mono)' }}>
                        {formatTurkeyTimestamp(log.timestamp)}
                      </td>
                      <td style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.92rem' }}>{log.holderName}</td>
                      <td style={{ fontSize: '0.82rem', color: '#38bdf8', fontWeight: 700 }}>
                        <DoorClosed size={12} style={{ display: 'inline', marginRight: '4px' }} />
                        {log.gate}
                      </td>
                      <td>
                        <span className={log.relayTriggered ? 'badge badge-online' : 'badge badge-offline'}>
                          {log.status}
                        </span>
                      </td>
                      <td>
                        <span className={log.relayTriggered ? 'badge badge-active' : 'badge badge-blocked'}>
                          {log.relayTriggered ? '🔓 Açık (1 Bip)' : '🔒 Kapalı (3 Bip)'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
