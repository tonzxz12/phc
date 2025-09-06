-- Insert report reasons for the moderation system
INSERT INTO report_reasons (id, code, name, description, "isActive", createdat) VALUES
(1, 'spam', 'Spam', 'Unwanted commercial content or repetitive posts', true, NOW()),
(2, 'harassment', 'Harassment', 'Bullying, threats, or intimidating behavior', true, NOW()),
(3, 'inappropriate_content', 'Inappropriate Content', 'Content not suitable for educational environment', true, NOW()),
(4, 'hate_speech', 'Hate Speech', 'Content promoting hatred based on identity', true, NOW()),
(5, 'violence', 'Violence or Threats', 'Content promoting or threatening violence', true, NOW()),
(6, 'misinformation', 'Misinformation', 'False or misleading information', true, NOW()),
(7, 'off_topic', 'Off Topic', 'Content not related to the course or discussion', true, NOW()),
(8, 'other', 'Other', 'Other reason not listed above', true, NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  "isActive" = EXCLUDED."isActive";
