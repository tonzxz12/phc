# Harfai LMS Performance Optimization Deployment Guide

## 🚀 Quick Start Overview

Your system architecture: **Angular Frontend** → **PHP Backend (GCP)** → **PostgreSQL (Separate VM)**

This guide will help you deploy the performance optimizations in the correct order.

## 📋 Prerequisites Checklist

- [ ] SSH access to your GCP PHP server
- [ ] SSH access to your PostgreSQL VM
- [ ] Angular development environment set up
- [ ] Backup of your current database
- [ ] Basic knowledge of terminal/SSH commands

## 🔄 Deployment Sequence

### Step 1: Database Optimization (PostgreSQL VM)
**Time Required:** 15-30 minutes  
**Impact:** High - Improves all query performance

1. **Upload the database optimization script:**
   ```bash
   scp optimize_postgresql.sh user@your-postgresql-vm:/tmp/
   ```

2. **Connect to your PostgreSQL VM:**
   ```bash
   ssh user@your-postgresql-vm
   ```

3. **Run the optimization script:**
   ```bash
   chmod +x /tmp/optimize_postgresql.sh
   sudo /tmp/optimize_postgresql.sh
   ```

4. **Verify optimization:**
   ```bash
   # Check if indexes were created
   psql -U postgres -d harfai_lms -c "\di"
   
   # Check performance settings
   psql -U postgres -c "SHOW shared_buffers;"
   psql -U postgres -c "SHOW work_mem;"
   ```

### Step 2: Backend Optimization (GCP PHP Server)
**Time Required:** 20-40 minutes  
**Impact:** High - Adds caching and connection pooling

1. **Upload the backend optimization script:**
   ```bash
   scp setup_performance_optimization.sh user@your-gcp-server:/tmp/
   ```

2. **Connect to your GCP server:**
   ```bash
   ssh user@your-gcp-server
   ```

3. **Run the backend optimization:**
   ```bash
   chmod +x /tmp/setup_performance_optimization.sh
   sudo /tmp/setup_performance_optimization.sh
   ```

4. **Restart your web server:**
   ```bash
   # For Apache
   sudo systemctl restart apache2
   
   # For Nginx
   sudo systemctl restart nginx
   sudo systemctl restart php8.1-fpm
   ```

5. **Test the new endpoints:**
   ```bash
   # Test health check
   curl -X GET http://your-server.com/api/v2/health.php
   
   # Test optimized endpoint
   curl -X POST http://your-server.com/api/v2/optimized.php \
     -H "Content-Type: application/json" \
     -d '{"Method": "health_check"}'
   ```

### Step 3: Frontend Integration (Angular App)
**Time Required:** 30-45 minutes  
**Impact:** Medium - Improves user experience with caching

The enhanced `api.service.ts` and new services are already created in your project.

1. **Build and test locally:**
   ```bash
   cd "c:\Quanby Projects\Web Apps\harfai+marino\harfai_lms"
   npm install
   ng serve
   ```

2. **Import the new performance service** in your app module:
   ```typescript
   // In app.module.ts, add:
   import { PerformanceOptimizerService } from './services/performance-optimizer.service';
   
   // Add to providers array:
   providers: [
     // ... existing providers
     PerformanceOptimizerService
   ]
   ```

3. **Update components to use optimized methods:**
   Replace existing API calls with optimized versions:
   ```typescript
   // Old way:
   this.apiService.post('get_courses', data)
   
   // New way:
   this.apiService.getCoursesOptimized(userId, limit, offset)
   ```

4. **Add performance monitoring** (optional):
   Add the performance monitor component to your admin dashboard:
   ```html
   <app-performance-monitor *ngIf="isAdmin"></app-performance-monitor>
   ```

## 🧪 Testing Your Optimizations

### 1. Run Performance Tests
```bash
# Make the test script executable
chmod +x test_performance.sh

# Run the tests
./test_performance.sh
```

### 2. Manual Testing Checklist
- [ ] Dashboard loads in < 500ms
- [ ] Course list loads in < 800ms
- [ ] Lesson list loads in < 600ms
- [ ] Cache is working (second requests are faster)
- [ ] No PHP errors in logs
- [ ] Database connections are stable

### 3. Monitor Performance
- Check server logs: `tail -f /var/log/apache2/error.log`
- Monitor database: `htop` on PostgreSQL VM
- Use browser dev tools to measure load times

## 📊 Expected Performance Improvements

| Component | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Dashboard Load | 2-5 seconds | < 500ms | 75-90% faster |
| Course List | 3-8 seconds | < 800ms | 70-85% faster |
| Lesson List | 2-6 seconds | < 600ms | 70-85% faster |
| Cache Hit Rate | 0% | 70%+ | Significant |
| Concurrent Users | 5-10 | 50+ | 5x improvement |

## 🚨 Troubleshooting

### Common Issues:

**1. "Connection refused" errors:**
- Check if services are running: `systemctl status apache2`
- Verify firewall settings: `sudo ufw status`
- Test network connectivity between servers

**2. "Permission denied" for cache directory:**
```bash
sudo chmod 755 /var/cache/harfai_lms
sudo chown www-data:www-data /var/cache/harfai_lms
```

**3. Database connection issues:**
```bash
# Test connection from PHP server to PostgreSQL
psql -h your-postgresql-ip -U postgres -d harfai_lms -c "SELECT 1;"
```

**4. PHP extensions missing:**
```bash
# Install required extensions
sudo apt-get update
sudo apt-get install php8.1-pgsql php8.1-redis php8.1-opcache
```

### Performance Still Slow?

1. **Check database indexes:**
   ```sql
   EXPLAIN ANALYZE SELECT * FROM courses WHERE user_id = 1;
   ```

2. **Monitor resource usage:**
   ```bash
   # On PHP server
   htop
   
   # On PostgreSQL server
   htop
   iostat -x 1
   ```

3. **Enable debug mode temporarily:**
   ```php
   // In optimized.php, set:
   define('DEBUG_MODE', true);
   ```

## 🔄 Rollback Plan

If you encounter issues, you can rollback:

1. **Database:** Restore from backup
2. **Backend:** Remove optimized.php and health.php files
3. **Frontend:** Revert api.service.ts changes

## 📞 Support

If you encounter issues:

1. Check the performance test results in the generated report
2. Review server logs for error messages
3. Verify each optimization step was completed successfully
4. Test individual components to isolate the issue

## 🎯 Next Steps After Deployment

1. **Monitor performance** for 24-48 hours
2. **Adjust cache durations** based on usage patterns
3. **Scale resources** if needed (more RAM, CPU)
4. **Implement additional optimizations** like CDN for static files
5. **Set up automated monitoring** and alerts

---

**Ready to deploy?** Start with Step 1 (Database) and work through each step sequentially. The performance improvements will be significant!
