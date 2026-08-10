import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Helper to get formatted Turkey Timestamp for export filename
const getExportFilenameTimestamp = () => {
  const now = new Date();
  const d = now.toISOString().split('T')[0];
  return d;
};

// 1. EXPORT TO EXCEL (.xlsx)
export const exportToExcel = (logs, filenamePrefix = 'Gecis_Loglari_Raporu') => {
  if (!logs || logs.length === 0) {
    alert('İndirilecek kayıt bulunamadı!');
    return;
  }

  const exportData = logs.map(log => ({
    'Tarih & Saat (TRT)': log.timestamp || '',
    'Kullanıcı Ad Soyad': log.holderName || '',
    'Geçiş Yapılan Kapı': log.gate || '',
    'Geçiş Durumu / Sonuç': log.status || '',
    'Röle Durumu': log.relayTriggered ? '🔓 Açık (İzin Verildi)' : '🔒 Kapalı (Reddedildi)',
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
  XLSX.writeFile(workbook, filename);
};

// 2. EXPORT TO PDF (.pdf)
export const exportToPDF = (logs, title = 'ESP32 Akıllı Kartlı Geçiş Kontrol Raporu') => {
  if (!logs || logs.length === 0) {
    alert('İndirilecek kayıt bulunamadı!');
    return;
  }

  const doc = new jsPDF('p', 'mm', 'a4');

  // Header Title
  doc.setFontSize(16);
  doc.setTextColor(2, 132, 199); // Cyan-Blue
  doc.text(title, 14, 18);

  // Subtitle Metadata
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Rapor Oluşturma Tarihi: ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })} | Toplam Kayıt: ${logs.length} Adet`, 14, 25);

  const tableColumn = ['Tarih & Saat', 'Kullanıcı Adı', 'Kapı', 'Sonuç', 'Röle'];
  const tableRows = logs.map(log => [
    log.timestamp || '',
    log.holderName || '',
    log.gate || '',
    log.status || '',
    log.relayTriggered ? 'Acik' : 'Kapali'
  ]);

  doc.autoTable({
    startY: 30,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [14, 165, 233], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 3 },
    alternateRowStyles: { fillColor: [241, 245, 249] }
  });

  const filename = `Gecis_Loglari_${getExportFilenameTimestamp()}.pdf`;
  doc.save(filename);
};

// 3. EXPORT TO CSV (.csv with UTF-8 BOM)
export const exportToCSV = (logs, filenamePrefix = 'Gecis_Loglari_Raporu') => {
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
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}_${getExportFilenameTimestamp()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
