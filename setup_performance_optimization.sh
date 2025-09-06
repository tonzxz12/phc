#!/bin/bash

# Harfai LMS Performance Optimization Setup Script
# For Distributed Architecture: PHP Backend (GCP) + Separate PostgreSQL VM
# Run this on your GCP PHP backend server

echo "🚀 Setting up performance optimizations for Harfai LMS (Distributed Architecture)..."
echo "📍 Running on: PHP Backend Server (GCP)"
echo "📊 Database: Separate PostgreSQL VM"

# Get database connection details
read -p "Enter PostgreSQL server IP/hostname: " DB_HOST
read -p "Enter database name (default: harfai_lms): " DB_NAME
DB_NAME=${DB_NAME:-harfai_lms}
read -p "Enter database username: " DB_USER
read -s -p "Enter database password: " DB_PASS
echo

# Create environment file for database connections
echo "🔧 Creating environment configuration..."
sudo tee /var/www/html/.env << EOF
DB_HOST=${DB_HOST}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASS=${DB_PASS}
EOF

# Create backup directory
mkdir -p /var/backups/harfai_lms_optimization/$(date +%Y%m%d)

# 1. PostgreSQL Optimization (Remote Connection)
echo "📊 Setting up optimized database access for remote PostgreSQL..."

# Test database connectivity
echo "Testing database connection..."
php -r "
\$dsn = 'pgsql:host=${DB_HOST};dbname=${DB_NAME};port=5432';
try {
    \$pdo = new PDO(\$dsn, '${DB_USER}', '${DB_PASS}');
    echo 'Database connection successful!\n';
} catch (Exception \$e) {
    echo 'Database connection failed: ' . \$e->getMessage() . '\n';
    exit(1);
}
"

# Create optimized database manager
echo "Creating optimized database connection manager..."
sudo mkdir -p /var/www/html/includes
sudo tee /var/www/html/includes/database.php << 'EOF'
<?php
class DatabaseManager {
    private static $instance = null;
    private $pdo;
    private $cacheDir = '/tmp/harfai_cache/';
    private $connectionPool = [];
    private $maxConnections = 10;
    
    private function __construct() {
        if (!is_dir($this->cacheDir)) {
            mkdir($this->cacheDir, 0755, true);
        }
        $this->initializeConnection();
    }
    
    private function initializeConnection() {
        $host = $_ENV['DB_HOST'] ?? getenv('DB_HOST');
        $dbname = $_ENV['DB_NAME'] ?? getenv('DB_NAME');
        $user = $_ENV['DB_USER'] ?? getenv('DB_USER');
        $pass = $_ENV['DB_PASS'] ?? getenv('DB_PASS');
        
        $dsn = "pgsql:host={$host};dbname={$dbname};port=5432";
        $options = [
            PDO::ATTR_PERSISTENT => true,
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT => 10,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::PGSQL_ATTR_DISABLE_PREPARES => false
        ];
        
        $this->pdo = new PDO($dsn, $user, $pass, $options);
        
        // Optimize for network latency
        $this->pdo->exec("SET search_path TO public");
        $this->pdo->exec("SET statement_timeout = '30s'");
        $this->pdo->exec("SET lock_timeout = '10s'");
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->pdo;
    }
    
    public function getCachedQuery($query, $params = [], $cacheMinutes = 5) {
        $cacheKey = md5($query . serialize($params));
        $cacheFile = $this->cacheDir . $cacheKey . '.json';
        
        if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < ($cacheMinutes * 60)) {
            return json_decode(file_get_contents($cacheFile), true);
        }
        
        $stmt = $this->pdo->prepare($query);
        $stmt->execute($params);
        $result = $stmt->fetchAll();
        
        file_put_contents($cacheFile, json_encode($result));
        return $result;
    }
    
    public function executeBatch($queries) {
        $this->pdo->beginTransaction();
        try {
            $results = [];
            foreach ($queries as $query) {
                $stmt = $this->pdo->prepare($query['sql']);
                $stmt->execute($query['params'] ?? []);
                $results[] = $stmt->fetchAll();
            }
            $this->pdo->commit();
            return $results;
        } catch (Exception $e) {
            $this->pdo->rollback();
            throw $e;
        }
    }
    
    public function clearCache($pattern = null) {
        $files = glob($this->cacheDir . ($pattern ? $pattern : '*') . '.json');
        foreach ($files as $file) {
            unlink($file);
        }
    }
}
?>
EOF

