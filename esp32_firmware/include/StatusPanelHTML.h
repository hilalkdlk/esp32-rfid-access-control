#ifndef STATUS_PANEL_HTML_H
#define STATUS_PANEL_HTML_H

#include <Arduino.h>

// ----------------------------------------------------------------------------
// ULTRA-HAFİF VE TÜM EKRANI KAPLAYAN DÜZDÜZ ESP32 DURUM ARAYÜZÜ (1.8 KB)
// ----------------------------------------------------------------------------
const char STATUS_PANEL_HTML[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ESP32 Durum Paneli</title>
<style>
body{font-family:sans-serif;background:#111;color:#eee;margin:0;padding:20px;width:100%;box-sizing:border-box}
h2{margin:0 0 6px;color:#6366f1;font-size:22px}
.sub{color:#94a3b8;font-size:14px;margin-bottom:20px}
.box{background:#1e293b;border:1px solid #334155;border-radius:10px;padding:16px;margin-bottom:16px;width:100%;box-sizing:border-box}
.title{font-weight:bold;color:#38bdf8;font-size:15px;margin-bottom:12px}
.bar-bg{background:#0f172a;height:12px;border-radius:6px;overflow:hidden;margin:10px 0;border:1px solid #334155}
.bar-fill{background:#6366f1;height:100%;width:0%;transition:width .4s}
.row{display:flex;justify-content:space-between;font-size:14px;padding:8px 0;border-bottom:1px solid #334155}
.row:last-child{border-bottom:none}
.val{font-weight:bold;color:#4ade80}
.val.off{color:#f87171}
</style>
</head>
<body>
<h2>ESP32 Cihaz Durum Paneli</h2>
<div class="sub" id="gateInfo">Yükleniyor...</div>

<div class="box">
<div class="title">📁 LittleFS Depolama Metriği</div>
<div id="lfsSummary" style="font-size:14px;font-weight:600">Yükleniyor...</div>
<div class="bar-bg"><div class="bar-fill" id="lfsFill"></div></div>
<div style="font-size:13px;color:#94a3b8" id="lfsFree">Boş Alan: -</div>
</div>

<div class="box">
<div class="title">📊 Veri Sayıları</div>
<div class="row"><span>Kayıtlı Kart Sayısı (cards.json):</span><span class="val" id="cardsCount">0</span></div>
<div class="row"><span>Bekleyen Çevrimdışı Log (pendingLogs.json):</span><span class="val" style="color:#fbbf24" id="logsCount">0</span></div>
</div>

<div class="box">
<div class="title">🌐 Donanım & Ağ Durumu</div>
<div class="row"><span>Cihaz ID / Kapı:</span><span id="devId" style="color:#cbd5e1">-</span></div>
<div class="row"><span>W5500 Ethernet:</span><span class="val" id="ethSt">-</span></div>
<div class="row"><span>ESP32 IP Adresi:</span><span id="ipAddr" style="color:#cbd5e1">-</span></div>
<div class="row"><span>Node.js REST API:</span><span class="val" id="apiSt">-</span></div>
<div class="row"><span>RFID Okuyucu (MFRC522):</span><span class="val" id="rfidSt">Aktif</span></div>
<div class="row"><span>16x2 LCD Ekran (0x27):</span><span class="val" id="lcdSt">Aktif</span></div>
<div class="row"><span>Röle Kilit Durumu:</span><span id="relaySt" style="color:#cbd5e1">Kilitli</span></div>
</div>

<script>
async function load(){
try{
let r=await fetch('/api/status'),d=await r.json();
document.getElementById('devId').innerText=d.deviceId+' ('+d.gateName+')';
document.getElementById('gateInfo').innerText='🚪 Kapı: '+d.gateName+' | IP: '+d.ip;
document.getElementById('ipAddr').innerText=d.ip;
if(d.littlefs){
let l=d.littlefs;
document.getElementById('lfsSummary').innerText=`LittleFS: ${l.usedMB} MB / ${l.totalMB} MB kullanılıyor (%${l.usagePercent})`;
document.getElementById('lfsFree').innerText=`Boş Alan: ${l.freeMB} MB`;
document.getElementById('lfsFill').style.width=l.usagePercent+'%';
}
document.getElementById('cardsCount').innerText=d.cardsCount||0;
document.getElementById('logsCount').innerText=d.pendingLogsCount||0;
document.getElementById('ethSt').innerText=d.ethernet?'Bağlandı':'Kesildi';
document.getElementById('ethSt').className='val '+(d.ethernet?'':'off');
document.getElementById('apiSt').innerText=d.apiServer?'Online':'Ulaşılamıyor';
document.getElementById('apiSt').className='val '+(d.apiServer?'':'off');
document.getElementById('relaySt').innerText=d.relay?'AÇIK':'Kilitli';
}catch(e){
document.getElementById('gateInfo').innerText='❌ Baglanti Bekleniyor...';
}
}
load();setInterval(load,5000);
</script>
</body>
</html>
)rawliteral";

#endif // STATUS_PANEL_HTML_H
