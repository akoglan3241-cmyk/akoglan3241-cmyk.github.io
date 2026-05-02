# RPG Oyunu - Gelistirme Notlari

## Kurulum

### 1. Bagimliliklari Yukle
```bash
npm install
cd client && npm install
cd ../server && npm install
```

### 2. Veritabani Kurulumu
PostgreSQL kurulu olduktan sonra:
```bash
psql -U postgres -f scripts/init_db.sql
```

### 3. .env Dosyasi
`.env` dosyasini duzenleyin:
- Database bilgileri
- JWT secret
- Port ayarlari

### 4. Baslatma
```bash
# Server
cd server && npm run dev

# Client (yeni terminal)
cd client && npm run dev
```

## Asset Klasorleri

- `client/assets/images/` - Gorsel dosyalar
- `client/assets/sounds/` - Ses dosyalari
- `client/assets/fonts/` - Font dosyalari

## Uretilen Dosyalar

- `client/assets/tilemap.json` - Harita verisi
- `client/assets/sprites.json` - Sprite konfigürasyonu
- `client/assets/sounds.json` - Ses konfigürasyonu
- `client/assets/fonts.json` - Font ayarlari

## Test Hesabi

Gelistirme modunda otomatik kullanici olusturulur.

## Katki Saglama

1. Branch olustur
2. Degisiklikleri yap
3. Commit ve push
4. Pull request ac

