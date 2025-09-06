#!/bin/bash

# PostgreSQL Performance Optimization Script
# Run this on your PostgreSQL database server (separate VM)

echo "🗄️ PostgreSQL Performance Optimization for Harfai LMS"
echo "📍 Running on: Database Server VM"

# Get database details
read -p "Enter database name (default: harfai_lms): " DB_NAME
DB_NAME=${DB_NAME:-harfai_lms}

echo "🔧 Starting PostgreSQL optimization..."

# Create backup directory
mkdir -p /var/backups/harfai_lms_db_optimization/$(date +%Y%m%d)

# 1. Backup current database
echo "📥 Creating database backup..."
sudo -u postgres pg_dump $DB_NAME > /var/backups/harfai_lms_db_optimization/$(date +%Y%m%d)/harfai_lms_backup.sql

# 2. Add performance indexes
echo "📊 Adding performance indexes..."
sudo -u postgres psql $DB_NAME << 'EOF'
-- Start transaction
BEGIN;

-- Core indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courses_teacherid ON courses(teacherid);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courses_languageid ON courses(languageid);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lessons_courseid ON lessons(courseid);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lessons_sequence ON lessons(courseid, sequence);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_classes_courseid ON classes(courseid);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_classes_classid ON student_classes(classid);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_classes_studentid ON student_classes(studentid);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_classes_composite ON student_classes(classid, studentid);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lessons_taken_lessonid ON lessons_taken(lessonid);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lessons_taken_studentid ON lessons_taken(studentid);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lessons_taken_composite ON lessons_taken(lessonid, studentid);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lessons_taken_progress ON lessons_taken(studentid, progress);

-- Assessment related indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assessments_courseid ON assessments(courseid);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assessments_classid ON assessments(classid);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assessment_items_assessmentid ON assessment_items(assessmentid);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_assessments_studentid ON student_assessments(studentid);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_assessments_assessmentid ON student_assessments(assessmentid);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_assessments_composite ON student_assessments(studentid, assessmentid);

-- Assignment indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assignments_courseid ON assignments(courseid);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assignments_classid ON assignments(classid);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_assignments_studentid ON student_assignments(studentid);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_assignments_assignmentid ON student_assignments(assignmentid);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_assignments_composite ON student_assignments(studentid, assignmentid);

-- Time-based indexes for monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_lastseen ON students(lastseen);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teachers_lastseen ON teachers(lastseen);

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courses_teacher_language ON courses(teacherid, languageid);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_classes_course_composite ON classes(courseid, id);

-- Commit changes
COMMIT;

-- Enable pg_stat_statements for query monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Update table statistics
ANALYZE;

-- Show created indexes
SELECT schemaname, tablename, indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
EOF

echo "✅ Database indexes created successfully!"

# 3. Optimize PostgreSQL configuration
echo "⚙️ Optimizing PostgreSQL configuration..."

# Backup current postgresql.conf
sudo cp /etc/postgresql/*/main/postgresql.conf /var/backups/harfai_lms_db_optimization/$(date +%Y%m%d)/

# Get system memory for optimization
TOTAL_MEM=$(free -m | awk 'NR==2{printf "%.0f", $2}')
SHARED_BUFFERS=$((TOTAL_MEM / 4))  # 25% of RAM
EFFECTIVE_CACHE=$((TOTAL_MEM * 3 / 4))  # 75% of RAM

echo "📊 System Memory: ${TOTAL_MEM}MB"
echo "📊 Shared Buffers: ${SHARED_BUFFERS}MB"
echo "📊 Effective Cache: ${EFFECTIVE_CACHE}MB"

# Apply optimizations
sudo tee -a /etc/postgresql/*/main/postgresql.conf << EOF

# Performance optimizations for Harfai LMS Database Server
# Added on $(date)
# System RAM: ${TOTAL_MEM}MB

# Memory settings (optimized for dedicated database server)
shared_buffers = ${SHARED_BUFFERS}MB
effective_cache_size = ${EFFECTIVE_CACHE}MB
work_mem = 32MB
maintenance_work_mem = 256MB
wal_buffers = 16MB

# Connection settings (for network access)
max_connections = 200
listen_addresses = '*'
shared_preload_libraries = 'pg_stat_statements'

# Query optimization for network latency
random_page_cost = 1.1
effective_io_concurrency = 200
seq_page_cost = 1.0

# WAL settings for better performance
wal_level = replica
max_wal_size = 2GB
min_wal_size = 1GB
checkpoint_completion_target = 0.9
checkpoint_timeout = 15min

# Network and timeout settings
tcp_keepalives_idle = 600
tcp_keepalives_interval = 30
tcp_keepalives_count = 3
statement_timeout = 60000  # 60 seconds
lock_timeout = 30000  # 30 seconds

# Logging for monitoring
log_min_duration_statement = 1000  # Log queries taking more than 1 second
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_temp_files = 10MB
log_autovacuum_min_duration = 0

