CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quizzes (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT false,
    pass_threshold INTEGER CHECK (pass_threshold IS NULL OR pass_threshold BETWEEN 0 AND 100),
    one_attempt BOOLEAN NOT NULL DEFAULT false,
    show_answers BOOLEAN NOT NULL DEFAULT false,
    created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE questions (
    id BIGSERIAL PRIMARY KEY,
    quiz_id BIGINT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    UNIQUE (quiz_id, order_index)
);

CREATE TABLE answers (
    id BIGSERIAL PRIMARY KEY,
    question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    order_index INTEGER NOT NULL,
    UNIQUE (question_id, order_index)
);

CREATE TABLE attempts (
    id BIGSERIAL PRIMARY KEY,
    quiz_id BIGINT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 0),
    total INTEGER NOT NULL CHECK (total > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE attempt_answers (
    id BIGSERIAL PRIMARY KEY,
    attempt_id BIGINT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    answer_id BIGINT NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
    UNIQUE (attempt_id, question_id)
);

CREATE INDEX quizzes_published_idx ON quizzes (is_published);
CREATE INDEX questions_quiz_order_idx ON questions (quiz_id, order_index);
CREATE INDEX answers_question_order_idx ON answers (question_id, order_index);
CREATE INDEX attempts_user_quiz_idx ON attempts (user_id, quiz_id, created_at DESC);
