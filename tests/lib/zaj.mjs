// zajedničko za testove dashboarda
// Zajedničko za testove: lažni Supabase (sbfake.js), podaci, otvaranje dashboarda.
import { chromium } from 'playwright-core'; import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'; import { fileURLToPath, pathToFileURL } from 'url'
import { createRequire } from 'module'
const OVDJE = dirname(fileURLToPath(import.meta.url))
export const FAKE=readFileSync(join(OVDJE,'sbfake.js'),'utf8')+'\n;'+readFileSync(join(OVDJE,'autoda.js'),'utf8')
export let BASE = process.env.ODM_BASE || 'http://localhost:8099'
export const postaviBase = u => { BASE = u }
const LEAFLET = (() => { try { return dirname(createRequire(join(OVDJE,'..','package.json')).resolve('leaflet/dist/leaflet.js')) } catch { return '' } })()
export const d=n=>{const x=new Date();x.setDate(x.getDate()+n);const p=v=>String(v).padStart(2,'0');return x.getFullYear()+'-'+p(x.getMonth()+1)+'-'+p(x.getDate())}
const IMG='/assets/landing/villa-900.jpg'
export function podaci(extra=''){
  const av=[];for(const [a,z,src,bk] of [[-3,-1,'manual',null],[2,6,'ical_booking',null],[9,10,'manual',null],[13,20,'manual','b1'],[21,23,'manual','b2'],[24,27,'ical_airbnb',null],[33,37,'ical_booking',null]])for(let i=a;i<=z;i++)av.push({id:'a'+i,property_id:'p1',date:d(i),is_booked:true,source:src,booking_id:bk})
  return `(()=>{window.__USER={id:'u1',email:'m@x.hr',user_metadata:{full_name:'Marko Domaćin'}};window.__ROWS={properties:[
 {id:'p1',user_id:'u1',slug:'vila-maslina',name:'Villa Maslina',type:'Villa',location:'Ulica krušaka 1, Zagreb',price_per_night:180,min_stay:3,max_guests:6,bedrooms:3,beds:4,bathrooms:2,size_m2:120,photo_urls:['${IMG}'],cover_photo_url:'${IMG}',created_at:'2026-01-01',show_availability:true,welcome_msg:'Dobro došli'},
 {id:'p2',user_id:'u1',slug:'apartman-ana',name:'Apartman Ana',type:'Apartman',location:'Vodice, Hrvatska',price_per_night:95,photo_urls:[],created_at:'2026-02-01'}],
 sections:[{id:1,property_id:'p1',wifi_name:'Vila',door_code:'4821',wifi_pass:'x',address:'Ulica krušaka 1',checkin_time:'15:00',parking_info:'Iza kuće'}],amenities:[{id:'m1',property_id:'p1',icon:'',name:'Klima uređaj',sort_order:1}],local_places:[],transport:[],attractions:[],house_rules:[],faq:[],
 page_views:[],availability:${JSON.stringify(av)},bookings:[{id:'b1',property_id:'p1',guest_name:'Marta Horvat',checkin_date:'${d(13)}',checkout_date:'${d(21)}',is_active:true,token:'abcdefgh12345678'},{id:'b2',property_id:'p1',guest_name:'Ivan',checkin_date:'${d(21)}',checkout_date:'${d(24)}',is_active:true,token:'abcdefgh12345679'}],
 subscriptions:[{user_id:'u1',plan:'pro',status:'active',period_end:null}],plans:[],inquiries:[]};${extra}})()`
}
export async function otvori(b,{w=1440,h=1000,lang='hr-HR',extra='',en=false}={}){
  const pg=await b.newPage({viewport:{width:w,height:h},locale:lang,reducedMotion:'reduce'});const errs=[];pg.on('pageerror',e=>errs.push(e.message))
  await pg.route(/fonts\.g|google\.com\/maps|tile\.openstreetmap/,r=>r.fulfill({status:200,contentType:'text/html',body:''}))
  await pg.route('**://esm.sh/**',r=>r.fulfill({status:200,contentType:'application/javascript',body:`export const createClient=()=>globalThis.__SB;export default {toCanvas:async()=>{}}`}))
  await pg.route('**unpkg.com/leaflet@1.9.4/dist/**',r=>{const f=r.request().url().split('/dist/')[1];return r.fulfill({status:200,contentType:f.endsWith('.css')?'text/css':'application/javascript',body:LEAFLET?readFileSync(join(LEAFLET,f),'utf8'):''})})
  await pg.route('**photon.komoot.io/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({features:[{geometry:{coordinates:[15.98,45.81]},properties:{}}]})}))
  await pg.route('**api.cloudinary.com/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({secure_url:IMG})}))
  await pg.addInitScript(podaci(extra)+(en?"\n;localStorage.setItem('odm-jezik-domacina','en');":'')+'\n;'+FAKE)
  await pg.goto(BASE+'/dashboard.html',{waitUntil:'load'});await pg.waitForTimeout(2200)
  return {pg,errs}
}
const CHROME = process.env.CHROME || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome','/opt/pw-browsers/chromium'].find(existsSync)
export const launch=()=>chromium.launch(CHROME?{executablePath:CHROME}:{})
// jednostavne provjere: skupljaju greške, na kraju run.mjs javi koliko je palo
export const GRESKE=[]
export function ok(uvjet, opis){ if(!uvjet){ GRESKE.push(opis); console.log('  ✗ '+opis) } else console.log('  ✓ '+opis) }