# Auto vacuum settings for better maintenance
autovacuum = on
autovacuum_max_workers = 3
autovacuum_naptime = 20s
autovacuum_vacuum_threshold = 50
autovacuum_analyze_threshold = 50
autovacuum_vacuum_scale_factor = 0.1
autovacuum_analyze_scale_factor = 0.05
EOF

# 4. Configure pg_hba.conf for network access
echo "🌐 Configuring network access..."

# Backup pg_hba.conf
sudo cp /etc/postgresql/*/main/pg_hba.conf /var/backups/harfai_lms_db_optimization/$(date +%Y%m%d)/

# Add network access rules (adjust IP ranges as needed)
sudo tee -a /etc/postgresql/*/main/pg_hba.conf << 'EOF'

# Network access for Harfai LMS backend servers
# Add specific IP ranges for your GCP backend servers
host    all             all             10.0.0.0/8               md5
host    all             all             172.16.0.0/12            md5
host    all             all             192.168.0.0/16           md5
EOF

# 5. Create monitoring views
echo "📈 Creating monitoring views..."
sudo -u postgres psql $DB_NAME << 'EOF'
-- Create view for slow queries
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    stddev_exec_time,
    min_exec_time,
    max_exec_time,
    rows
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC;

-- Create view for table sizes
CREATE OR REPLACE VIEW table_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY size_bytes DESC;

-- Create view for index usage
CREATE OR REPLACE VIEW index_usage AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Grant access to monitoring views
GRANT SELECT ON slow_queries TO PUBLIC;
GRANT SELECT ON table_sizes TO PUBLIC;
GRANT SELECT ON index_usage TO PUBLIC;
EOF

# 6. Create monitoring script
echo "📊 Creating database monitoring script..."
sudo tee /opt/db_monitor.sh << 'EOF'
#!/bin/bash
# Database Performance Monitor

LOG_FILE="/var/log/harfai_db_monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] === Database Performance Report ===" >> $LOG_FILE

# Connection stats
echo "Active Connections:" >> $LOG_FILE
sudo -u postgres psql harfai_lms -c "
SELECT state, count(*) 
FROM pg_stat_activity 
WHERE datname = 'harfai_lms' 
GROUP BY state;" >> $LOG_FILE 2>&1

# Slow queries
echo "Slowest Queries (>1 second):" >> $LOG_FILE
sudo -u postgres psql harfai_lms -c "
SELECT query, calls, mean_exec_time 
FROM slow_queries 
LIMIT 5;" >> $LOG_FILE 2>&1

# Database size
echo "Database Size:" >> $LOG_FILE
sudo -u postgres psql harfai_lms -c "
SELECT pg_size_pretty(pg_database_size('harfai_lms'));" >> $LOG_FILE 2>&1

# Table sizes
echo "Largest Tables:" >> $LOG_FILE
sudo -u postgres psql harfai_lms -c "
SELECT tablename, size 
FROM table_sizes 
LIMIT 10;" >> $LOG_FILE 2>&1

# Index usage
echo "Index Usage:" >> $LOG_FILE
sudo -u postgres psql harfai_lms -c "
SELECT tablename, indexname, idx_scan 
FROM index_usage 
WHERE idx_scan > 0 
ORDER BY idx_scan DESC 
LIMIT 10;" >> $LOG_FILE 2>&1

echo "[$DATE] === End Report ===" >> $LOG_FILE
echo "" >> $LOG_FILE
EOF

sudo chmod +x /opt/db_monitor.sh

# 7. Setup cron job for monitoring
echo "⏰ Setting up monitoring cron job..."
(crontab -l 2>/dev/null; echo "*/15 * * * * /opt/db_monitor.sh") | sudo crontab -

# 8. Restart PostgreSQL
echo "🔄 Restarting PostgreSQL..."
sudo systemctl restart postgresql

# 9. Verify configuration
echo "✅ Verifying PostgreSQL configuration..."
sudo -u postgres psql -c "SHOW shared_buffers;"
sudo -u postgres psql -c "SHOW effective_cache_size;"
sudo -u postgres psql -c "SHOW max_connections;"

# 10. Test connection
echo "🔗 Testing database connectivity..."
sudo -u postgres psql $DB_NAME -c "SELECT 'Database optimization completed successfully!' as status;"

echo ""
echo "✅ PostgreSQL optimization completed!"
echo ""
echo "📋 Summary:"
echo "   - Performance indexes added"
echo "   - Configuration optimized for ${TOTAL_MEM}MB RAM"
echo "   - Network access configured"
echo "   - Monitoring views and scripts created"
echo "   - Cron job scheduled for monitoring"
echo ""
echo "📊 Monitor performance:"
echo "   - tail -f /var/log/harfai_db_monitor.log"
echo "   - sudo -u postgres psql $DB_NAME -c 'SELECT * FROM slow_queries;'"
echo ""
echo "🔧 Next steps:"
echo "   1. Configure firewall to allow connections from backend server"
echo "   2. Update backend server with database connection details"
echo "   3. Test connectivity from backend server"
echo ""
echo "⚠️  Backup location: /var/backups/harfai_lms_db_optimization/$(date +%Y%m%d)/"
