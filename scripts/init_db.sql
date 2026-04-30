-- RPG Oyunu Veritabani Kurulum Scripti

-- Kullanici tablosu
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Karakter tablosu
CREATE TABLE IF NOT EXISTS characters (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(50) NOT NULL,
    class VARCHAR(30) DEFAULT 'warrior',
    level INTEGER DEFAULT 1,
    exp INTEGER DEFAULT 0,
    gold INTEGER DEFAULT 100,
    hp INTEGER DEFAULT 100,
    max_hp INTEGER DEFAULT 100,
    mp INTEGER DEFAULT 50,
    max_mp INTEGER DEFAULT 50,
    strength INTEGER DEFAULT 10,
    agility INTEGER DEFAULT 10,
    intelligence INTEGER DEFAULT 10,
    x_pos INTEGER DEFAULT 0,
    y_pos INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Envanter tablosu
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    character_id INTEGER REFERENCES characters(id),
    item_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    equipped BOOLEAN DEFAULT FALSE
);

-- Gorev tablosu
CREATE TABLE IF NOT EXISTS quests (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    reward_gold INTEGER DEFAULT 0,
    reward_exp INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE
);

-- Karakter gorev ilerlemesi
CREATE TABLE IF NOT EXISTS character_quests (
    id SERIAL PRIMARY KEY,
    character_id INTEGER REFERENCES characters(id),
    quest_id INTEGER REFERENCES quests(id),
    status VARCHAR(20) DEFAULT 'active',
    progress INTEGER DEFAULT 0,
    completed_at TIMESTAMP
);

-- Indexler
CREATE INDEX IF NOT EXISTS idx_characters_user ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_character ON inventory(character_id);
CREATE INDEX IF NOT EXISTS idx_character_quests_character ON character_quests(character_id);

INSERT INTO quests (title, description, reward_gold, reward_exp) VALUES
('Ilk Adimlar', 'Koy meydanina git ve Egitmen ile konus.', 50, 100),
('Toplayici', '5 adet Sifali Bitki topla.', 100, 150),
('Avci', '3 adet Kurt avla.', 150, 200);

