CREATE TABLE flashcard_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pdf_id UUID REFERENCES pdf_documents(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    interval_days INT NOT NULL DEFAULT 1,
    repetition_count INT NOT NULL DEFAULT 0,
    ease_factor DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    next_review_date DATE NOT NULL,
    last_review_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pdf_id UUID REFERENCES pdf_documents(id) ON DELETE SET NULL,
    topic VARCHAR(255) NOT NULL,
    score INT NOT NULL,
    total_questions INT NOT NULL,
    difficulty VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL,
    time_spent_seconds INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    exam_date DATE NOT NULL,
    hours_per_day INT NOT NULL,
    total_days INT NOT NULL,
    total_hours DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE study_plan_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL
);

CREATE TABLE study_plan_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_id UUID NOT NULL REFERENCES study_plan_days(id) ON DELETE CASCADE,
    topic VARCHAR(255) NOT NULL,
    hours DOUBLE PRECISION NOT NULL,
    activity_type VARCHAR(100) NOT NULL
);

-- Seed 1 flashcard deck for student
INSERT INTO flashcard_decks (id, user_id, pdf_id, name) VALUES
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Sample Deck');

-- Seed 2 flashcards
INSERT INTO flashcards (id, deck_id, question, answer, interval_days, repetition_count, ease_factor, next_review_date, status) VALUES
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'What is the main topic of sample course?', 'Artificial Intelligence and Agentic Workflows', 1, 0, 2.5, CURRENT_DATE + INTERVAL '1 day', 'new'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'How does dense retrieval work?', 'By matching document vector embeddings using cosine similarity', 1, 0, 2.5, CURRENT_DATE + INTERVAL '1 day', 'new');

-- Seed 1 study plan
INSERT INTO study_plans (id, user_id, title, exam_date, hours_per_day, total_days, total_hours) VALUES
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'AI Exam Study Plan', CURRENT_DATE + INTERVAL '7 days', 2, 7, 14.0);

INSERT INTO study_plan_days (id, plan_id, activity_date) VALUES
('00eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', CURRENT_DATE + INTERVAL '1 day');

INSERT INTO study_plan_activities (id, day_id, topic, hours, activity_type) VALUES
('10eebc99-9c0b-4ef8-bb6d-6bb9bd380a99', '00eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', 'RAG Embeddings', 2.0, 'Review Summary & Quiz');
