-- Insert default categories
INSERT INTO categories (name, color, icon) VALUES
('Makanan', '#EF4444', '🍔'),
('Transportasi', '#F59E0B', '🚗'),
('Belanja', '#8B5CF6', '🛒'),
('Hiburan', '#06B6D4', '🎬'),
('Kesehatan', '#10B981', '🏥'),
('Lainnya', '#6B7280', '📦')
ON CONFLICT (name) DO NOTHING;

-- Insert default sources
INSERT INTO sources (name, color, icon) VALUES
('Dompet', '#84CC16', '👛'),
('Bank', '#3B82F6', '🏦'),
('E-Wallet', '#F59E0B', '📱'),
('Kartu Kredit', '#EF4444', '💳')
ON CONFLICT (name) DO NOTHING;
