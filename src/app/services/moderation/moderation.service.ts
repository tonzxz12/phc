import { Injectable } from '@angular/core';
import { APIService } from '../API/api.service';
import { firstValueFrom } from 'rxjs';

interface CensoredWord {
  id: number;
  word: string;
  description?: string;
  severity: string;
  category?: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ModerationService {
  private censoredWords: CensoredWord[] = [];
  private lastCensoredWordsLoad = 0;
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(private API: APIService) {}

  /**
   * Load censored words from the database with caching
   */
  private async loadCensoredWords(): Promise<void> {
    const now = Date.now();
    
    // Use cached words if they're still fresh
    if (this.censoredWords.length > 0 && (now - this.lastCensoredWordsLoad) < this.cacheTimeout) {
      return;
    }

    try {
      const words = await firstValueFrom(this.API.getCensoredWords());
      this.censoredWords = words || [];
      this.lastCensoredWordsLoad = now;
    } catch (error) {
      console.error('Error loading censored words:', error);
      // Continue with existing cached words if available
    }
  }

  /**
   * Automatically censor content based on database censored words
   */
  async censorContent(content: string): Promise<string> {
    await this.loadCensoredWords();
    
    let censoredContent = content;
    
    this.censoredWords.forEach(wordObj => {
      const word = wordObj.word;
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      
      // Apply different censoring based on severity
      let replacement = '';
      switch (wordObj.severity) {
        case 'low':
          replacement = '*'.repeat(Math.min(word.length, 3)) + word.slice(3);
          break;
        case 'high':
        case 'extreme':
          replacement = '[CENSORED]';
          break;
        default: // medium
          replacement = '*'.repeat(word.length);
      }
      
      censoredContent = censoredContent.replace(regex, replacement);
    });
    
    return censoredContent;
  }

  /**
   * Check if content contains inappropriate words
   */
  async hasInappropriateContent(content: string): Promise<{
    hasViolation: boolean;
    severity: string;
    violatingWords: string[];
  }> {
    await this.loadCensoredWords();
    
    const violatingWords: string[] = [];
    let highestSeverity = 'none';
    
    this.censoredWords.forEach(wordObj => {
      const word = wordObj.word;
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      
      if (regex.test(content)) {
        violatingWords.push(word);
        
        // Determine highest severity
        const severityLevels = ['none', 'low', 'medium', 'high', 'extreme'];
        const currentLevel = severityLevels.indexOf(wordObj.severity);
        const highestLevel = severityLevels.indexOf(highestSeverity);
        
        if (currentLevel > highestLevel) {
          highestSeverity = wordObj.severity;
        }
      }
    });
    
    return {
      hasViolation: violatingWords.length > 0,
      severity: highestSeverity,
      violatingWords
    };
  }

  /**
   * Apply content moderation before saving content
   */
  async moderateContent(content: string): Promise<{
    censoredContent: string;
    shouldReject: boolean;
    shouldFlag: boolean;
    severity: string;
    violatingWords: string[];
  }> {
    const [censoredContent, violation] = await Promise.all([
      this.censorContent(content),
      this.hasInappropriateContent(content)
    ]);

    return {
      censoredContent,
      shouldReject: violation.severity === 'extreme',
      shouldFlag: ['high', 'extreme'].includes(violation.severity),
      severity: violation.severity,
      violatingWords: violation.violatingWords
    };
  }

  /**
   * Auto-report content with extreme violations
   */
  async autoReportContent(
    contentType: 'message' | 'forum_post' | 'thread',
    contentId: number,
    content: string
  ): Promise<void> {
    const violation = await this.hasInappropriateContent(content);
    
    if (violation.severity === 'extreme') {
      try {
        // Auto-report with system reason
        const systemReportReasonId = 1; // This should be a predefined system reason
        
        switch (contentType) {
          case 'message':
            await firstValueFrom(this.API.reportMessage(
              contentId,
              systemReportReasonId,
              `Auto-reported: Extreme content violation detected. Words: ${violation.violatingWords.join(', ')}`
            ));
            break;
          case 'forum_post':
            await firstValueFrom(this.API.reportForumPost(
              contentId,
              systemReportReasonId,
              `Auto-reported: Extreme content violation detected. Words: ${violation.violatingWords.join(', ')}`
            ));
            break;
        }
      } catch (error) {
        console.error('Error auto-reporting content:', error);
      }
    }
  }

  /**
   * Clear the cached censored words (force reload on next use)
   */
  clearCache(): void {
    this.censoredWords = [];
    this.lastCensoredWordsLoad = 0;
  }

  /**
   * Get current cached censored words
   */
  getCachedCensoredWords(): CensoredWord[] {
    return [...this.censoredWords];
  }
}
