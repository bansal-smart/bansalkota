
INSERT INTO public.books (slug, title, author, subject, target_exam, class_level, description, cover_url, price, original_price, stock, is_published, tags)
VALUES
  ('sameer-bansal-problems-in-calculus', 'Problems in Calculus', 'Sameer Bansal Sir', 'Mathematics', 'JEE Advanced', 'Class 12', 'Best-selling JEE Main + Advanced problem book on Calculus by Sameer Bansal Sir. Published by G.R. Bathla & Sons.', '/__l5e/assets-v1/abf696e9-83b3-47c8-9463-2ebc6655b729/book-calculus.png', 575, 650, 100, true, ARRAY['JEE','Mathematics','Sameer Bansal','Bestseller']),
  ('sameer-bansal-problems-in-algebra', 'Problems in Algebra', 'Sameer Bansal Sir', 'Mathematics', 'JEE Advanced', 'Class 11', 'Best-selling JEE Main + Advanced problem book on Algebra by Sameer Bansal Sir. Published by G.R. Bathla & Sons.', '/__l5e/assets-v1/0e2a4a69-37f6-4fe1-acef-0d1c61a7ad32/book-algebra.png', 550, 625, 100, true, ARRAY['JEE','Mathematics','Sameer Bansal','Bestseller']),
  ('sameer-bansal-coordinate-geometry-vectors-3d', 'Coordinate Geometry, Trigonometry, Vectors & 3D Geometry', 'Sameer Bansal Sir', 'Mathematics', 'JEE Advanced', 'Class 12', 'Comprehensive problem book covering Coordinate Geometry, Trigonometry, Vectors and 3D Geometry for JEE Main + Advanced.', '/__l5e/assets-v1/ad50e5a2-f3c5-45c1-8fad-1716fb185e57/book-coordinate.png', 625, 720, 100, true, ARRAY['JEE','Mathematics','Sameer Bansal']),
  ('sameer-bansal-1000-challenging-problems', '1000 Challenging Problems in Mathematics', 'Sameer Bansal Sir', 'Mathematics', 'JEE Advanced', 'Class 12', '1000 hand-picked challenging problems in Mathematics for JEE Main + Advanced aspirants. Published by G.R. Bathla & Sons.', '/__l5e/assets-v1/d5315770-45e2-43d2-ae76-4a0c17f92323/book-mathematics.png', 695, 795, 100, true, ARRAY['JEE','Mathematics','Sameer Bansal','Advanced'])
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  author = EXCLUDED.author,
  cover_url = EXCLUDED.cover_url,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  original_price = EXCLUDED.original_price,
  is_published = true;
