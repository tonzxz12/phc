-- Insert default report reasons
INSERT INTO report_reasons (code, name, description, isActive) VALUES
('SPAM', 'Spam or Promotional Content', 'Unwanted promotional content, advertisements, or repetitive messaging', true),
('HARASSMENT', 'Harassment or Bullying', 'Content that harasses, intimidates, or bullies other users', true),
('HATE_SPEECH', 'Hate Speech', 'Content promoting hatred or discrimination based on identity', true),
('INAPPROPRIATE', 'Inappropriate Content', 'Content that is sexually explicit, violent, or otherwise inappropriate', true),
('MISINFORMATION', 'False Information', 'Content containing false, misleading, or inaccurate information', true),
('COPYRIGHT', 'Copyright Violation', 'Content that violates copyright or intellectual property rights', true),
('PRIVACY', 'Privacy Violation', 'Content that violates privacy or shares personal information without consent', true),
('VIOLENCE', 'Violence or Threats', 'Content containing threats of violence or promoting violent behavior', true),
('IMPERSONATION', 'Impersonation', 'Content impersonating another person or organization', true),
('OFF_TOPIC', 'Off-Topic or Irrelevant', 'Content that is not relevant to the discussion or community', true),
('SELF_HARM', 'Self-Harm Content', 'Content promoting or depicting self-harm or suicide', true),
('OTHER', 'Other', 'Other violations not covered by the above categories', true);

-- Insert default censored words
INSERT INTO censored_words (word, description, severity, category, added_by, isActive) VALUES
-- High severity profanity
('fuck', 'Strong profanity', 'high', 'profanity', 'admin_id_here', true),
('shit', 'Profanity', 'medium', 'profanity', 'admin_id_here', true),
('damn', 'Mild profanity', 'low', 'profanity', 'admin_id_here', true),
('bitch', 'Offensive term', 'high', 'profanity', 'admin_id_here', true),

-- Harassment terms
('kill yourself', 'Extreme harassment', 'extreme', 'harassment', 'admin_id_here', true),
('kys', 'Extreme harassment abbreviation', 'extreme', 'harassment', 'admin_id_here', true),
('loser', 'Mild harassment', 'low', 'harassment', 'admin_id_here', true),
('stupid', 'Mild insult', 'low', 'harassment', 'admin_id_here', true),
('idiot', 'Insult', 'medium', 'harassment', 'admin_id_here', true),

-- Hate speech
('nazi', 'Hate speech', 'extreme', 'hate_speech', 'admin_id_here', true),
('terrorist', 'Hate speech', 'high', 'hate_speech', 'admin_id_here', true),

-- Spam indicators
('click here', 'Spam indicator', 'medium', 'spam', 'admin_id_here', true),
('buy now', 'Spam indicator', 'medium', 'spam', 'admin_id_here', true),
('free money', 'Spam indicator', 'medium', 'spam', 'admin_id_here', true),
('earn cash', 'Spam indicator', 'medium', 'spam', 'admin_id_here', true),

-- Violence
('bomb', 'Violence reference', 'high', 'violence', 'admin_id_here', true),
('murder', 'Violence reference', 'high', 'violence', 'admin_id_here', true),
('attack', 'Violence reference', 'medium', 'violence', 'admin_id_here', true);

-- Note: Replace 'admin_id_here' with actual admin ID when implementing
