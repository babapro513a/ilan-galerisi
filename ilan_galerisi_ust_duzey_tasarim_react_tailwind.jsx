import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, HeartOff, Plus, Trash2, ChevronLeft, ChevronRight, Settings, X, MapPin } from "lucide-react";
// shadcn/ui components assumed available
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

// NOTE: This file is a single-file React app sketch that includes:
// - Extra listing fields (m², oda, açıklama)
// - Client-side image uploads (dataURLs) with preview (for real uploads you need a backend)
// - Simple auth & user roles (user/admin) stored in LocalStorage (for production use a secure backend)
// - Multilanguage support (Türkçe / English)
// - Map integration (react-leaflet) with pin selection (requires installing 'react-leaflet' and 'leaflet')
// - Admin panel + soft delete

// ------------------ CONFIG / DATA ------------------
const AREAS = {
  Balıkesir: ["Altınoluk", "Edremit", "Akçay", "Güre"],
  "Çanakkale": ["Ayvacık", "Merkez"],
};

const translations: Record<string, Record<string, string>> = {
  tr: {
    appTitle: "İlan Galerisi",
    create: "İlan Oluştur",
    adminPanel: "Admin Paneli",
    fav: "Favoriler",
    all: "Tümü",
    sqm: "Metrekare",
    rooms: "Oda",
    desc: "Açıklama",
    uploadHint: "Görselleri seçin veya sürükleyin (en fazla 25)",
    mapPick: "Haritadan Konum Seç",
    register: "Kayıt Ol",
    login: "Giriş Yap",
    logout: "Çıkış",
  },
  en: {
    appTitle: "Listing Gallery",
    create: "Create Listing",
    adminPanel: "Admin Panel",
    fav: "Favorites",
    all: "All",
    sqm: "Sqm",
    rooms: "Rooms",
    desc: "Description",
    uploadHint: "Select or drop images (max 25)",
    mapPick: "Pick location on map",
    register: "Register",
    login: "Login",
    logout: "Logout",
  },
};

const TRYFmt = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });

// small helper to create demo images
const makePicsum = (seed, count = 8) =>
  Array.from({ length: count }, (_, i) => `https://picsum.photos/seed/${encodeURIComponent(seed + "-" + (i + 1))}/1200/800`);

// ------------------ LocalStorage hook ------------------
function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { } }, [key, value]);
  return [value, setValue];
}