# 2. Create Optimized API Endpoints
echo "🚀 Creating optimized API endpoints..."

# Create optimized endpoints directory
sudo mkdir -p /var/www/html/api/v2

# Main optimized API endpoint
sudo tee /var/www/html/api/v2/optimized.php << 'EOF'
<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once '../../includes/database.php';
require_once '../../.env';

// Load environment variables
if (file_exists('../../.env')) {
    $lines = file('../../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
            list($key, $value) = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value);
        }
    }
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$input = json_decode(file_get_contents('php://input'), true);
$method = $input['Method'] ?? '';
$data = json_decode($input['data'] ?? '{}', true);

$response = [
    'success' => false,
    'output' => [],
    'message' => '',
    'cache_hit' => false,
    'execution_time' => 0,
    'query_count' => 0
];

$start_time = microtime(true);
$query_count = 0;

try {
    $db = DatabaseManager::getInstance();
    
    switch ($method) {
        case 'get_courses_optimized':
            $response = getCourses($db, $data);
            break;
            
        case 'get_lessons_optimized':
            $response = getLessons($db, $data);
            break;
            
        case 'get_user_dashboard':
            $response = getUserDashboard($db, $data);
            break;
            
        case 'get_student_progress':
            $response = getStudentProgress($db, $data);
            break;
            
        case 'batch_requests':
            $response = processBatchRequests($db, $data);
            break;
            
        default:
            throw new Exception("Unknown method: $method");
    }
    
    $response['success'] = true;
    
} catch (Exception $e) {
    $response['message'] = $e->getMessage();
    error_log("API Error in $method: " . $e->getMessage());
}

$response['execution_time'] = round((microtime(true) - $start_time) * 1000, 2);
$response['query_count'] = $query_count;

echo json_encode($response);

function getCourses($db, $data) {
    global $query_count;
    $query_count++;
    
    $userId = $data['user_id'] ?? '';
    $limit = $data['limit'] ?? 20;
    $offset = $data['offset'] ?? 0;
    $filter = $data['filter'] ?? null;
    
    $whereClause = '';
    $params = [':user_id' => $userId, ':limit' => $limit, ':offset' => $offset];
    
    if ($filter) {
        $whereClause = 'AND c.languageid = :filter';
        $params[':filter'] = $filter;
    }
    
    $query = "
        WITH course_stats AS (
            SELECT DISTINCT
                c.id,
                c.course,
                c.details,
                c.teacherid,
                t.firstname || ' ' || t.lastname as teacher_name,
                t.profile as teacher_profile,
                l.language,
                (SELECT COUNT(*) FROM lessons WHERE courseid = c.id) as lesson_count,
                (SELECT COUNT(DISTINCT sc.studentid) 
                 FROM classes cl 
                 JOIN student_classes sc ON sc.classid = cl.id 
                 WHERE cl.courseid = c.id) as enrolled_count,
                CASE WHEN EXISTS(
                    SELECT 1 FROM classes cl2 
                    JOIN student_classes sc2 ON sc2.classid = cl2.id 
                    WHERE cl2.courseid = c.id AND sc2.studentid = :user_id
                ) THEN true ELSE false END as is_enrolled
            FROM courses c
            JOIN teachers t ON t.id = c.teacherid
            LEFT JOIN languages l ON l.id = c.languageid
            WHERE 1=1 {$whereClause}
        )
        SELECT * FROM course_stats
        ORDER BY course
        LIMIT :limit OFFSET :offset
    ";
    
    $result = $db->getCachedQuery($query, $params, 10);
    
    return [
        'output' => $result,
        'cache_hit' => true,
        'total_courses' => count($result)
    ];
}

