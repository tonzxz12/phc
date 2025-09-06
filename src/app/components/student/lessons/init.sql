CREATE TABLE read_topics (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(32) NOT NULL,
    topic_id VARCHAR(32) NOT NULL,
    is_finished BOOLEAN DEFAULT FALSE, -- Changed from is_read to is_finished
    finished_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Changed from read_at to finished_at
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (topic_id) REFERENCES topics(topicid) ON DELETE CASCADE
);