-- SQL script to create video_table_contents table for interactive video functionality
-- Run this directly in your PostgreSQL database

-- Create the video_table_contents table
CREATE TABLE video_table_contents (
    id SERIAL PRIMARY KEY,
    attachment_id INTEGER NOT NULL,
    content_name VARCHAR(255) NOT NULL,
    start_timestamp INTEGER NOT NULL, -- in seconds
    end_timestamp INTEGER NOT NULL,   -- in seconds
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_video_table_contents_attachment 
        FOREIGN KEY (attachment_id) 
        REFERENCES attachments(id) 
        ON DELETE CASCADE 
        ON UPDATE NO ACTION
);

-- Create indexes for better performance
CREATE INDEX idx_video_table_contents_attachment_id ON video_table_contents(attachment_id);
CREATE INDEX idx_video_table_contents_start_timestamp ON video_table_contents(start_timestamp);
CREATE INDEX idx_video_table_contents_order_index ON video_table_contents(order_index);

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_video_table_contents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_video_table_contents_updated_at
    BEFORE UPDATE ON video_table_contents
    FOR EACH ROW
    EXECUTE FUNCTION update_video_table_contents_updated_at();

-- Add some sample data (optional - remove if not needed)
-- This assumes you have attachment records with IDs 1 and 2 as shown in your example
INSERT INTO video_table_contents (attachment_id, content_name, start_timestamp, end_timestamp, description, order_index) VALUES
(1, 'Introduction', 0, 30, 'Video introduction and overview', 1),
(1, 'Main Content', 30, 120, 'Core lesson content', 2),
(1, 'Summary', 120, 150, 'Lesson summary and key points', 3),
(2, 'Getting Started', 0, 45, 'Introduction to the topic', 1),
(2, 'Deep Dive', 45, 180, 'Detailed explanation of concepts', 2),
(2, 'Practical Examples', 180, 240, 'Real-world examples and applications', 3),
(2, 'Conclusion', 240, 270, 'Wrap-up and next steps', 4);

-- Verify the table was created successfully
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'video_table_contents' 
ORDER BY ordinal_position;

-- Test query to see the structure with sample data
SELECT 
    vtc.*,
    a.attachment as video_url,
    a.type as attachment_type
FROM video_table_contents vtc
JOIN attachments a ON a.id = vtc.attachment_id
ORDER BY vtc.attachment_id, vtc.order_index;
