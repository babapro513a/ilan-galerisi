import { useState } from "react";

const ilanlar = [
  {
    id: 1,
    baslik: "Çanakkale Ayvacık Ege Apartmanı",
    fiyat: "15.000.000 TL",
    kategori: "Çanakkale/Ayvacık",
    resimler: [
      "/img1.jpg",
      "/img2.jpg",
      "/img3.jpg"
    ]
  },
  {
    id: 2,
    baslik: "Balıkesir Altınoluk Villa",
    fiyat: "12.000.000 TL",
    kategori: "Balıkesir/Altınoluk",
    resimler: [
      "/img4.jpg",
      "/img5.jpg",
      "/img6.jpg"
    ]
  }
];

export default function Home() {
  const [seciliKategori, setSeciliKategori] = useState("Tümü");
  const [favoriler, setFavoriler] = useState([]);
  const [aktifResim, setAktifResim] = useState(null);

  const filtreliIlanlar =
    seciliKategori === "Tümü"
      ? ilanlar
      : ilanlar.filter(i => i.kategori.includes(seciliKategori));

  const favoriToggle = (id) => {
    setFavoriler(favoriler.includes(id)
      ? favoriler.filter(f => f !== id)
      : [...favoriler, id]);
  };

  return (
    <div style={{ display: "flex" }}>
      {/* Sol Menü */}
      <div style={{ width: "200px", background: "#f3f3f3", padding: "10px" }}>
        <h3>Kategoriler</h3>
        <button onClick={() => setSeciliKategori("Tümü")}>Tümü</button>
        <button onClick={() => setSeciliKategori("Balıkesir")}>Balıkesir</button>
        <button onClick={() => setSeciliKategori("Çanakkale")}>Çanakkale</button>
      </div>

      {/* İlanlar */}
      <div style={{ flex: 1, padding: "10px" }}>
        <h2>İlanlar ({seciliKategori})</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
          {filtreliIlanlar.map(i => (
            <div key={i.id} style={{ border: "1px solid #ccc", padding: "10px" }}>
              <h3>{i.baslik}</h3>
              <p>{i.fiyat}</p>
              <img
                src={i.resimler[0]}
                alt={i.baslik}
                style={{ width: "100%", height: "150px", objectFit: "cover", cursor: "pointer" }}
                onClick={() => setAktifResim(i)}
              />
              <button onClick={() => favoriToggle(i.id)}>
                {favoriler.includes(i.id) ? "Favoriden Çıkar" : "Favorilere Ekle"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Slider Modal */}
      {aktifResim && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0,
            width: "100%", height: "100%",
            background: "rgba(0,0,0,0.8)",
            display: "flex", justifyContent: "center", alignItems: "center"
          }}
          onClick={() => setAktifResim(null)}
        >
          <div style={{ width: "80%", background: "#fff", padding: "20px" }}>
            <h2>{aktifResim.baslik}</h2>
            <div style={{ display: "flex", gap: "10px", overflowX: "scroll" }}>
              {aktifResim.resimler.map((r, index) => (
                <img key={index} src={r} style={{ width: "300px" }} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