function getLessons($db, $data) {
    global $query_count;
    $query_count++;
    
    $userId = $data['user_id'] ?? '';
    $courseId = $data['course_id'] ?? '';
    
    $query = "
        SELECT 
            l.id,
            l.title,
            l.difficulty,
            l.sequence,
            l.details,
            COALESCE(lt.progress, 0) as progress,
            CASE WHEN lt.id IS NOT NULL THEN true ELSE false END as started,
            CASE WHEN lt.progress >= 100 THEN true ELSE false END as completed
        FROM lessons l
        LEFT JOIN lessons_taken lt ON lt.lessonid = l.id AND lt.studentid = :user_id
        WHERE l.courseid = :course_id
        ORDER BY l.sequence ASC
    ";
    
    $result = $db->getCachedQuery($query, [
        ':user_id' => $userId,
        ':course_id' => $courseId
    ], 5);
    
    return [
        'output' => $result,
        'course_id' => $courseId,
        'total_lessons' => count($result),
        'completed_lessons' => count(array_filter($result, function($lesson) {
            return $lesson['completed'];
        }))
    ];
}

function getUserDashboard($db, $data) {
    global $query_count;
    $query_count++;
    
    $userId = $data['user_id'] ?? '';
    
    $query = "
        SELECT 
            'courses' as type,
            COUNT(DISTINCT c.id) as total,
            0 as pending,
            COUNT(DISTINCT c.id) as active
        FROM student_classes sc
        JOIN classes cl ON cl.id = sc.classid
        JOIN courses c ON c.id = cl.courseid
        WHERE sc.studentid = :user_id
        
        UNION ALL
        
        SELECT 
            'assignments' as type,
            COUNT(a.id) as total,
            COUNT(CASE WHEN sa.id IS NULL THEN 1 END) as pending,
            COUNT(CASE WHEN sa.id IS NOT NULL THEN 1 END) as active
        FROM assignments a
        JOIN classes cl ON cl.id = a.classid
        JOIN student_classes sc ON sc.classid = cl.id
        LEFT JOIN student_assignments sa ON sa.assignmentid = a.id AND sa.studentid = :user_id
        WHERE sc.studentid = :user_id
        
        UNION ALL
        
        SELECT 
            'assessments' as type,
            COUNT(ass.id) as total,
            COUNT(CASE WHEN sa.id IS NULL THEN 1 END) as pending,
            COUNT(CASE WHEN sa.id IS NOT NULL THEN 1 END) as active
        FROM assessments ass
        JOIN classes cl ON cl.id = ass.classid
        JOIN student_classes sc ON sc.classid = cl.id
        LEFT JOIN student_assessments sa ON sa.assessmentid = ass.id AND sa.studentid = :user_id
        WHERE sc.studentid = :user_id
    ";
    
    $result = $db->getCachedQuery($query, [':user_id' => $userId], 3);
    
    // Transform result into more usable format
    $dashboard = [];
    foreach ($result as $row) {
        $dashboard[$row['type']] = [
            'total' => (int)$row['total'],
            'pending' => (int)$row['pending'],
            'active' => (int)$row['active']
        ];
    }
    
    return ['output' => $dashboard];
}

function getStudentProgress($db, $data) {
    global $query_count;
    $query_count++;
    
    $userId = $data['user_id'] ?? '';
    $courseId = $data['course_id'] ?? '';
    
    $query = "
        SELECT 
            c.id as course_id,
            c.course,
            COUNT(l.id) as total_lessons,
            COUNT(lt.id) as started_lessons,
            COUNT(CASE WHEN lt.progress >= 100 THEN 1 END) as completed_lessons,
            ROUND(AVG(COALESCE(lt.progress, 0)), 2) as average_progress
        FROM courses c
        JOIN classes cl ON cl.courseid = c.id
        JOIN student_classes sc ON sc.classid = cl.id
        LEFT JOIN lessons l ON l.courseid = c.id
        LEFT JOIN lessons_taken lt ON lt.lessonid = l.id AND lt.studentid = sc.studentid
        WHERE sc.studentid = :user_id
        " . ($courseId ? "AND c.id = :course_id" : "") . "
        GROUP BY c.id, c.course
        ORDER BY c.course
    ";
    
    $params = [':user_id' => $userId];
    if ($courseId) {
        $params[':course_id'] = $courseId;
    }
    
    $result = $db->getCachedQuery($query, $params, 5);
    
    return ['output' => $result];
}

