export function createAuthFormMarkup() {
  return `
    <form class="auth-form" data-auth-mode="login">
      <div class="auth-form__modes" role="tablist" aria-label="Giris Modu">
        <button type="button" class="auth-form__mode is-active" data-auth-mode="login">Giris</button>
        <button type="button" class="auth-form__mode" data-auth-mode="register">Kayit</button>
        <button type="button" class="auth-form__mode" data-auth-mode="guest">Misafir</button>
      </div>

      <div class="auth-form__summary">
        <strong data-auth-title>Giris Yap</strong>
        <span data-auth-description>Hesabinla gir ve kayitli ilerlemeni kaldigin yerden devam ettir.</span>
      </div>

      <div class="auth-form__field auth-form__field--player-name">
        <label for="playerName">Oyuncu Adi</label>
        <input id="playerName" name="playerName" type="text" maxlength="18" value="Traveler" />
      </div>

      <div class="auth-form__field auth-form__field--username">
        <label for="username">Kullanici Adi</label>
        <input id="username" name="username" type="text" maxlength="32" value="" />
      </div>

      <div class="auth-form__field auth-form__field--password">
        <label for="password">Sifre</label>
        <input id="password" name="password" type="password" maxlength="64" value="" />
      </div>

      <div class="auth-form__notes">
        <span data-auth-note-login>Kayitli hesabina hizlica gir.</span>
        <span data-auth-note-register>Yeni hesap ac, oyuncu adini belirle ve kalici olarak devam et.</span>
        <span data-auth-note-guest>Misafir ilerlemesi gecicidir. Istersen sonra hesap olusturabilirsin.</span>
      </div>

      <div class="auth-form__actions">
        <button type="submit" data-auth-primary>Giris Yap</button>
      </div>
    </form>
  `;
}
