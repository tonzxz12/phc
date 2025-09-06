# Database Performance Optimization Guide

## Critical Issues Found in Your Harfai LMS System

### 1. Database Indexing Issues

Your current queries are performing multiple JOINs without proper indexes. Add these indexes to your PostgreSQL database:

```sql
-- Core indexes for performance
CREATE INDEX CONCURRENTLY idx_courses_teacherid ON courses(teacherid);
CREATE INDEX CONCURRENTLY idx_courses_languageid ON courses(languageid);
CREATE INDEX CONCURRENTLY idx_lessons_courseid ON lessons(courseid);
CREATE INDEX CONCURRENTLY idx_classes_courseid ON classes(courseid);
CREATE INDEX CONCURRENTLY idx_student_classes_classid ON student_classes(classid);
CREATE INDEX CONCURRENTLY idx_student_classes_studentid ON student_classes(studentid);
CREATE INDEX CONCURRENTLY idx_student_classes_composite ON student_classes(classid, studentid);
CREATE INDEX CONCURRENTLY idx_lessons_taken_lessonid ON lessons_taken(lessonid);
CREATE INDEX CONCURRENTLY idx_lessons_taken_studentid ON lessons_taken(studentid);
CREATE INDEX CONCURRENTLY idx_lessons_taken_composite ON lessons_taken(lessonid, studentid);

-- Assessment related indexes
CREATE INDEX CONCURRENTLY idx_assessments_courseid ON assessments(courseid);
CREATE INDEX CONCURRENTLY idx_assessment_items_assessmentid ON assessment_items(assessmentid);
CREATE INDEX CONCURRENTLY idx_student_assessments_studentid ON student_assessments(studentid);
CREATE INDEX CONCURRENTLY idx_student_assessments_assessmentid ON student_assessments(assessmentid);
CREATE INDEX CONCURRENTLY idx_student_assessments_composite ON student_assessments(studentid, assessmentid);

-- Assignment indexes
CREATE INDEX CONCURRENTLY idx_assignments_courseid ON assignments(courseid);
CREATE INDEX CONCURRENTLY idx_student_assignments_studentid ON student_assignments(studentid);
CREATE INDEX CONCURRENTLY idx_student_assignments_assignmentid ON student_assignments(assignmentid);

-- Time-based indexes for performance monitoring
CREATE INDEX CONCURRENTLY idx_students_lastseen ON students(lastseen);
CREATE INDEX CONCURRENTLY idx_teachers_lastseen ON teachers(lastseen);
```

### 2. Query Optimization

Replace complex JOIN queries with optimized versions:

#### Before (Slow):
```sql
SELECT teachers.FirstName,teachers.LastName,teachers.Profile,
       languages.*, courses.*, 
       COUNT(lessons.ID) as lessoncount,
       AVG(lessons.Difficulty) as complexity,
       COUNT(student_classes.StudentID) as enrolled
FROM courses
LEFT JOIN teachers ON teachers.ID = courses.TeacherID
LEFT JOIN languages ON languages.ID = courses.LanguageID  
LEFT JOIN lessons ON lessons.CourseID = courses.ID
LEFT JOIN classes ON classes.CourseID = courses.ID
LEFT JOIN student_classes ON student_classes.ClassID = classes.ID AND student_classes.StudentID = 'user_id'
WHERE teachers.ID = courses.TeacherID
GROUP BY courses.ID, teachers.ID, languages.ID
ORDER BY AVG(lessons.Difficulty) DESC
```

#### After (Optimized):
```sql
SELECT c.ID, c.course, c.details,
       t.FirstName, t.LastName,
       l.Language,
       COALESCE(lesson_stats.count, 0) as lessoncount,
       COALESCE(lesson_stats.avg_difficulty, 0) as complexity,
       COALESCE(enrollment_stats.enrolled, 0) as enrolled
FROM courses c
INNER JOIN teachers t ON t.ID = c.TeacherID
LEFT JOIN languages l ON l.ID = c.LanguageID
LEFT JOIN (
    SELECT courseid, COUNT(*) as count, AVG(difficulty) as avg_difficulty
    FROM lessons 
    GROUP BY courseid
) lesson_stats ON lesson_stats.courseid = c.ID
LEFT JOIN (
    SELECT cl.courseid, COUNT(DISTINCT sc.studentid) as enrolled
    FROM classes cl
    JOIN student_classes sc ON sc.classid = cl.id
    GROUP BY cl.courseid
) enrollment_stats ON enrollment_stats.courseid = c.ID
ORDER BY c.course
LIMIT 20;
```

### 3. Connection Pool Configuration

Add to your backend server configuration:

```javascript
// PostgreSQL connection pool settings
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
});
```

### 4. Backend API Optimizations

Add query timeout and caching to your PHP API:

```php
<?php
// Add to your API endpoint
ini_set('max_execution_time', 30); // 30 seconds max execution time

// Query timeout for PostgreSQL
$context = [
    'pgsql' => [
        'statement_timeout' => '15000' // 15 seconds
    ]
];

// Simple query caching
class QueryCache {
    private static $cache = [];
    private static $ttl = 300; // 5 minutes
    
    public static function get($key) {
        if (isset(self::$cache[$key])) {
            $item = self::$cache[$key];
            if (time() - $item['time'] < self::$ttl) {
                return $item['data'];
            }
            unset(self::$cache[$key]);
        }
        return null;
    }
    
    public static function set($key, $data) {
        self::$cache[$key] = [
            'data' => $data,
            'time' => time()
        ];
    }
}

// Usage in your API
$cacheKey = md5($method . serialize($postData));
$result = QueryCache::get($cacheKey);

if ($result === null) {
    $result = executeQuery($query);
    QueryCache::set($cacheKey, $result);
}
?>
```

### 5. Server Monitoring Commands

Run these on your GCP Ubuntu server to check performance:

```bash
# Check PostgreSQL performance
sudo -u postgres psql -c "SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Check slow queries
sudo -u postgres psql -c "SELECT query, mean_exec_time, calls FROM pg_stat_statements WHERE mean_exec_time > 1000 ORDER BY mean_exec_time DESC;"

# Check database connections
sudo -u postgres psql -c "SELECT count(*) as connections, state FROM pg_stat_activity GROUP BY state;"

# Monitor system resources
htop
iostat -x 1
df -h

# Check PostgreSQL logs for errors
sudo tail -f /var/log/postgresql/postgresql-*.log

# Check Apache/Nginx error logs
sudo tail -f /var/log/apache2/error.log
# or
sudo tail -f /var/log/nginx/error.log
```

### 6. Immediate Actions Required

1. **Add the indexes above** to your PostgreSQL database
2. **Implement the PerformanceOptimizerService** in your frontend
3. **Add query timeouts** to your backend API
4. **Enable PostgreSQL query logging** to identify slow queries
5. **Monitor server resources** during peak usage

### 7. Network Optimization

Add to your Angular app:

```typescript
// In your main service, add request debouncing
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

// Debounce search requests
searchSubject.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(term => this.performanceOptimizer.searchOptimized(term))
);
```

This should significantly improve your system's performance. The most critical fix is adding the database indexes - this alone could improve query performance by 10-100x.
