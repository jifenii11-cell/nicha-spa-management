// Set this to the deployed Apps Script Web App URL ending in /exec
const API_URL = 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';
async function api(action,data={}) {
  const token=sessionStorage.getItem('nicha_token')||'';
  const res=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,token,...data})});
  return await res.json();
}