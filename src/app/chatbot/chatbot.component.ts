import { Component, ElementRef, ViewChild, OnInit, ViewEncapsulation } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { APIService } from '../services/API/api.service';

interface Message {
  content: SafeHtml;
  sender: 'user' | 'ai';
  timestamp: Date;
}

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css'],
    encapsulation: ViewEncapsulation.None 

})
export class ChatbotComponent implements OnInit {
  @ViewChild('messageInput') messageInput!: ElementRef;
  @ViewChild('chatContainer') private chatContainer!: ElementRef;

  messages: Message[] = [];
  newMessage = '';
  isLoading = false;
  userProfileImage = '';

  constructor(
    private apiService: APIService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    // 1) Load user profile or fallback
    this.userProfileImage =
      this.apiService.getURL(this.apiService.userData.profile) ??
      this.apiService.noProfile();

    // 2) Initialize chat with greeting
    this.messages = [
      {
        content: "Hello! I'm Lumi, your AI assistant. How can I help you today?",
        sender: 'ai',
        timestamp: new Date()
      }
    ];
  }

  /**
   * Send user message & get AI response
   */
  async sendMessage() {
    if (!this.newMessage.trim() || this.isLoading) return;

    const userContent = this.newMessage.trim();

    // Add user message
    this.messages.push({
      content: userContent,
      sender: 'user',
      timestamp: new Date()
    });

    // Reset input & auto-resize
    this.newMessage = '';
    this.adjustTextareaHeight(this.messageInput.nativeElement);

    // Scroll to bottom
    this.scrollToBottom();

    // Query AI
    try {
      this.isLoading = true;
      const response = await this.apiService.chatWithAI(userContent);

      this.messages.push({
        content: this.formatMessage(response),
        sender: 'ai',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Chat error:', error);
      this.messages.push({
        content: 'An error occurred. Please try again later.',
        sender: 'ai',
        timestamp: new Date()
      });
    } finally {
      this.isLoading = false;
      this.scrollToBottom();
    }
  }

  /**
   * Auto-resize the textarea, up to a max-height
   */
  adjustTextareaHeight(textarea: HTMLTextAreaElement) {
    textarea.style.height = 'auto';
    // Cap at 120px
    const newHeight = textarea.scrollHeight;
    textarea.style.height = (newHeight > 120 ? 120 : newHeight) + 'px';
  }

  /**
   * Smoothly scroll chat container to bottom
   */
  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.chatContainer?.nativeElement) {
        const el = this.chatContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    }, 50);
  }

  /**
   * Format message with code blocks, bold, etc.
   * Includes an escaping function to prevent HTML injection.
   */
   formatMessage(content: string): SafeHtml {
    try {
      // Escape any HTML tags so they're not rendered as raw HTML
      const escapeHtml = (str: string) =>
        str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');

      let formatted = content;

      // -----------------------------
      // 1) Multi-line code blocks: ```some code```
      //    We also capture an optional language token (e.g. ```js)
      // -----------------------------
      // Explanation:
      //   - /```(\w+)?([\s\S]*?)```/ => 
      //       (group1 = optional language), (group2 = code body)
      //   - If you only want to treat '```' with no language, remove "(\w+)?"
      formatted = formatted.replace(
        /```(\w+)?([\s\S]*?)```/g,
        (match, lang, code) => {
          const escapedCode = escapeHtml(code);
          return `
<pre class="bg-gray-800 text-white p-3 rounded-md my-2 overflow-x-auto">
<code class="language-${lang || 'plaintext'}">${escapedCode}</code>
</pre>`;
        }
      );

      // -----------------------------
      // 2) Inline code: `inline code`
      // -----------------------------
      formatted = formatted.replace(
        /`([^`]+)`/g,
        (match, code) => {
          const escapedCode = escapeHtml(code);
          return `<code class="bg-gray-200 text-gray-800 px-1 rounded">${escapedCode}</code>`;
        }
      );

      // -----------------------------
      // 3) Bold: **bold**
      // -----------------------------
      formatted = formatted.replace(
        /\*\*(.*?)\*\*/g,
        '<strong>$1</strong>'
      );

      // -----------------------------
      // 4) Italic: *italic*
      // -----------------------------
      formatted = formatted.replace(
        /\*(.*?)\*/g,
        '<em>$1</em>'
      );

      // -----------------------------
      // 5) Bullet points: - item
      // -----------------------------
      formatted = formatted.replace(
        /^- (.+)$/gm,
        '<div class="flex gap-2 ml-2">• <span>$1</span></div>'
      );

      // -----------------------------
      // 6) Numbered lists: 1. item
      // -----------------------------
      formatted = formatted.replace(
        /^(\d+)\. (.+)$/gm,
        '<div class="flex gap-2 ml-2"><span>$1.</span><span>$2</span></div>'
      );

      // -----------------------------
      // 7) Handle double line breaks -> separate <p>
      //    Single line breaks -> <br>
      // -----------------------------
      formatted = formatted.replace(/\n\n/g, '</p><p>');
      formatted = formatted.replace(/\n/g, '<br>');

      // Wrap final content in a <p> if not already
      if (!formatted.startsWith('<p>')) {
        formatted = `<p>${formatted}</p>`;
      }

      // -----------------------------
      // 8) Linkify URLs
      // -----------------------------
      formatted = formatted.replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank" class="text-blue-600 underline break-words">$1</a>'
      );

      // Return sanitized HTML
      return this.sanitizer.bypassSecurityTrustHtml(formatted);

    } catch (err) {
      console.error('Formatting error:', err);
      // If there's any error, fall back to plain text
      return content;
    }
  }
}
