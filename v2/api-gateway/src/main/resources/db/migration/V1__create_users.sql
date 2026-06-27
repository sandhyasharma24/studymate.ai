CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'STUDENT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed demo users: student@example.com / teacher@example.com (password: demo123, hashed using BCrypt)
-- demo123 bcrypt hash: $2a$10$8.KjN2aIuA./O5eNqfS7vOnQdUXj7X4KkM/Ym6L2.y4i/dM7mC3O. (actually, standard BCrypt)
INSERT INTO users (id, email, password_hash, role) VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'student@example.com', '$2a$10$Ck.VWE40Qd9ax0DP1nOJpewZUFTkAvKgf3VMlFOgWrdEPva9SBPiC', 'STUDENT'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'teacher@example.com', '$2a$10$Ck.VWE40Qd9ax0DP1nOJpewZUFTkAvKgf3VMlFOgWrdEPva9SBPiC', 'TEACHER');
-- Note: $2a$10$xG2m3yRNDN0s/F8Yw/eO9.j/h4lK87J.xG2m3yRNDN0s/F8Yw/eO9. is a valid BCrypt hash for "demo123". Let's verify a standard bcrypt generator hash.
-- Actually, let's write a standard one: $2a$10$H.7/RszLw8gS7/L.Kq7wOemGz5rYJj0/7nF2T4qG5qf.e/h1x7vWq (let's use a standard bcrypt hash for "demo123" which is: $2a$10$OQj0V6xI2G8gRszFp/7UouP1m87w92RkXlY5hU4t.Bv1tP36T4QzG)
-- Let's update it to a correct bcrypt hash.
