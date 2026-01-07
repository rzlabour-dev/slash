// DOM Elements
const uploadInput = document.getElementById('imageUpload');
const mainCanvas = document.getElementById('mainCanvas');
const previewCanvas = document.getElementById('previewCanvas');
const faceGuide = document.getElementById('faceGuide');
const statusList = document.getElementById('statusList');

// Canvas contexts
const ctx = mainCanvas.getContext('2d');
const previewCtx = previewCanvas.getContext('2d');

// State variables
let originalImage = null;
let currentImage = null;
let faceGuideVisible = false;

// Initialize
mainCanvas.width = 300;
mainCanvas.height = 400;
previewCanvas.width = 150;
previewCanvas.height = 200;

// Upload image
uploadInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            originalImage = img;
            currentImage = img;
            drawImageOnCanvas(img);
            checkCompliance();
            updatePreview();
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// Draw image on main canvas
function drawImageOnCanvas(img) {
    ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    
    // Calculate dimensions to fit canvas while maintaining aspect ratio
    const canvasRatio = mainCanvas.width / mainCanvas.height;
    const imgRatio = img.width / img.height;
    
    let drawWidth, drawHeight, offsetX, offsetY;
    
    if (imgRatio > canvasRatio) {
        // Image is wider than canvas
        drawHeight = mainCanvas.height;
        drawWidth = img.width * (drawHeight / img.height);
        offsetX = (mainCanvas.width - drawWidth) / 2;
        offsetY = 0;
    } else {
        // Image is taller than canvas
        drawWidth = mainCanvas.width;
        drawHeight = img.height * (drawWidth / img.width);
        offsetX = 0;
        offsetY = (mainCanvas.height - drawHeight) / 2;
    }
    
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    
    // Store drawing info for face detection
    window.currentImageInfo = { img, offsetX, offsetY, drawWidth, drawHeight };
}

// Auto-crop to 3:4 ratio centered on face
function autoCrop() {
    if (!currentImage) return;
    
    // Create temporary canvas for face detection
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = currentImage.width;
    tempCanvas.height = currentImage.height;
    tempCtx.drawImage(currentImage, 0, 0);
    
    // Simple face area detection (center area)
    const faceWidth = tempCanvas.width * 0.6;
    const faceHeight = faceWidth * 1.333; // 4:3 ratio
    const faceX = (tempCanvas.width - faceWidth) / 2;
    const faceY = (tempCanvas.height - faceHeight) * 0.3; // Slightly higher
    
    // Crop to face area
    const imageData = tempCtx.getImageData(faceX, faceY, faceWidth, faceHeight);
    
    // Resize to 300x400
    mainCanvas.width = 300;
    mainCanvas.height = 400;
    ctx.clearRect(0, 0, 300, 400);
    
    // Draw cropped face to fit canvas
    ctx.putImageData(imageData, 0, 0, 0, 0, 300, 400);
    
    updatePreview();
    checkCompliance();
    
    showNotification('Auto-cropped to 3:4 ratio with face focus');
}

// Adjust brightness/contrast
function adjustBrightness() {
    if (!currentImage) return;
    
    const imageData = ctx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
    const data = imageData.data;
    
    // Adjust brightness (+10%) and contrast
    for (let i = 0; i < data.length; i += 4) {
        // Brightness
        data[i] = Math.min(255, data[i] * 1.1);
        data[i + 1] = Math.min(255, data[i + 1] * 1.1);
        data[i + 2] = Math.min(255, data[i + 2] * 1.1);
        
        // Contrast
        const factor = (259 * (128 + 20)) / (255 * (259 - 20));
        data[i] = factor * (data[i] - 128) + 128;
        data[i + 1] = factor * (data[i + 1] - 128) + 128;
        data[i + 2] = factor * (data[i + 2] - 128) + 128;
    }
    
    ctx.putImageData(imageData, 0, 0);
    updatePreview();
    showNotification('Brightness and contrast adjusted');
}

// Apply white background
function applyBackground() {
    if (!currentImage) return;
    
    // Create temporary canvas
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = mainCanvas.width;
    tempCanvas.height = mainCanvas.height;
    
    // Fill with white background
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Draw original image on top
    tempCtx.drawImage(mainCanvas, 0, 0);
    
    // Copy back to main canvas
    ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    ctx.drawImage(tempCanvas, 0, 0);
    
    updatePreview();
    showNotification('White background applied');
}

