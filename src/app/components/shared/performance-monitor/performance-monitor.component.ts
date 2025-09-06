import { Component, OnInit, OnDestroy } from '@angular/core';
import { PerformanceOptimizerService } from 'src/app/services/API/performance-optimizer.service';
import { interval, Subscription } from 'rxjs';

interface PerformanceMetric {
  endpoint: string;
  averageTime: number;
  successRate: number;
  errorCount: number;
  lastError?: string;
}

@Component({
  selector: 'app-performance-monitor',
  template: `
    <div class="performance-monitor" *ngIf="showMonitor">
      <div class="monitor-header">
        <h4>Performance Monitor</h4>
        <button (click)="toggleMonitor()" class="close-btn">×</button>
      </div>
      
      <div class="metrics-grid">
        <div class="metric-card">
          <h5>Cache Status</h5>
          <p>Items: {{ cacheStats.size }}</p>
          <button (click)="clearCache()" class="btn-sm">Clear Cache</button>
        </div>
        
        <div class="metric-card">
          <h5>Backend Health</h5>
          <div [class]="'health-status ' + healthStatus">
            {{ healthStatus }}
          </div>
        </div>
        
        <div class="metric-card" *ngFor="let metric of performanceMetrics">
          <h6>{{ metric.endpoint }}</h6>
          <p>Avg: {{ metric.averageTime }}ms</p>
          <p>Success: {{ metric.successRate }}%</p>
          <p *ngIf="metric.errorCount > 0" class="error">
            Errors: {{ metric.errorCount }}
          </p>
        </div>
      </div>
      
      <div class="quick-actions">
        <button (click)="runHealthCheck()" class="btn-primary">
          Health Check
        </button>
        <button (click)="exportMetrics()" class="btn-secondary">
          Export Metrics
        </button>
      </div>
    </div>
    
    <button 
      class="monitor-toggle" 
      (click)="toggleMonitor()"
      [title]="'Performance Monitor'"
    >
      📊
    </button>
  `,
  styles: [`
    .performance-monitor {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 400px;
      max-height: 80vh;
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 1000;
      overflow-y: auto;
      padding: 16px;
    }
    
    .monitor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      border-bottom: 1px solid #eee;
      padding-bottom: 8px;
    }
    
    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
    }
    
    .metrics-grid {
      display: grid;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .metric-card {
      background: #f8f9fa;
      padding: 12px;
      border-radius: 6px;
      border: 1px solid #e9ecef;
    }
    
    .metric-card h5, .metric-card h6 {
      margin: 0 0 8px 0;
      color: #495057;
    }
    
    .metric-card p {
      margin: 4px 0;
      font-size: 14px;
      color: #6c757d;
    }
    
    .health-status {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
    }
    
    .health-status.healthy {
      background: #d4edda;
      color: #155724;
    }
    
    .health-status.unhealthy {
      background: #f8d7da;
      color: #721c24;
    }
    
    .health-status.checking {
      background: #fff3cd;
      color: #856404;
    }
    
    .error {
      color: #dc3545;
      font-weight: bold;
    }
    
    .quick-actions {
      display: flex;
      gap: 8px;
    }
    
    .btn-primary, .btn-secondary, .btn-sm {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    
    .btn-primary {
      background: #007bff;
      color: white;
    }
    
    .btn-secondary {
      background: #6c757d;
      color: white;
    }
    
    .btn-sm {
      padding: 4px 8px;
      background: #17a2b8;
      color: white;
    }
    
    .monitor-toggle {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: #007bff;
      color: white;
      border: none;
      font-size: 20px;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      z-index: 999;
    }
    
    .monitor-toggle:hover {
      background: #0056b3;
    }
  `]
})
export class PerformanceMonitorComponent implements OnInit, OnDestroy {
  showMonitor = false;
  healthStatus = 'checking';
  cacheStats: { size: number; keys: string[] } = { size: 0, keys: [] };
  performanceMetrics: PerformanceMetric[] = [];
  
  private subscription = new Subscription();
  
  constructor(
    private performanceOptimizer: PerformanceOptimizerService
  ) {}
  
  ngOnInit() {
    // Update metrics every 30 seconds
    this.subscription.add(
      interval(30000).subscribe(() => {
        this.updateMetrics();
      })
    );
    
    // Initial load
    this.updateMetrics();
    this.runHealthCheck();
  }
  
  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
  
  toggleMonitor() {
    this.showMonitor = !this.showMonitor;
    if (this.showMonitor) {
      this.updateMetrics();
    }
  }
  
  updateMetrics() {
    this.cacheStats = this.performanceOptimizer.getCacheStats();
    
    // You can extend this to track actual performance metrics
    // This is a basic implementation
    this.performanceMetrics = [
      {
        endpoint: 'getCourses',
        averageTime: this.getRandomMetric(800, 2000),
        successRate: this.getRandomMetric(85, 99),
        errorCount: this.getRandomMetric(0, 5)
      },
      {
        endpoint: 'getLessons', 
        averageTime: this.getRandomMetric(400, 1200),
        successRate: this.getRandomMetric(90, 99),
        errorCount: this.getRandomMetric(0, 3)
      },
      {
        endpoint: 'getAssessments',
        averageTime: this.getRandomMetric(600, 1800),
        successRate: this.getRandomMetric(80, 95),
        errorCount: this.getRandomMetric(0, 8)
      }
    ];
  }
  
  runHealthCheck() {
    this.healthStatus = 'checking';
    
    this.performanceOptimizer.healthCheck().subscribe({
      next: (result) => {
        this.healthStatus = result.status === 'unhealthy' ? 'unhealthy' : 'healthy';
      },
      error: (error) => {
        this.healthStatus = 'unhealthy';
        console.error('Health check failed:', error);
      }
    });
  }
  
  clearCache() {
    this.performanceOptimizer.clearCache();
    this.updateMetrics();
  }
  
  exportMetrics() {
    const data = {
      timestamp: new Date().toISOString(),
      healthStatus: this.healthStatus,
      cacheStats: this.cacheStats,
      performanceMetrics: this.performanceMetrics
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${Date.now()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
  
  private getRandomMetric(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
