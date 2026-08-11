import * as XLSX from 'xlsx';

// Helper to get formatted Turkey Timestamp for export filename
const getExportFilenameTimestamp = () => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

// 1. EXPORT TO EXCEL (.xlsx) - Browser Fail-Proof Blob Saver
export const exportToExcel = (logs, filenamePrefix = 'Gecis_Loglari_Raporu') => {
  try {
    if (!logs || logs.length === 0) {
      alert('İndirilecek kayıt bulunamadı!');
      return;
    }

    const exportData = logs.map(log => ({
      'Tarih & Saat (TRT)': log.timestamp || '',
      'Kullanıcı Ad Soyad': log.holderName || '',
      'Geçiş Yapılan Kapı': log.gate || '',
      'Geçiş Durumu / Sonuç': log.status || '',
      'Röle Durumu': log.relayTriggered ? 'Açık (İzin Verildi)' : 'Kapalı (Reddedildi)',
      'Veritabanı Senkronizasyonu': log.syncedToFirestore ? 'Firestore' : 'LittleFS'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Geçiş Logları');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 22 }, // Tarih
      { wch: 26 }, // Ad Soyad
      { wch: 26 }, // Kapı
      { wch: 26 }, // Durum
      { wch: 24 }, // Röle
      { wch: 16 }  // DB
    ];

    const filename = `${filenamePrefix}_${getExportFilenameTimestamp()}.xlsx`;
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Excel İndirme Hatası:', err);
    alert('Excel dosyası indirilirken bir hata oluştu: ' + err.message);
  }
};

// 2. EXPORT SAMPLE TEMPLATE TO EXCEL (.xlsx)
export const exportSampleTemplate = () => {
  try {
    const sampleData = [
      {
        'UID (8 HEX)': 'A1B2C3D4',
        'Ad Soyad': 'Ahmet Yılmaz',
        'Kullanıcı Türü': 'Öğrenci',
        'Öğrenci/Sicil No': '2026010405',
        'Fakülte': 'Mühendislik Fakültesi',
        'Bölüm / Birim': 'Bilgisayar Mühendisliği',
        'Yetkili Kapılar': 'Ana Giriş Turnikesi, AR-GE Laboratuvar Kapısı'
      },
      {
        'UID (8 HEX)': 'E5F6A7B8',
        'Ad Soyad': 'Zeynep Kaya',
        'Kullanıcı Türü': 'Personel',
        'Öğrenci/Sicil No': 'EMP-2026-90',
        'Fakülte': 'N/A',
        'Bölüm / Birim': 'Bilgi İşlem Daire Bşk.',
        'Yetkili Kapılar': 'Tüm Kapılar / Yönetici'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    worksheet['!cols'] = [{ wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 18 }, { wch: 24 }, { wch: 26 }, { wch: 36 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Toplu Kart Şablonu');

    const filename = `Toplu_Kart_Yukleme_Sablonu.xlsx`;
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Şablon İndirme Hatası:', err);
    alert('Şablon dosyası indirilirken hata oluştu: ' + err.message);
  }
};

// 3. EXPORT TO CSV (.csv with UTF-8 BOM)
export const exportToCSV = (logs, filenamePrefix = 'Gecis_Loglari_Raporu') => {
  try {
    if (!logs || logs.length === 0) {
      alert('İndirilecek kayıt bulunamadı!');
      return;
    }

    const headers = ['Tarih & Saat (TRT)', 'Kullanıcı Ad Soyad', 'Geçiş Yapılan Kapı', 'Geçiş Durumu', 'Röle Durumu'];
    const rows = logs.map(log => [
      `"${log.timestamp || ''}"`,
      `"${log.holderName || ''}"`,
      `"${log.gate || ''}"`,
      `"${log.status || ''}"`,
      `"${log.relayTriggered ? 'Açık' : 'Kapalı'}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filenamePrefix}_${getExportFilenameTimestamp()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('CSV İndirme Hatası:', err);
    alert('CSV dosyası indirilirken bir hata oluştu: ' + err.message);
  }
};