function processBatchRequests($db, $data) {
    global $query_count;
    
    $requests = $data['requests'] ?? [];
    $results = [];
    
    foreach ($requests as $index => $request) {
        try {
            $method = $request['method'] ?? '';
            $requestData = $request['data'] ?? [];
            
            switch ($method) {
                case 'get_courses_optimized':
                    $results[$index] = getCourses($db, $requestData);
                    break;
                case 'get_lessons_optimized':
                    $results[$index] = getLessons($db, $requestData);
                    break;
                case 'get_user_dashboard':
                    $results[$index] = getUserDashboard($db, $requestData);
                    break;
                default:
                    $results[$index] = ['error' => 'Unknown method: ' . $method];
            }
        } catch (Exception $e) {
            $results[$index] = ['error' => $e->getMessage()];
        }
    }
    
    return ['output' => $results, 'batch_size' => count($requests)];
}
?>
EOF
if command -v apache2 &> /dev/null; then
    echo "🌐 Optimizing Apache configuration..."
    
    # Backup Apache config
    sudo cp /etc/apache2/apache2.conf /var/backups/harfai_lms_optimization/$(date +%Y%m%d)/
    
    # Enable mod_rewrite and mod_expires for caching
    sudo a2enmod rewrite
    sudo a2enmod expires
    sudo a2enmod headers
    
    # Add caching headers for static files
    sudo tee /etc/apache2/conf-available/harfai-cache.conf << 'EOF'
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType image/png "access plus 1 month"
    ExpiresByType image/jpg "access plus 1 month"
    ExpiresByType image/jpeg "access plus 1 month"
    ExpiresByType image/gif "access plus 1 month"
    ExpiresByType image/svg+xml "access plus 1 month"
</IfModule>

<IfModule mod_headers.c>
    Header append Vary User-Agent env=!dont-vary
</IfModule>
EOF
    
    sudo a2enconf harfai-cache
fi

# 4. PHP Configuration
echo "🐘 Optimizing PHP configuration..."

# Find PHP configuration file
PHP_INI=$(php --ini | grep "Loaded Configuration File" | cut -d: -f2 | xargs)

if [ -f "$PHP_INI" ]; then
    # Backup PHP config
    sudo cp "$PHP_INI" /var/backups/harfai_lms_optimization/$(date +%Y%m%d)/
    
    # Apply PHP optimizations
    sudo tee -a "$PHP_INI" << 'EOF'

; Performance optimizations for Harfai LMS
memory_limit = 512M
max_execution_time = 30
max_input_time = 30
post_max_size = 64M
upload_max_filesize = 64M

; OpCache settings
opcache.enable=1
opcache.memory_consumption=256
opcache.max_accelerated_files=10000
opcache.revalidate_freq=2
EOF
fi

# 5. System Monitoring Setup
echo "📈 Setting up monitoring scripts..."

# Create monitoring directory
sudo mkdir -p /opt/harfai_monitoring

# Database performance monitoring script
sudo tee /opt/harfai_monitoring/db_monitor.sh << 'EOF'
#!/bin/bash
# Database Performance Monitor for Harfai LMS

LOG_FILE="/var/log/harfai_db_performance.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] === Database Performance Report ===" >> $LOG_FILE

# Check slow queries
echo "Top 10 Slowest Queries:" >> $LOG_FILE
sudo -u postgres psql harfai_lms -c "
SELECT query, calls, mean_exec_time, total_exec_time 
FROM pg_stat_statements 
WHERE mean_exec_time > 100 
ORDER BY mean_exec_time DESC 
LIMIT 10;" >> $LOG_FILE 2>&1

# Check database connections
echo "Current Connections:" >> $LOG_FILE
sudo -u postgres psql harfai_lms -c "
SELECT count(*) as connections, state 
FROM pg_stat_activity 
GROUP BY state;" >> $LOG_FILE 2>&1

# Check database size
echo "Database Size:" >> $LOG_FILE
sudo -u postgres psql harfai_lms -c "
SELECT pg_size_pretty(pg_database_size('harfai_lms')) as size;" >> $LOG_FILE 2>&1

echo "[$DATE] === End Report ===" >> $LOG_FILE
echo "" >> $LOG_FILE
EOF

sudo chmod +x /opt/harfai_monitoring/db_monitor.sh

