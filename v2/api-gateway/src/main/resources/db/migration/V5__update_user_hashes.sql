-- Update demo user hashes with valid BCrypt hashes for 'demo123'
UPDATE users SET password_hash = '$2a$12$fLhgNnc38FJ985MNw0nDfutCjFi141nbgcKH8emEhW7RZQ2Q6.H22' WHERE email IN ('student@example.com', 'teacher@example.com');