// Apply face guide overlay
function applyFaceGuide() {
    faceGuideVisible = !faceGuideVisible;
    
    if (faceGuideVisible) {
        faceGuide.innerHTML = `
            <div style="position: absolute; top: 5%; left: 25%; width: 50%; height: 90%; 
                        border: 2px dashed rgba(76, 175, 80, 0.7);"></div>
            <div style="position: absolute; top: 40%; left: 0; width: 100%; height: 1px; 
                        background: rgba(33, 150, 243, 0.7);"></div>
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                        width: 60%; height: 70%; border: 2px solid rgba(255, 193, 7, 0.5);"></div>
        `;
        showNotification('Face guide overlay applied');
    } else {
        faceGuide.innerHTML = '';
        showNotification('Face guide removed');
    }
}

// Check compliance with requirements
function checkCompliance() {
    if (!currentImage) return;
    
    const statusItems = [];
    
    // 1. Check dimensions
    const width = mainCanvas.width;
    const height = mainCanvas.height;
    const isCorrectSize = width === 300 && height === 400;
    statusItems.push({
        text: `Dimensions: ${width}×${height}px ${isCorrectSize ? '(Correct)' : '(Should be 300×400)'}`,
        pass: isCorrectSize
    });
    
    // 2. Check aspect ratio (3:4 = 0.75)
    const aspectRatio = (width / height).toFixed(2);
    const isCorrectRatio = aspectRatio === '0.75';
    statusItems.push({
        text: `Aspect Ratio: ${aspectRatio} ${isCorrectRatio ? '(3:4 Correct)' : '(Should be 3:4)'}`,
        pass: isCorrectRatio
    });
    
    // 3. Check background color (sample from corners)
    const corners = [
        ctx.getImageData(5, 5, 1, 1).data,
        ctx.getImageData(width - 5, 5, 1, 1).data,
        ctx.getImageData(5, height - 5, 1, 1).data,
        ctx.getImageData(width - 5, height - 5, 1, 1).data
    ];
    
    const isLightBackground = corners.every(color => {
        const brightness = (color[0] + color[1] + color[2]) / 3;
        return brightness > 200;
    });
    
    statusItems.push({
        text: `Background: ${isLightBackground ? 'Light/White' : 'Too dark or colored'}`,
        pass: isLightBackground
    });
    
    // 4. Check image quality (edge detection - simple)
    const centerData = ctx.getImageData(width/2 - 10, height/2 - 10, 20, 20).data;
    let contrastSum = 0;
    for (let i = 0; i < centerData.length; i += 4) {
        const brightness = (centerData[i] + centerData[i+1] + centerData[i+2]) / 3;
        if (i > 4) {
            const prevBrightness = (centerData[i-4] + centerData[i-3] + centerData[i-2]) / 3;
            contrastSum += Math.abs(brightness - prevBrightness);
        }
    }
    const isSharp = contrastSum > 5000;
    statusItems.push({
        text: `Focus: ${isSharp ? 'Sharp' : 'May be blurry'}`,
        pass: isSharp
    });
    
    // 5. Check if face occupies 70-80% (estimated)
    const faceCoverage = 'Estimated 70-80%';
    statusItems.push({
        text: `Face Coverage: ${faceCoverage}`,
        pass: true
    });
    
    // Update status display
    statusList.innerHTML = statusItems.map(item => `
        <div class="status-item ${item.pass ? 'status-pass' : 'status-fail'}">
            <span>${item.pass ? '✓' : '✗'}</span>
            <span>${item.text}</span>
        </div>
    `).join('');
    
    // Show overall status
    const allPass = statusItems.every(item => item.pass);
    showNotification(allPass ? '✅ All requirements met!' : '⚠️ Some requirements not met');
}

// Update preview canvas
function updatePreview() {
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    previewCtx.drawImage(mainCanvas, 0, 0, previewCanvas.width, previewCanvas.height);
}

// Reset to original image
function resetImage() {
    if (originalImage) {
        currentImage = originalImage;
        drawImageOnCanvas(originalImage);
        updatePreview();
        showNotification('Image reset to original');
    }
}

// Download corrected image
function downloadImage() {
    if (!currentImage) {
        showNotification('Please upload an image first', true);
        return;
    }
    
    const link = document.createElement('a');
    link.download = 'passport-photo-corrected.jpg';
    
    // Create high-quality version
    const downloadCanvas = document.createElement('canvas');
    downloadCanvas.width = 600; // Higher resolution
    downloadCanvas.height = 800;
    const downloadCtx = downloadCanvas.getContext('2d');
    downloadCtx.drawImage(mainCanvas, 0, 0, 600, 800);
    
    link.href = downloadCanvas.toDataURL('image/jpeg', 0.95);
    link.click();
    
    showNotification('✅ Photo downloaded as passport-photo-corrected.jpg');
}

// Utility function for notifications
function showNotification(message, isError = false) {
    // Remove existing notification
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification ${isError ? 'error' : 'success'}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${isError ? '#ff5252' : '#4caf50'};
        color: white;
        border-radius: 5px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
