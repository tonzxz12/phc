// board.component.ts
import { Component, ElementRef, ViewChild, AfterViewInit, HostListener, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';

interface BoardObject {
  id: number;
  type: 'image';
  x: number;
  y: number;
  isDragging: boolean;
  offsetX: number;
  offsetY: number;
}

interface ImageObject extends BoardObject {
  type: 'image';
  src: string;
  width: number;
  height: number;
}

type BoardItem = ImageObject;

@Component({
  selector: 'app-board',
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class BoardComponent implements AfterViewInit, AfterViewChecked {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('toolbox') toolboxRef!: ElementRef<HTMLDivElement>;
  @ViewChild('imageInput') imageInput!: ElementRef<HTMLInputElement>;
  
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private drawing = false;
  private erasing = false;
  
  // Store the background image (with drawings)
  private backgroundCanvas: HTMLCanvasElement | null = null;
  
  // Drawing state
  currentColor = '#000000';
  currentLineWidth = 2;
  currentTool = 'cursor'; // 'cursor', 'pen', 'eraser', 'image'
  
  // Board objects (images)
  boardItems: BoardItem[] = [];
  nextItemId = 1;
  selectedItem: BoardItem | null = null;
  
  // History for undo/redo
  history: string[] = [];
  redoStack: string[] = [];
  
  // UI state
  isToolboxVisible = true;
  isColorPickerOpen = false;
  
  // Available colors
  colors = [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', 
    '#ffff00', '#ff00ff', '#00ffff', '#888888'
  ];

  ngAfterViewInit() {
    this.setupCanvas();
    this.setupToolbox();
    this.resizeCanvas();
  }
  
  ngAfterViewChecked() {
    // No text input to focus
  }

  private setupCanvas() {
    this.canvas = this.canvasRef.nativeElement;
    const context = this.canvas.getContext('2d');
    
    if (!context) {
      console.error('Could not get 2D context from canvas');
      return;
    }
    
    this.ctx = context;
    
    // Set initial canvas state
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = this.currentColor;
    this.ctx.lineWidth = this.currentLineWidth;
    
    // Set white background
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Initialize background canvas with white background
    this.backgroundCanvas = document.createElement('canvas');
    this.backgroundCanvas.width = this.canvas.width;
    this.backgroundCanvas.height = this.canvas.height;
    const bgCtx = this.backgroundCanvas.getContext('2d');
    if (bgCtx) {
      bgCtx.fillStyle = '#ffffff';
      bgCtx.fillRect(0, 0, this.backgroundCanvas.width, this.backgroundCanvas.height);
    }
    
    // Save initial state to history
    this.saveToHistory();
  }
  
  private setupToolbox() {
    // Set up draggable toolbox
    const toolbox = this.toolboxRef.nativeElement;
    let isDragging = false;
    let offsetX: number = 0;
    let offsetY: number = 0;
    
    toolbox.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.target === toolbox || (e.target as HTMLElement).classList.contains('toolbox-header')) {
        isDragging = true;
        offsetX = e.clientX - toolbox.getBoundingClientRect().left;
        offsetY = e.clientY - toolbox.getBoundingClientRect().top;
      }
    });
    
    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (isDragging) {
        toolbox.style.left = (e.clientX - offsetX) + 'px';
        toolbox.style.top = (e.clientY - offsetY) + 'px';
      }
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }
  
  @HostListener('window:resize')
  resizeCanvas() {
    // Get the dimensions of the container
    const container = this.canvas.parentElement;
    if (!container) return;
    
    // Save current drawing
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    
    tempCanvas.width = this.canvas.width;
    tempCanvas.height = this.canvas.height;
    tempCtx.drawImage(this.canvas, 0, 0);
    
    // Resize canvas
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
    
    // Set white background
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Restore drawing
    this.ctx.drawImage(tempCanvas, 0, 0);
    
    // Reset context properties
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = this.currentColor;
    this.ctx.lineWidth = this.currentLineWidth;
    
    // Update background canvas size
    if (this.backgroundCanvas) {
      const bgCtx = this.backgroundCanvas.getContext('2d');
      if (bgCtx) {
        const tempBgCanvas = document.createElement('canvas');
        tempBgCanvas.width = this.backgroundCanvas.width;
        tempBgCanvas.height = this.backgroundCanvas.height;
        const tempBgCtx = tempBgCanvas.getContext('2d');
        if (tempBgCtx) {
          tempBgCtx.drawImage(this.backgroundCanvas, 0, 0);
          
          this.backgroundCanvas.width = this.canvas.width;
          this.backgroundCanvas.height = this.canvas.height;
          
          bgCtx.fillStyle = '#ffffff';
          bgCtx.fillRect(0, 0, this.backgroundCanvas.width, this.backgroundCanvas.height);
          bgCtx.drawImage(tempBgCanvas, 0, 0);
        }
      }
    }
    
    // Redraw all board items
    this.redrawBoardItems();
  }
  
  onMouseDown(event: MouseEvent) {
    const pos = this.getMousePosition(event);
    
    // Check if we clicked on an image
    if (this.currentTool === 'cursor') {
      for (const item of this.boardItems) {
        if (this.isPointInItem(pos, item)) {
          // Set the item as selected and start dragging it
          this.selectedItem = item;
          item.isDragging = true;
          item.offsetX = pos.x - item.x;
          item.offsetY = pos.y - item.y;
          
          this.redrawBoardItems();
          return;
        }
      }
    }
  
    // No image was clicked
    if (this.currentTool === 'pen') {
      // Draw on both the main canvas and the background canvas
      this.drawing = true;
      
      // Start drawing on main canvas
      this.ctx.beginPath();
      this.ctx.strokeStyle = this.currentColor;
      this.ctx.lineWidth = this.currentLineWidth;
      this.ctx.moveTo(pos.x, pos.y);
      
      // Also set up for drawing on background canvas
      if (this.backgroundCanvas) {
        const bgCtx = this.backgroundCanvas.getContext('2d');
        if (bgCtx) {
          bgCtx.beginPath();
          bgCtx.lineCap = 'round';
          bgCtx.lineJoin = 'round';
          bgCtx.strokeStyle = this.currentColor;
          bgCtx.lineWidth = this.currentLineWidth;
          bgCtx.moveTo(pos.x, pos.y);
        }
      }
    } else if (this.currentTool === 'eraser') {
      this.erasing = true;
      this.erase(pos.x, pos.y);
    }
  }
  
  onMouseMove(event: MouseEvent) {
    const pos = this.getMousePosition(event);
    
    // Check if we're dragging a board item
    if (this.selectedItem && this.selectedItem.isDragging) {
      this.selectedItem.x = pos.x - this.selectedItem.offsetX;
      this.selectedItem.y = pos.y - this.selectedItem.offsetY;
      this.redrawBoardItems();
      return;
    }
    
    if (!this.drawing && !this.erasing) return;
    
    if (this.currentTool === 'pen' && this.drawing) {
      // Draw on main canvas
      this.ctx.lineTo(pos.x, pos.y);
      this.ctx.stroke();
      
      // Also draw on background canvas
      if (this.backgroundCanvas) {
        const bgCtx = this.backgroundCanvas.getContext('2d');
        if (bgCtx) {
          bgCtx.lineTo(pos.x, pos.y);
          bgCtx.stroke();
        }
      }
    } else if (this.currentTool === 'eraser' && this.erasing) {
      this.erase(pos.x, pos.y);
    }
  }
  
  onMouseUp() {
    // Stop dragging board items
    if (this.selectedItem && this.selectedItem.isDragging) {
      this.selectedItem.isDragging = false;
      this.saveToHistory();
    }
    
    if (this.drawing || this.erasing) {
      // We already updated the background canvas as we were drawing/erasing
      this.saveToHistory();
    }
    
    this.drawing = false;
    this.erasing = false;
  }
  
  private getMousePosition(event: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }
  
  private isPointInItem(point: {x: number, y: number}, item: BoardItem): boolean {
    if (item.type === 'image') {
      const imageItem = item as ImageObject;
      
      return (
        point.x >= item.x && 
        point.x <= item.x + imageItem.width && 
        point.y >= item.y && 
        point.y <= item.y + imageItem.height
      );
    }
    
    return false;
  }
  
  // Save background (all drawings without images)
  private saveBackground() {
    if (!this.backgroundCanvas) {
      this.backgroundCanvas = document.createElement('canvas');
      this.backgroundCanvas.width = this.canvas.width;
      this.backgroundCanvas.height = this.canvas.height;
    }
    
    // Make sure dimensions match current canvas
    if (this.backgroundCanvas.width !== this.canvas.width || this.backgroundCanvas.height !== this.canvas.height) {
      this.backgroundCanvas.width = this.canvas.width;
      this.backgroundCanvas.height = this.canvas.height;
    }
    
    // The key difference: we don't blindly copy from the main canvas which contains images
    // Instead, we'll selectively update it only when we're actually drawing
    
    if (this.drawing || this.erasing) {
      const bgCtx = this.backgroundCanvas.getContext('2d');
      if (bgCtx) {
        // We only update the background canvas when drawing or erasing
        bgCtx.clearRect(0, 0, this.backgroundCanvas.width, this.backgroundCanvas.height);
        bgCtx.drawImage(this.canvas, 0, 0);
      }
    }
  }
  
  // Redraw all board items
  private redrawBoardItems() {
    // Clear the main canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // First draw a white background
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Use the stored background if it exists (contains all drawings)
    if (this.backgroundCanvas) {
      this.ctx.drawImage(this.backgroundCanvas, 0, 0);
    }
    
    // Draw all board items (images) on top
    for (const item of this.boardItems) {
      if (item.type === 'image') {
        const imageItem = item as ImageObject;
        const img = new Image();
        img.src = imageItem.src;
        
        // Draw the image immediately if it's loaded
        if (img.complete) {
          this.ctx.drawImage(img, imageItem.x, imageItem.y, imageItem.width, imageItem.height);
          
          // Draw selection border if selected
          if (item === this.selectedItem) {
            this.ctx.strokeStyle = '#1890ff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(
              imageItem.x - 4,
              imageItem.y - 4,
              imageItem.width + 8,
              imageItem.height + 8
            );
            
            // Add handles for better visibility
            this.ctx.fillStyle = '#1890ff';
            this.ctx.fillRect(imageItem.x - 4, imageItem.y - 4, 8, 8); // Top-left
            this.ctx.fillRect(imageItem.x + imageItem.width, imageItem.y - 4, 8, 8); // Top-right
            this.ctx.fillRect(imageItem.x - 4, imageItem.y + imageItem.height, 8, 8); // Bottom-left
            this.ctx.fillRect(imageItem.x + imageItem.width, imageItem.y + imageItem.height, 8, 8); // Bottom-right
          }
        } else {
          // If image isn't loaded yet, set up an onload handler
          img.onload = () => {
            this.redrawBoardItems(); // Redraw everything when image loads
          };
        }
      }
    }
  }
  
  // Line width event handler
  onLineWidthChange(event: Event) {
    if (event.target instanceof HTMLInputElement) {
      const width = parseInt(event.target.value, 10);
      this.setLineWidth(width);
    }
  }
  
  // Image upload functions
  triggerImageUpload() {
    this.imageInput.nativeElement.click();
  }
  
  onImageSelected(event: Event) {
    if (event.target instanceof HTMLInputElement && event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const result = e.target?.result;
        if (e.target && typeof result === 'string') {
          const img = new Image();
          
          img.onload = () => {
            // Calculate dimensions while maintaining aspect ratio
            const maxWidth = this.canvas.width / 2;
            const maxHeight = this.canvas.height / 2;
            
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth) {
              const ratio = maxWidth / width;
              width = maxWidth;
              height = height * ratio;
            }
            
            if (height > maxHeight) {
              const ratio = maxHeight / height;
              height = maxHeight;
              width = width * ratio;
            }
            
            // Create image item at center of canvas
            const x = (this.canvas.width / 2) - (width / 2);
            const y = (this.canvas.height / 2) - (height / 2);
            
            const imageItem: ImageObject = {
              id: this.nextItemId++,
              type: 'image',
              src: result,
              x: x,
              y: y,
              width: width,
              height: height,
              isDragging: false,
              offsetX: 0,
              offsetY: 0
            };
            
            this.boardItems.push(imageItem);
            this.selectedItem = imageItem;
            
            this.redrawBoardItems();
            this.saveToHistory();
          };
          
          img.src = result;
        }
      };
      
      reader.readAsDataURL(file);
    }
  }
  
  // Drawing tools
  setTool(tool: string) {
    this.currentTool = tool;
    
    // If switching to cursor tool, deselect current item
    if (tool !== 'cursor') {
      this.selectedItem = null;
      this.redrawBoardItems();
    }
    
    if (tool === 'pen') {
      this.ctx.strokeStyle = this.currentColor;
    }
  }
  
  setColor(color: string) {
    this.currentColor = color;
    this.ctx.strokeStyle = color;
    this.isColorPickerOpen = false;
  }
  
  setLineWidth(width: number) {
    this.currentLineWidth = width;
    this.ctx.lineWidth = width;
  }
  
  toggleColorPicker() {
    this.isColorPickerOpen = !this.isColorPickerOpen;
  }
  
  private erase(x: number, y: number) {
    const eraserSize = this.currentLineWidth * 5;
    
    // Erase on main canvas
    this.ctx.save();
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(x, y, eraserSize, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
    
    // Also erase on background canvas
    if (this.backgroundCanvas) {
      const bgCtx = this.backgroundCanvas.getContext('2d');
      if (bgCtx) {
        bgCtx.save();
        bgCtx.fillStyle = '#ffffff';
        bgCtx.beginPath();
        bgCtx.arc(x, y, eraserSize, 0, Math.PI * 2);
        bgCtx.fill();
        bgCtx.restore();
      }
    }
  }
  
  // History management
  private saveToHistory() {
    // Create a snapshot of the background (with drawings) and board items (images)
    const backgroundData = this.backgroundCanvas ? this.backgroundCanvas.toDataURL() : '';
    const boardItemsData = JSON.stringify(this.boardItems);
    
    const historyEntry = {
      background: backgroundData,
      items: boardItemsData
    };
    
    this.history.push(JSON.stringify(historyEntry));
    this.redoStack = []; // Clear redo stack on new action
    
    // Limit history size
    if (this.history.length > 20) {
      this.history.shift();
    }
  }
  
  undo() {
    if (this.history.length <= 1) return;
    
    // Save current state to redo stack
    const currentState = this.history.pop();
    if (currentState) {
      this.redoStack.push(currentState);
    }
    
    // Load previous state
    const previousState = this.history[this.history.length - 1];
    if (previousState) {
      this.loadFromHistory(previousState);
    }
  }
  
  redo() {
    if (this.redoStack.length === 0) return;
    
    // Get last redo action
    const redoState = this.redoStack.pop();
    if (redoState) {
      // Add to history and load
      this.history.push(redoState);
      this.loadFromHistory(redoState);
    }
  }
  
  private loadFromHistory(historyData: string) {
    try {
      const historyEntry = JSON.parse(historyData);
      
      // Load background data (drawings)
      if (historyEntry.background) {
        const bgImg = new Image();
        bgImg.onload = () => {
          // Restore the background canvas
          if (!this.backgroundCanvas) {
            this.backgroundCanvas = document.createElement('canvas');
            this.backgroundCanvas.width = this.canvas.width;
            this.backgroundCanvas.height = this.canvas.height;
          }
          
          const bgCtx = this.backgroundCanvas.getContext('2d');
          if (bgCtx) {
            bgCtx.clearRect(0, 0, this.backgroundCanvas.width, this.backgroundCanvas.height);
            bgCtx.drawImage(bgImg, 0, 0);
          }
          
          // Load board items (images)
          this.boardItems = JSON.parse(historyEntry.items);
          
          // Redraw everything
          this.redrawBoardItems();
        };
        bgImg.src = historyEntry.background;
      } else {
        // If no background data, just load the items
        this.boardItems = JSON.parse(historyEntry.items);
        this.redrawBoardItems();
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  }
  
  // File operations
  clearBoard() {
    // Clear the main canvas
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Clear the background canvas
    if (this.backgroundCanvas) {
      const bgCtx = this.backgroundCanvas.getContext('2d');
      if (bgCtx) {
        bgCtx.fillStyle = '#ffffff';
        bgCtx.fillRect(0, 0, this.backgroundCanvas.width, this.backgroundCanvas.height);
      }
    }
    
    this.boardItems = [];
    this.selectedItem = null;
    this.saveToHistory();
  }
  
  saveBoard() {
    // Create a download link
    const link = document.createElement('a');
    link.download = 'whiteboard.png';
    
    // Render all items onto the canvas for saving
    this.redrawBoardItems();
    link.href = this.canvas.toDataURL();
    link.click();
  }
  
  // Toggle toolbox visibility
  minimizeToolbox() {
    this.isToolboxVisible = false;
  }
  
  showToolbox() {
    this.isToolboxVisible = true;
  }
}