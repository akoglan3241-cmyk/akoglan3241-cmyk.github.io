# BenimDünyam Tarzi Oyun Grafik Gelistirme Promptlari

Bu dokuman, [benimdunyam_graphics_prompts.txt](C:/Users/isoako1/Downloads/benimdunyam_graphics_prompts.txt) dosyasindaki grafik gelistirme isteklerini proje icine takip edilebilir bir art direction backlog olarak ekler.

Amac:
- gorsel gelistirmeleri tek yerde toplamak
- cozy ve performans dostu stil hedefini korumak
- mevcut placeholder/procedural grafik sistemini daha sistemli gelistirmek

## Ana Ilkeler

- consistency
- simplicity
- performance
- cozy visual style

## Grafik Fazlari

### 1. Color Palette System

Hedef:
- 10-15 renkli sinirli bir ana palet
- grass, road, building, UI ve sky icin tutarli tonlar
- mevcut procedural texture sistemini bu palete sabitlemek

Projede dokunulacak yerler:
- [createPlaceholderTextures.js](/C:/benimdünyam/client/src/game/utils/createPlaceholderTextures.js)
- [style.css](/C:/benimdünyam/client/src/styles/style.css)
- gerekirse yeni ortak palette dosyasi:
  - `client/src/game/visual/palette.js`

### 2. Lighting System

Hedef:
- global ambient tint
- gradient sky background
- karakter ve objelerin altinda yumusak golge
- background/foreground depth tint

Projede dokunulacak yerler:
- [buildRoomMap.js](/C:/benimdünyam/client/src/game/world/buildRoomMap.js)
- [createDayNightController.js](/C:/benimdünyam/client/src/game/world/createDayNightController.js)
- [TownScene.js](/C:/benimdünyam/client/src/game/scenes/TownScene.js)

### 3. Tile Improvement

Hedef:
- grass/path varyasyonlari
- terrain edge blending
- kucuk dekor dagitimi
- tekrar hissini azaltmak

Projede dokunulacak yerler:
- [buildRoomMap.js](/C:/benimdünyam/client/src/game/world/buildRoomMap.js)
- [core-rooms.json](/C:/benimdünyam/client/src/game/content/rooms/core-rooms.json)

### 4. Character Visuals

Hedef:
- idle motion
- basit walk animasyonu
- yumusak alt golge
- hafif hareket bounce
- gerekirse outline

Projede dokunulacak yerler:
- [Player.js](/C:/benimdünyam/client/src/game/entities/Player.js)
- [RemotePlayer.js](/C:/benimdünyam/client/src/game/entities/RemotePlayer.js)
- [AvatarSprite.js](/C:/benimdünyam/client/src/game/avatar/AvatarSprite.js)

### 5. Parallax System

Hedef:
- sky / cloud / tree katmanlari
- farkli hizlarda hareket
- yumusak ve hafif motion

Projede dokunulacak yerler:
- [LoginScene.js](/C:/benimdünyam/client/src/game/scenes/LoginScene.js)
- [buildRoomMap.js](/C:/benimdünyam/client/src/game/world/buildRoomMap.js)

### 6. Particle Effects

Hedef:
- yurumede dust
- pickup aninda sparkle
- chest acilisinda burst
- performans dostu efektler

Projede dokunulacak yerler:
- [Player.js](/C:/benimdünyam/client/src/game/entities/Player.js)
- [WorldPickup.js](/C:/benimdünyam/client/src/game/entities/WorldPickup.js)
- [TownScene.js](/C:/benimdünyam/client/src/game/scenes/TownScene.js)

### 7. UI Polish

Hedef:
- rounded corners
- soft shadow
- transparency
- hover/click feedback
- temiz okunabilir hierarchy

Not:
Bu alanin bir kismi zaten yapildi, ama grafik paketi olarak ikinci polish gecisi dusunulebilir.

Projede dokunulacak yerler:
- [createPanel.js](/C:/benimdünyam/client/src/game/ui/createPanel.js)
- [style.css](/C:/benimdünyam/client/src/styles/style.css)
- ana paneller altinda `client/src/game/ui/*`

### 8. Atmosphere System

Hedef:
- moving clouds
- birds veya hafif ambient motion
- rahatlatan ama dikkat dagitmayan dunya hissi

Projede dokunulacak yerler:
- [TownScene.js](/C:/benimdünyam/client/src/game/scenes/TownScene.js)
- [createWeatherController.js](/C:/benimdünyam/client/src/game/world/createWeatherController.js)
- [createDayNightController.js](/C:/benimdünyam/client/src/game/world/createDayNightController.js)

## Onerilen Uygulama Sirasi

1. color palette system
2. lighting system
3. tile improvement
4. character visuals
5. parallax system
6. particle effects
7. atmosphere system
8. final UI polish pass

## Not

Bu dosya kod degil; grafik backlog ve art direction referansi olarak tutulur.
