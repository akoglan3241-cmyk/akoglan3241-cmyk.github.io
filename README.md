# Social RPG Multiplayer Starter

Phaser 3 istemcisi ve Node.js + Socket.IO sunucusuyla calisan 2D ustten gorunumlu sosyal RPG temeli.

## Klasorler

- `client`: Phaser + Vite istemcisi
- `server`: Node.js + Socket.IO backend

## Kurulum

```bash
npm.cmd install --prefix client
npm.cmd install --prefix server
```

## Calistirma

Bir terminalde:

```bash
npm.cmd run dev:server
```

Diger terminalde:

```bash
npm.cmd run dev:client
```

## Ozellikler

- Oyuncular Socket.IO ile baglanir
- Ayni haritada birbirlerini gorur
- Pozisyonlar gercek zamanli senkronize edilir
- Oyuncu adlari diger oyuncularin ustunde gorunur
- Baglanti kopunca oyuncu haritadan silinir
- Gorev, inventory ve mevcut tek oyunculu sistemler korunur

## Yol Haritasi

- BenimDünyam tarzi faz bazli gelistirme paketi: [docs/benimdunyam-prompt-pack.md](/C:/benimdünyam/docs/benimdunyam-prompt-pack.md)
- Grafik gelistirme paketi: [docs/benimdunyam-graphics-prompt-pack.md](/C:/benimdünyam/docs/benimdunyam-graphics-prompt-pack.md)
- Karakter ozellestirme paketi: [docs/character-customization-prompt-pack.md](/C:/benimdünyam/docs/character-customization-prompt-pack.md)
- Deployment notlari: [docs/deployment.md](/C:/benimdünyam/docs/deployment.md)