# System performance monitoring script
sudo tee /opt/harfai_monitoring/system_monitor.sh << 'EOF'
#!/bin/bash
# System Performance Monitor for Harfai LMS

LOG_FILE="/var/log/harfai_system_performance.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] === System Performance Report ===" >> $LOG_FILE

# CPU and Memory usage
echo "CPU and Memory:" >> $LOG_FILE
top -b -n1 | head -5 >> $LOG_FILE

# Disk usage
echo "Disk Usage:" >> $LOG_FILE
df -h >> $LOG_FILE

# Network connections
echo "Network Connections:" >> $LOG_FILE
netstat -tuln | grep :80 >> $LOG_FILE
netstat -tuln | grep :443 >> $LOG_FILE
netstat -tuln | grep :5432 >> $LOG_FILE

echo "[$DATE] === End Report ===" >> $LOG_FILE
echo "" >> $LOG_FILE
EOF

sudo chmod +x /opt/harfai_monitoring/system_monitor.sh

# Add cron jobs for monitoring
echo "Setting up cron jobs for monitoring..."
(crontab -l 2>/dev/null; echo "*/15 * * * * /opt/harfai_monitoring/db_monitor.sh") | sudo crontab -
(crontab -l 2>/dev/null; echo "*/15 * * * * /opt/harfai_monitoring/system_monitor.sh") | sudo crontab -

# 6. Restart services
echo "🔄 Restarting services..."

# Restart PostgreSQL
sudo systemctl restart postgresql

# Restart web server
if command -v apache2 &> /dev/null; then
    sudo systemctl restart apache2
elif command -v nginx &> /dev/null; then
    sudo systemctl restart nginx
fi

# Restart PHP-FPM if available
if command -v php-fpm &> /dev/null; then
    sudo systemctl restart php*-fpm
fi

# 7. Create health check endpoint
echo "🏥 Creating health check endpoint..."

sudo tee /var/www/html/health.php << 'EOF'
<?php
header('Content-Type: application/json');

$health = [
    'status' => 'healthy',
    'timestamp' => date('c'),
    'checks' => []
];

// Database check
try {
    $pdo = new PDO("pgsql:host=localhost;dbname=harfai_lms", $db_user, $db_pass);
    $health['checks']['database'] = 'healthy';
} catch (Exception $e) {
    $health['checks']['database'] = 'unhealthy';
    $health['status'] = 'unhealthy';
}

// Disk space check
$disk_free = disk_free_space('/');
$disk_total = disk_total_space('/');
$disk_usage = ($disk_total - $disk_free) / $disk_total * 100;

if ($disk_usage > 90) {
    $health['checks']['disk'] = 'unhealthy';
    $health['status'] = 'unhealthy';
} else {
    $health['checks']['disk'] = 'healthy';
}

// Memory check
$memory = memory_get_usage(true);
$memory_limit = ini_get('memory_limit');
$memory_limit_bytes = preg_replace('/\D/', '', $memory_limit) * 1024 * 1024;

if ($memory > ($memory_limit_bytes * 0.8)) {
    $health['checks']['memory'] = 'warning';
} else {
    $health['checks']['memory'] = 'healthy';
}

echo json_encode($health, JSON_PRETTY_PRINT);
?>
EOF

echo "✅ Performance optimization setup completed!"
echo ""
echo "📋 Summary of changes:"
echo "   - Database indexes added for better query performance"
echo "   - PostgreSQL configuration optimized"
echo "   - Web server caching enabled"
echo "   - PHP settings optimized"
echo "   - Monitoring scripts installed"
echo "   - Health check endpoint created at /health.php"
echo ""
echo "📊 Monitor performance with:"
echo "   - tail -f /var/log/harfai_db_performance.log"
echo "   - tail -f /var/log/harfai_system_performance.log"
echo ""
echo "🔧 Next steps:"
echo "   1. Update your frontend to use the PerformanceOptimizerService"
echo "   2. Add the PerformanceMonitorComponent to your app"
echo "   3. Monitor the logs for any issues"
echo "   4. Test the application performance"
echo ""
echo "⚠️  If you encounter any issues, restore from backups in:"
echo "   /var/backups/harfai_lms_optimization/$(date +%Y%m%d)/"
