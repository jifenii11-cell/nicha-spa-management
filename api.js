// Set this to the deployed Apps Script Web App URL ending in /exec
const API_URL = 'https://script.google.com/macros/s/AKfycbyYu1ndQ7ruRw980iyVuR5mOYTXM5RvisY_Yy9e3aZlQ54Urn7kcRq9h1_mICsweJuXkg/exec';
async function api(action,data={}) {
  const token=sessionStorage.getItem('nicha_token')||'';
  const res=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,token,...data})});
  return await res.json();
}
