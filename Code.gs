/**
 * NICHA SPA API - Google Apps Script
 * Deploy as Web App (execute as owner). Configure ADMIN_PIN in Script Properties.
 * API requests use text/plain JSON to avoid browser preflight requests.
 */
const DB_ID = PropertiesService.getScriptProperties().getProperty('DB_ID');
const ADMIN_PIN = PropertiesService.getScriptProperties().getProperty('ADMIN_PIN') || '2580';
const SESSION_TTL = 21600;
const SHEETS = {
  Beds: ['id','name','area','status','active'],
  Employees: ['id','name','type','phone','shareShop','shareOwner','shareStaff','active'],
  Services: ['id','name','minutes','price','active'],
  Bookings: ['id','bedId','customerType','customerName','employeeId','serviceId','serviceName','minutes','price','discount','net','shareShopPct','shareOwnerPct','shareStaffPct','startedAt','endsAt','status','createdAt'],
  Transactions: ['id','bookingId','paidAt','gross','discount','net','shopAmount','ownerAmount','staffAmount','employeeId','employeeName'],
  Settings: ['key','value']
};

function doGet(e) {
  const cb = e && e.parameter && e.parameter.callback;
  const out = api_({action: (e && e.parameter && e.parameter.action) || 'health',
                    token: (e && e.parameter && e.parameter.token) || ''});
  const body = JSON.stringify(out);
  return ContentService.createTextOutput(cb ? `${cb}(${body})` : body)
    .setMimeType(cb ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    return json_(api_(req));
  } catch (err) {
    return json_({ok:false,error:String(err.message || err)});
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function api_(req) {
  const action = req.action || 'health';
  if (action === 'health') return {ok:true, app:'NICHA SPA', version:'0.1.0'};
  if (action === 'login') {
    if (String(req.pin || '') !== String(ADMIN_PIN)) return {ok:false,error:'รหัสผ่านไม่ถูกต้อง'};
    const token = Utilities.getUuid() + Utilities.getUuid();
    CacheService.getScriptCache().put('session_' + token, 'admin', SESSION_TTL);
    return {ok:true,token:token,role:'admin'};
  }
  if (!validSession_(req.token)) return {ok:false,error:'กรุณาเข้าสู่ระบบใหม่'};
  setupSheets_();
  switch (action) {
    case 'init': return {ok:true,beds:rows_('Beds'),employees:rows_('Employees'),services:rows_('Services'),bookings:rows_('Bookings')};
    case 'saveBed': return saveBed_(req);
    case 'saveEmployee': return saveEmployee_(req);
    case 'saveService': return saveService_(req);
    case 'startBooking': return startBooking_(req);
    case 'finishBooking': return finishBooking_(req);
    case 'report': return report_();
    default: return {ok:false,error:'ไม่รู้จักคำสั่ง: ' + action};
  }
}

function validSession_(token) {
  return !!token && CacheService.getScriptCache().get('session_' + token) === 'admin';
}
function ss_() {
  if (!DB_ID) throw new Error('ยังไม่ได้ตั้งค่า Script Property: DB_ID');
  return SpreadsheetApp.openById(DB_ID);
}
function setupSheets_() {
  const ss = ss_();
  Object.keys(SHEETS).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) sh.appendRow(SHEETS[name]);
  });
}
function rows_(name) {
  const sh = ss_().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  const data = sh.getDataRange().getValues();
  return data.slice(1).filter(r => r[0] !== '').map(r => {
    const o = {}; SHEETS[name].forEach((k,i) => o[k] = r[i]); return o;
  });
}
function append_(name, obj) {
  const sh = ss_().getSheetByName(name);
  sh.appendRow(SHEETS[name].map(k => obj[k] === undefined ? '' : obj[k]));
}
function id_() { return Utilities.getUuid(); }
function saveBed_(req) {
  const b = req.bed || {};
  if (!b.name) throw new Error('กรุณาระบุชื่อเตียง');
  append_('Beds',{id:b.id || id_(),name:b.name,area:b.area || 'ห้องหลัก',status:'ว่าง',active:true});
  return {ok:true};
}
function saveEmployee_(req) {
  const x = req.employee || {};
  const a = Number(x.shareShop), b = Number(x.shareOwner), c = Number(x.shareStaff);
  if (!x.name || [a,b,c].some(v => !Number.isFinite(v) || v < 0) || Math.abs(a+b+c-100) > 0.001)
    throw new Error('กรุณากรอกชื่อและเปอร์เซ็นต์ส่วนแบ่งให้รวมกัน 100%');
  append_('Employees',{id:id_(),name:x.name,type:x.type || 'ประจำ',phone:x.phone || '',shareShop:a,shareOwner:b,shareStaff:c,active:true});
  return {ok:true};
}
function saveService_(req) {
  const x = req.service || {};
  if (!x.name || Number(x.minutes) <= 0 || Number(x.price) < 0) throw new Error('ตรวจสอบชื่อบริการ เวลา และราคา');
  append_('Services',{id:id_(),name:x.name,minutes:Number(x.minutes),price:Number(x.price),active:true});
  return {ok:true};
}
function startBooking_(req) {
  const x = req.booking || {};
  const beds = rows_('Beds'), staff = rows_('Employees'), services = rows_('Services');
  const bed = beds.find(v => v.id === x.bedId && v.active === true);
  const emp = staff.find(v => v.id === x.employeeId && v.active === true);
  const svc = services.find(v => v.id === x.serviceId && v.active === true);
  if (!bed || !emp || !svc) throw new Error('กรุณาเลือกเตียง พนักงาน และบริการให้ถูกต้อง');
  if (rows_('Bookings').some(v => v.bedId === x.bedId && v.status === 'กำลังนวด')) throw new Error('เตียงนี้กำลังใช้งาน');
  const now = new Date(), end = new Date(now.getTime() + Number(svc.minutes)*60000);
  const price = Number(svc.price), discount = Math.max(0,Math.min(price,Number(x.discount)||0)), net = price-discount;
  const booking = {id:id_(),bedId:bed.id,customerType:x.customerType || 'ขาจร',customerName:x.customerName || '',
    employeeId:emp.id,serviceId:svc.id,serviceName:svc.name,minutes:Number(svc.minutes),price,discount,net,
    shareShopPct:Number(emp.shareShop),shareOwnerPct:Number(emp.shareOwner),shareStaffPct:Number(emp.shareStaff),
    startedAt:now.toISOString(),endsAt:end.toISOString(),status:'กำลังนวด',createdAt:now.toISOString()};
  append_('Bookings',booking);
  return {ok:true,booking};
}
function finishBooking_(req) {
  const id = req.bookingId, all = rows_('Bookings'), b = all.find(x => x.id === id && x.status === 'กำลังนวด');
  if (!b) throw new Error('ไม่พบงานที่กำลังนวด');
  const shop = Math.round(Number(b.net)*Number(b.shareShopPct)/100*100)/100;
  const owner = Math.round(Number(b.net)*Number(b.shareOwnerPct)/100*100)/100;
  const staff = Math.round((Number(b.net)-shop-owner)*100)/100;
  const emp = rows_('Employees').find(x => x.id === b.employeeId);
  append_('Transactions',{id:id_(),bookingId:id,paidAt:new Date().toISOString(),gross:b.price,discount:b.discount,net:b.net,
    shopAmount:shop,ownerAmount:owner,staffAmount:staff,employeeId:b.employeeId,employeeName:emp ? emp.name : ''});
  const sh = ss_().getSheetByName('Bookings'), values = sh.getDataRange().getValues();
  const statusCol = SHEETS.Bookings.indexOf('status')+1;
  for (let i=1;i<values.length;i++) if (values[i][0] === id) sh.getRange(i+1,statusCol).setValue('ชำระแล้ว');
  return {ok:true,summary:{net:b.net,shop,owner,staff}};
}
function report_() {
  const tx = rows_('Transactions');
  return {ok:true,total:tx.reduce((s,x)=>s+Number(x.net||0),0),
    shop:tx.reduce((s,x)=>s+Number(x.shopAmount||0),0),
    owner:tx.reduce((s,x)=>s+Number(x.ownerAmount||0),0),
    staff:tx.reduce((s,x)=>s+Number(x.staffAmount||0),0),count:tx.length};
}
