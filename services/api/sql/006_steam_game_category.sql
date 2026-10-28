ALTER TABLE products DROP CONSTRAINT IF EXISTS products_game_check;
ALTER TABLE products ADD CONSTRAINT products_game_check
  CHECK (game IN ('fortnite','valorant','lol','roblox','steam','other'));
