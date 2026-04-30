# Karakter ve Ozellestirme Gelistirme Promptlari

Bu dokuman, [character_customization_prompts.txt](C:/Users/isoako1/Downloads/character_customization_prompts.txt) dosyasindaki karakter ve ozellestirme isteklerini proje icine duzenli bir backlog olarak ekler.

Amaç:
- mevcut layered avatar sistemini daha temiz bir sanat yonune tasimak
- karakter okunabilirligini ve cozy hissini guclendirmek
- customization ekranini daha modern hale getirmek

## Ana Ilkeler

- simplicity over complexity
- consistent art style
- readability in motion
- cozy and friendly feel

## Gelistirme Basliklari

### 1. Character Style System

Hedef:
- yuvarlak formlar
- hafif buyuk kafa, daha kucuk govde
- keskin kenarlardan kacis
- kucuk olcekte okunabilir karakter
- top-down veya hafif acili gorunume uygun stil

Dokunulacak yerler:
- [AvatarSprite.js](/C:/benimdünyam/client/src/game/avatar/AvatarSprite.js)
- [createPlaceholderTextures.js](/C:/benimdünyam/client/src/game/utils/createPlaceholderTextures.js)

### 2. Character Base Model

Hedef:
- modular base system
- katmanlar:
  - body
  - hair
  - top
  - bottom
  - accessory
- ortak anchor/alignment noktasi

Not:
Bu temel sistem projede var, ama daha tutarli hale getirilebilir.

Dokunulacak yerler:
- [AvatarSprite.js](/C:/benimdünyam/client/src/game/avatar/AvatarSprite.js)
- [Player.js](/C:/benimdünyam/client/src/game/entities/Player.js)
- [RemotePlayer.js](/C:/benimdünyam/client/src/game/entities/RemotePlayer.js)

### 3. Character Color Improvement

Hedef:
- sinirli palette
- hafif ton gecisleri
- body / clothing contrast
- canli ama yumusak renkler

Dokunulacak yerler:
- [avatarOptions.js](/C:/benimdünyam/client/src/game/avatar/avatarOptions.js)
- [createPlaceholderTextures.js](/C:/benimdünyam/client/src/game/utils/createPlaceholderTextures.js)

### 4. Character Shading

Hedef:
- top-down light hissi
- ustte hafif highlight
- govde altinda koyu ton
- minimal temiz shading

Dokunulacak yerler:
- [createPlaceholderTextures.js](/C:/benimdünyam/client/src/game/utils/createPlaceholderTextures.js)

### 5. Outline System

Hedef:
- ince koyu outline
- her zeminde okunabilirlik
- tum parcalarda tutarli outline dili

Dokunulacak yerler:
- [createPlaceholderTextures.js](/C:/benimdünyam/client/src/game/utils/createPlaceholderTextures.js)
- [Player.js](/C:/benimdünyam/client/src/game/entities/Player.js)
- [RemotePlayer.js](/C:/benimdünyam/client/src/game/entities/RemotePlayer.js)

### 6. Idle Animation

Hedef:
- nefes alma hissi
- hafif yukari/asagi motion
- opsiyonel blink
- yumusak loop

Dokunulacak yerler:
- [Player.js](/C:/benimdünyam/client/src/game/entities/Player.js)
- [RemotePlayer.js](/C:/benimdünyam/client/src/game/entities/RemotePlayer.js)

### 7. Walk Animation

Hedef:
- 2-4 frame hissi
- bounce
- hareket hizina gore senkron

Dokunulacak yerler:
- [Player.js](/C:/benimdünyam/client/src/game/entities/Player.js)
- [RemotePlayer.js](/C:/benimdünyam/client/src/game/entities/RemotePlayer.js)

### 8. Accessory System

Hedef:
- hat, glasses, backpack benzeri aksesuarlar
- clipping sorunlarini azaltmak
- kafa/govde ile dogru olceklenme

Dokunulacak yerler:
- [avatarOptions.js](/C:/benimdünyam/client/src/game/avatar/avatarOptions.js)
- [AvatarSprite.js](/C:/benimdünyam/client/src/game/avatar/AvatarSprite.js)

### 9. Hair System

Hedef:
- daha fazla sac modeli
- sade sekiller
- renk varyasyonlari
- mevcut stil ile uyum

Dokunulacak yerler:
- [avatarOptions.js](/C:/benimdünyam/client/src/game/avatar/avatarOptions.js)
- [createPlaceholderTextures.js](/C:/benimdünyam/client/src/game/utils/createPlaceholderTextures.js)

### 10. Clothing System

Hedef:
- top ve bottom cesitliligi
- hafif fold/shading
- renk varyasyonlari
- sabit oranlar

Dokunulacak yerler:
- [avatarOptions.js](/C:/benimdünyam/client/src/game/avatar/avatarOptions.js)
- [createPlaceholderTextures.js](/C:/benimdünyam/client/src/game/utils/createPlaceholderTextures.js)

### 11. Customization UI

Hedef:
- ortada canli preview
- hair / top / bottom / accessory sekmeleri
- anlik guncelleme
- sade modern arayuz

Not:
Bu temel sistem mevcut; ikinci bir polish gecisi icin kullanilabilir.

Dokunulacak yerler:
- [CustomizeScene.js](/C:/benimdünyam/client/src/game/scenes/CustomizeScene.js)
- [LoginScene.js](/C:/benimdünyam/client/src/game/scenes/LoginScene.js)
- [style.css](/C:/benimdünyam/client/src/styles/style.css)

### 12. Random Character Generator

Hedef:
- randomize tum parcalar
- gecerli kombinasyonlar
- reroll butonu
- anlik preview

Dokunulacak yerler:
- [CustomizeScene.js](/C:/benimdünyam/client/src/game/scenes/CustomizeScene.js)
- [avatarOptions.js](/C:/benimdünyam/client/src/game/avatar/avatarOptions.js)

### 13. Rarity Cosmetics

Hedef:
- common / rare / epic kozmetik ayrimi
- nadir item vurgusu
- inventory/shop ile entegrasyon

Not:
Bu kismin temeli projede zaten var; karakter odakli ikinci polish gecisine konu olabilir.

### 14. Character Shadow

Hedef:
- karakter altinda yumusak dairesel golge
- hareket ederken hafif olcek degisimi
- idle iken hafif fade

Dokunulacak yerler:
- [Player.js](/C:/benimdünyam/client/src/game/entities/Player.js)
- [RemotePlayer.js](/C:/benimdünyam/client/src/game/entities/RemotePlayer.js)

### 15. Character Polish Pass

Hedef:
- tum parcalarda tutarlilik
- okunabilirlik
- performans korumasiyla son gorsel duzeltmeler

## Onerilen Uygulama Sirasi

1. character style system
2. character color improvement
3. character shading
4. outline system
5. idle + walk polish
6. hair / clothing / accessory pass
7. customization UI polish
8. random character generator
9. final character polish pass

## Not

Bu dosya kod degil; karakter gorsel backlog ve customization art direction dokumani olarak tutulur.