// ------------------ Main App ------------------
export default function App() {
  // listings now include sqm, rooms, description, coords, images (dataURLs or URLs)
  const seedListings = [
    {
      id: crypto.randomUUID(), title: "Ege Apartmanı", price: 15000000,
      province: "Çanakkale", district: "Ayvacık",
      sqm: 120, rooms: 3, description: "Denize yakın, aydınlık daire.",
      coords: { lat: 39.7, lng: 26.2 },
      images: makePicsum("Canakkale-Ayvacik-Ege", 12),
      removed: false,
    },
    {
      id: crypto.randomUUID(), title: "Akçay Sahil Sitesi 3+1", price: 11900000,
      province: "Balıkesir", district: "Akçay",
      sqm: 95, rooms: 3, description: "Site içinde, manzaralı.",
      coords: { lat: 39.57, lng: 26.8 },
      images: makePicsum("Akcay-Sahil-3plus1", 10),
      removed: false,
    },
  ];

  const [listings, setListings] = useLocalStorage("ig_listings_v2", seedListings);
  const [favorites, setFavorites] = useLocalStorage("ig_favorites_v2", []);
  const [users, setUsers] = useLocalStorage("ig_users_v2", [{ username: "admin", password: "admin", role: "admin" }]);
  const [auth, setAuth] = useLocalStorage("ig_auth_v2", null);

  const [lang, setLang] = useLocalStorage("ig_lang", "tr");
  const t = (k) => translations[lang][k] ?? k;

  const [province, setProvince] = useState(null);
  const [district, setDistrict] = useState(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");

  const [showCreate, setShowCreate] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [previewImages, setPreviewImages] = useState(null);

  const filtered = useMemo(() => {
    let data = listings.filter(l => !l.removed);
    if (province) data = data.filter(d => d.province === province);
    if (district) data = data.filter(d => d.district === district);
    if (tab === "fav") data = data.filter(d => favorites.includes(d.id));
    if (query.trim()) {
      const q = query.toLowerCase();
      data = data.filter(d => (d.title + " " + d.province + " " + d.district + " " + (d.description||"")).toLowerCase().includes(q));
    }
    return data;
  }, [listings, province, district, tab, favorites, query]);

  const currentUser = auth ? users.find(u => u.username === auth.username) : null;
  const isAdmin = currentUser?.role === "admin";

  const toggleFav = (id) => setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const softRemove = (id) => setListings(prev => prev.map(l => l.id === id ? { ...l, removed: true } : l));
  const hardDelete = (id) => { setListings(prev => prev.filter(l => l.id !== id)); setFavorites(prev => prev.filter(x => x !== id)); };
  const restore = (id) => setListings(prev => prev.map(l => l.id === id ? { ...l, removed: false } : l));

  // Create listing handler
  const createListing = (payload) => {
    setListings(prev => [{ id: crypto.randomUUID(), removed: false, ...payload }, ...prev]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-white">
      <TopBar lang={lang} setLang={setLang} t={t} auth={auth} setAuth={setAuth} users={users} setUsers={setUsers} openCreate={()=>setShowCreate(true)} openAdmin={()=>setAdminOpen(true)} />

      <div className="max-w-7xl mx-auto grid lg:grid-cols-[18rem_1fr] gap-6 p-6">
        <Sidebar AREAS={AREAS} province={province} setProvince={setProvince} district={district} setDistrict={setDistrict} t={t} />

        <main>
          <div className="flex gap-3 mb-4">
            <Input value={query} onChange={e=>setQuery(e.target.value)} placeholder={`${t('all')} · ${t('fav')}` } />
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="all">{t('all')}</TabsTrigger>
                <TabsTrigger value="fav">{t('fav')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map(item => (
              <Card key={item.id} className="rounded-2xl overflow-hidden">
                <div className="relative">
                  <img src={item.images?.[0]} className="w-full h-56 object-cover" />
                  <button onClick={()=>toggleFav(item.id)} className={`absolute top-3 right-3 p-2 rounded-full ${favorites.includes(item.id)?'bg-red-500 text-white':'bg-white'}`}>
                    {favorites.includes(item.id) ? <Heart/> : <HeartOff/>}
                  </button>
                  {isAdmin && <button onClick={()=>softRemove(item.id)} className="absolute top-3 left-3 p-2 bg-white rounded-full"><Trash2/></button>}
                  <Badge className="absolute bottom-3 left-3">{item.province} • {item.district}</Badge>
                </div>
                <CardHeader>
                  <CardTitle>{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-semibold">{TRYFmt.format(item.price)}</div>
                  <div className="text-sm text-muted-foreground mt-1">{item.sqm} m² • {item.rooms} oda</div>
                  <div className="mt-3 flex gap-2">
                    <Button onClick={()=>setPreviewImages(item.images)}>İlanı Gör</Button>
                    {item.coords && <Button variant="outline" onClick={()=>window.open(`https://www.google.com/maps?q=${item.coords.lat},${item.coords.lng}`)}><MapPin className="w-4 h-4 mr-2"/>Haritada Aç</Button>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>

      <CreateDialog open={showCreate} onOpenChange={setShowCreate} onCreate={createListing} AREAS={AREAS} t={t} lang={lang} />

      <AdminPanel open={adminOpen} onOpenChange={setAdminOpen} listings={listings} softRemove={softRemove} hardDelete={hardDelete} restore={restore} isAdmin={isAdmin} />

      <AnimatePresence>{previewImages && <ImageSlider images={previewImages} onClose={()=>setPreviewImages(null)} />}</AnimatePresence>

      <footer className="p-6 text-center text-sm">© {new Date().getFullYear()} - {t('appTitle')}</footer>
    </div>
  );
}

// ------------------ Components (CreateDialog with upload + map picker) ------------------
function CreateDialog({ open, onOpenChange, onCreate, AREAS, t, lang }){
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [province, setProvince] = useState(Object.keys(AREAS)[0]);
  const [district, setDistrict] = useState(AREAS[Object.keys(AREAS)[0]][0]);
  const [sqm, setSqm] = useState(80);
  const [rooms, setRooms] = useState(2);
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState([]);
  const [coords, setCoords] = useState(null);

  useEffect(()=>{ if (!AREAS[province]?.includes(district)) setDistrict(AREAS[province][0]); }, [province]);

  const onDropFiles = async (fileList) => {
    const arr = Array.from(fileList).slice(0,25);
    const dataUrls = await Promise.all(arr.map(f => fileToDataUrl(f)));
    setFiles(prev => [...prev, ...dataUrls].slice(0,25));
  };

  const submit = () => {
    const payload = {
      title: title || `${province} ${district} Yeni İlan`, price: Number(price) || 1000000,
      province, district, sqm: Number(sqm), rooms: Number(rooms), description, images: files.length? files : makePicsum(`${province}-${district}-${Date.now()}`, 8), coords,
    };
    onCreate(payload); onOpenChange(false);
    setTitle(""); setPrice(""); setFiles([]); setDescription(""); setSqm(80); setRooms(2); setCoords(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>{t('create')}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Başlık" />
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" value={price} onChange={e=>setPrice(e.target.value)} placeholder="Fiyat" />
            <Input type="number" value={sqm} onChange={e=>setSqm(e.target.value)} placeholder={t('sqm')} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={province} onChange={e=>setProvince(e.target.value)}>{Object.keys(AREAS).map(p=> <option key={p} value={p}>{p}</option>)}</select>
            <select value={district} onChange={e=>setDistrict(e.target.value)}>{AREAS[province].map(d=> <option key={d} value={d}>{d}</option>)}</select>
          </div>
          <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder={t('desc')} className="rounded-xl border p-2" />

          <div>
            <div className="text-sm mb-2">{t('uploadHint')}</div>
            <FileDrop files={files} setFiles={setFiles} onDropFiles={onDropFiles} />
          </div>

          <div>
            <div className="mb-2">{t('mapPick')}</div>
            <MapPicker coords={coords} setCoords={setCoords} />
          </div>

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={()=>onOpenChange(false)}>İptal</Button>
          <Button onClick={submit}><Plus/> {t('create')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// FileDrop: simple file picker + previews (stores dataURLs)
function FileDrop({ files, setFiles, onDropFiles }){
  const fileRef = useRef();
  return (
    <div>
      <div className="border-dashed border-2 rounded-2xl p-4 text-center">
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={e=>onDropFiles(e.target.files)} className="hidden" />
        <div className="flex items-center justify-center gap-3">
          <Button onClick={()=>fileRef.current.click()}>Seç</Button>
          <div className="text-sm text-muted-foreground">veya sürükle bırak</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {files.map((f, i)=> (
          <div key={i} className="rounded-lg overflow-hidden border">
            <img src={f} className="w-full h-24 object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
}

function fileToDataUrl(file){
  return new Promise((res, rej)=>{
    const r = new FileReader(); r.onload = ()=>res(r.result); r.onerror = rej; r.readAsDataURL(file);
  });
}

// MapPicker: simple map using Leaflet; for production install 'react-leaflet' + 'leaflet' and import components.
function MapPicker({ coords, setCoords }){
  // This is a placeholder. In a real project, install react-leaflet & leaflet and render MapContainer, TileLayer, Marker.
  // For the purposes of this single-file preview, we show a coordinate input.
  return (
    <div className="grid grid-cols-2 gap-2">
      <Input placeholder="Latitude" value={coords?.lat||''} onChange={e=>setCoords({ ...(coords||{}), lat: Number(e.target.value) })} />
      <Input placeholder="Longitude" value={coords?.lng||''} onChange={e=>setCoords({ ...(coords||{}), lng: Number(e.target.value) })} />
      <div className="col-span-2 text-xs text-muted-foreground">Gerçek harita entegrasyonu için 'react-leaflet' + provider anahtarları kurulmalı.</div>
    </div>
  );
}

function ImageSlider({ images, onClose }){
  const [index, setIndex] = useState(0); const total = images.length;
  useEffect(()=>{ const onKey = e=>{ if(e.key==='Escape') onClose(); if(e.key==='ArrowRight') setIndex(i=> (i+1)%total); if(e.key==='ArrowLeft') setIndex(i=> (i-1+total)%total); }; window.addEventListener('keydown', onKey); return ()=>window.removeEventListener('keydown', onKey); }, [total]);
  return (
    <div className="fixed inset-0 z-50 bg-black/90 text-white flex flex-col">
      <div className="flex items-center justify-between p-4"><div>{index+1}/{total}</div><button onClick={onClose}><X/></button></div>
      <div className="flex-1 grid place-items-center"><img src={images[index]} className="max-h-[80vh]" /></div>
      <div className="p-4 flex gap-2 overflow-auto">{images.map((s,i)=>(<button key={i} onClick={()=>setIndex(i)} className={`${i===index?'ring-2':'opacity-70'}`}><img src={s} className="h-20 w-32 object-cover"/></button>))}</div>
    </div>
  );
}

function TopBar({ lang, setLang, t, auth, setAuth, users, setUsers, openCreate, openAdmin }){
  const [showAuth, setShowAuth] = useState(false);
  const [mode, setMode] = useState('login');
  const [u, setU] = useState(''); const [p, setP] = useState('');

  const login = () => { const found = users.find(x=>x.username===u && x.password===p); if(found){ setAuth({ username: u }); setShowAuth(false); } else alert('Hatalı kullanıcı'); };
  const register = () => { if(users.find(x=>x.username===u)) return alert('Kullanıcı var'); setUsers(prev=>[...prev, { username: u, password: p, role: 'user' }]); alert('Kaydolundu'); setMode('login'); };

  return (
    <div className="sticky top-0 z-40 bg-white/70 backdrop-blur border-b">
      <div className="max-w-7xl mx-auto flex items-center gap-4 p-3">
        <div className="font-bold">{t('appTitle')}</div>
        <div className="ml-auto flex items-center gap-2">
          <select value={lang} onChange={e=>setLang(e.target.value)} className="rounded-xl border px-2 py-1">
            <option value="tr">TR</option>
            <option value="en">EN</option>
          </select>
          <Button onClick={openCreate}><Plus/> {t('create')}</Button>
          <Button variant="outline" onClick={openAdmin}><Settings/> {t('adminPanel')}</Button>
          {auth ? <Button variant="ghost" onClick={()=>setAuth(null)}>{t('logout')}</Button> : <Button onClick={()=>setShowAuth(true)}>{t('login')}</Button>}
        </div>
      </div>

      <Dialog open={showAuth} onOpenChange={setShowAuth}>
        <DialogContent>
          <DialogHeader><DialogTitle>{mode==='login'?t('login'):t('register')}</DialogTitle></DialogHeader>
          <div className="grid gap-2">
            <Input placeholder="Kullanıcı" value={u} onChange={e=>setU(e.target.value)} />
            <Input placeholder="Şifre" value={p} onChange={e=>setP(e.target.value)} type="password" />
            <div className="flex gap-2">
              <Button onClick={()=>{ if(mode==='login') login(); else register(); }}>{mode==='login'?t('login'):t('register')}</Button>
              <Button variant="outline" onClick={()=>setMode(mode==='login'?'register':'login')}>{mode==='login'?t('register'):t('login')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Sidebar({ AREAS, province, setProvince, district, setDistrict, t }){
  const [expanded, setExpanded] = useState(null);
  useEffect(()=> setExpanded(province ?? null), [province]);
  const toggleProvince = (p)=>{ if(province===p){ setProvince(null); setDistrict(null); setExpanded(null);} else { setProvince(p); setDistrict(null); setExpanded(p); } };
  const toggleDistrict = (d)=>{ if(district===d){ setProvince(null); setDistrict(null); setExpanded(null);} else setDistrict(d); };
  return (
    <aside className="w-full lg:w-72 sticky top-0 h-screen p-4 bg-white/60 backdrop-blur border-r">
      <div className="font-semibold mb-3">Kategoriler</div>
      <div className="space-y-2">
        {Object.entries(AREAS).map(([prov, dists])=> (
          <div key={prov}>
            <button onClick={()=>toggleProvince(prov)} className={`w-full text-left rounded-2xl px-3 py-2 ${province===prov?'bg-black text-white':''}`}>{prov}</button>
            {expanded===prov && <motion.div initial={{height:0}} animate={{height:'auto'}} className="p-2 grid grid-cols-2 gap-2">{dists.map(d=>(<button key={d} onClick={()=>toggleDistrict(d)} className={`rounded-xl px-2 py-1 ${district===d?'bg-zinc-900 text-white':''}`}>{d}</button>))}</motion.div>}
          </div>
        ))}
      </div>
    </aside>
  );
}

function AdminPanel({ open, onOpenChange, listings, softRemove, hardDelete, restore, isAdmin }){
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Admin Panel</DialogTitle></DialogHeader>
        <div className="max-h-[60vh] overflow-auto space-y-2">
          {listings.map(l=> (
            <div key={l.id} className="flex items-center gap-3 border rounded-xl p-2">
              <img src={l.images?.[0]} className="w-20 h-14 object-cover rounded" />
              <div className="flex-1">
                <div className="font-medium">{l.title}</div>
                <div className="text-xs text-muted-foreground">{l.province} • {l.district} • {TRYFmt.format(l.price)}</div>
              </div>
              {l.removed ? <Button onClick={()=>restore(l.id)}>Geri Al</Button> : <Button variant="destructive" onClick={()=>softRemove(l.id)}><Trash2/> Kaldır</Button>}
              {isAdmin && <Button variant="destructive" onClick={()=>hardDelete(l.id)}>Sil (kalıcı)</Button>}
            </div>
          ))}
        </div>
        <DialogFooter><Button onClick={()=>onOpenChange(false)}>Kapat</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------ Notes for production ------------------
/*
Production checklist / next steps (I implemented client-side features; for a production-grade app do the following):
1) Backend & API: create an API to store listings, users, images. Use JWT for auth.
2) File storage: upload files to S3 / Cloud Storage instead of storing base64 in DB/localStorage.
3) Real authentication: hashed passwords, email verification, password reset.
4) Map: integrate react-leaflet or Google Maps with API key and tile provider.
5) Search & filtering: server-side search & pagination for large datasets.
6) Security: rate-limiting, validations, sanitization, permissions checks for admin actions.
*/
