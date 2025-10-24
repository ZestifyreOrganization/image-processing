let uploadedImage = null;
let originalCanvas = null;
let processedCanvas = null;

document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('imageInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const processBtn = document.getElementById('processBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const resetBtn = document.getElementById('resetBtn');
    const imageContainer = document.getElementById('imageContainer');
    const loading = document.getElementById('loading');
    const threshold = document.getElementById('threshold');
    const thresholdValue = document.getElementById('thresholdValue');

    originalCanvas = document.getElementById('originalCanvas');
    processedCanvas = document.getElementById('processedCanvas');

    uploadBtn.addEventListener('click', () => imageInput.click());

    imageInput.addEventListener('change', handleImageUpload);
    processBtn.addEventListener('click', processImage);
    downloadBtn.addEventListener('click', downloadImage);
    resetBtn.addEventListener('click', resetApp);

    threshold.addEventListener('input', (e) => {
        thresholdValue.textContent = e.target.value;
    });

    // Add paste event listener
    document.addEventListener('paste', handlePaste);
});

function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            uploadedImage = img;
            displayOriginalImage();
            document.getElementById('imageContainer').classList.remove('hidden');
            document.getElementById('downloadBtn').classList.add('hidden');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function handlePaste(e) {
    const items = e.clipboardData.items;

    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            e.preventDefault();
            const blob = items[i].getAsFile();

            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    uploadedImage = img;
                    displayOriginalImage();
                    document.getElementById('imageContainer').classList.remove('hidden');
                    document.getElementById('downloadBtn').classList.add('hidden');
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(blob);
            break;
        }
    }
}

function displayOriginalImage() {
    const ctx = originalCanvas.getContext('2d');
    originalCanvas.width = uploadedImage.width;
    originalCanvas.height = uploadedImage.height;
    ctx.drawImage(uploadedImage, 0, 0);
}

function processImage() {
    if (!uploadedImage) return;

    document.getElementById('loading').classList.remove('hidden');

    // Use setTimeout to allow the loading spinner to display
    setTimeout(() => {
        const thresholdValue = parseInt(document.getElementById('threshold').value);

        const ctx = originalCanvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
        const data = imageData.data;
        const width = originalCanvas.width;
        const height = originalCanvas.height;

        // Step 1: Flood fill from edges to find background
        let shouldRemove = floodFillFromEdges(data, width, height, thresholdValue);

        // Step 2: Apply morphological operations to clean up edges
        shouldRemove = cleanUpMask(shouldRemove, width, height);

        // Step 3: Create alpha mask with smooth edges
        const alphaMask = createSmoothAlphaMask(data, shouldRemove, width, height, thresholdValue);

        // Step 4: Apply the alpha mask
        const newImageData = ctx.createImageData(width, height);
        for (let i = 0; i < data.length; i += 4) {
            const pixelIndex = i / 4;
            newImageData.data[i] = data[i];
            newImageData.data[i + 1] = data[i + 1];
            newImageData.data[i + 2] = data[i + 2];
            newImageData.data[i + 3] = alphaMask[pixelIndex];
        }

        // Step 5: Trim to object boundaries
        const trimmedCanvas = trimToObject(newImageData);

        // Display processed image (trimmed)
        const processedCtx = processedCanvas.getContext('2d');
        processedCanvas.width = trimmedCanvas.width;
        processedCanvas.height = trimmedCanvas.height;
        processedCtx.drawImage(trimmedCanvas, 0, 0);

        document.getElementById('loading').classList.add('hidden');
        document.getElementById('downloadBtn').classList.remove('hidden');
    }, 50);
}

function floodFillFromEdges(data, width, height, threshold) {
    // Mark all white pixels reachable from image edges
    const reachableFromEdge = new Array(width * height).fill(false);
    const visited = new Array(width * height).fill(false);
    const queue = [];

    // Check if a pixel is white
    function isWhite(x, y) {
        if (x < 0 || x >= width || y < 0 || y >= height) return false;
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        return r >= threshold && g >= threshold && b >= threshold;
    }

    // Add pixel to queue
    function addToQueue(x, y) {
        if (x < 0 || x >= width || y < 0 || y >= height) return;
        const index = y * width + x;
        if (visited[index]) return;
        if (!isWhite(x, y)) return;

        visited[index] = true;
        queue.push({ x, y });
    }

    // Start from all edge pixels that are white
    for (let x = 0; x < width; x++) {
        addToQueue(x, 0);
        addToQueue(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
        addToQueue(0, y);
        addToQueue(width - 1, y);
    }

    // Flood fill through white pixels
    while (queue.length > 0) {
        const { x, y } = queue.shift();
        const index = y * width + x;

        reachableFromEdge[index] = true;

        // Add all 4-connected neighbors
        addToQueue(x + 1, y);
        addToQueue(x - 1, y);
        addToQueue(x, y + 1);
        addToQueue(x, y - 1);
    }

    return reachableFromEdge;
}

function cleanUpMask(mask, width, height) {
    // Apply morphological closing to smooth edges
    // Erosion followed by dilation
    const newMask = [...mask];

    // Erosion: shrink background slightly
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const index = y * width + x;
            if (mask[index]) {
                // Check if all neighbors are also background
                let allBackground = true;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nIndex = (y + dy) * width + (x + dx);
                        if (!mask[nIndex]) {
                            allBackground = false;
                            break;
                        }
                    }
                    if (!allBackground) break;
                }
                if (!allBackground) {
                    newMask[index] = false;
                }
            }
        }
    }

    // Dilation: expand background back
    const finalMask = [...newMask];
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const index = y * width + x;
            if (newMask[index]) {
                // Set neighbors to background
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nIndex = (y + dy) * width + (x + dx);
                        finalMask[nIndex] = true;
                    }
                }
            }
        }
    }

    return finalMask;
}

function createSmoothAlphaMask(data, shouldRemove, width, height, threshold) {
    const alphaMask = new Uint8Array(width * height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = y * width + x;
            const i = index * 4;

            if (shouldRemove[index]) {
                // Background - transparent
                alphaMask[index] = 0;
            } else {
                // Foreground - check for edge smoothing
                let alpha = 255;

                // Count background neighbors in 3x3 window
                let backgroundCount = 0;
                let totalNeighbors = 0;

                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            totalNeighbors++;
                            const nIndex = ny * width + nx;
                            if (shouldRemove[nIndex]) {
                                backgroundCount++;
                            }
                        }
                    }
                }

                // If near edge, apply feathering
                if (backgroundCount > 0) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];

                    // Calculate brightness
                    const brightness = (r + g + b) / 3;

                    // For very bright pixels near edges, reduce opacity more
                    if (brightness > 220) {
                        const edgeRatio = backgroundCount / totalNeighbors;
                        alpha = Math.floor(255 * (1 - edgeRatio * 0.9));
                    } else if (brightness > 180) {
                        const edgeRatio = backgroundCount / totalNeighbors;
                        alpha = Math.floor(255 * (1 - edgeRatio * 0.5));
                    } else {
                        const edgeRatio = backgroundCount / totalNeighbors;
                        alpha = Math.floor(255 * (1 - edgeRatio * 0.2));
                    }
                }

                alphaMask[index] = Math.max(0, alpha);
            }
        }
    }

    return alphaMask;
}

function trimToObject(imageData, padding = 10) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    // Find bounding box of non-transparent pixels
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const alpha = data[i + 3];

            // If pixel is not fully transparent (alpha > threshold)
            if (alpha > 10) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    // Add padding
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(width - 1, maxX + padding);
    maxY = Math.min(height - 1, maxY + padding);

    // Calculate dimensions
    const trimmedWidth = maxX - minX + 1;
    const trimmedHeight = maxY - minY + 1;

    // Create new canvas with trimmed dimensions
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = trimmedWidth;
    tempCanvas.height = trimmedHeight;
    const tempCtx = tempCanvas.getContext('2d');

    // Extract trimmed region
    const trimmedImageData = tempCtx.createImageData(trimmedWidth, trimmedHeight);

    for (let y = 0; y < trimmedHeight; y++) {
        for (let x = 0; x < trimmedWidth; x++) {
            const sourceIndex = ((y + minY) * width + (x + minX)) * 4;
            const targetIndex = (y * trimmedWidth + x) * 4;

            trimmedImageData.data[targetIndex] = data[sourceIndex];
            trimmedImageData.data[targetIndex + 1] = data[sourceIndex + 1];
            trimmedImageData.data[targetIndex + 2] = data[sourceIndex + 2];
            trimmedImageData.data[targetIndex + 3] = data[sourceIndex + 3];
        }
    }

    tempCtx.putImageData(trimmedImageData, 0, 0);
    return tempCanvas;
}

function downloadImage() {
    const link = document.createElement('a');
    link.download = 'image-no-background.png';
    link.href = processedCanvas.toDataURL('image/png');
    link.click();
}

function resetApp() {
    uploadedImage = null;
    document.getElementById('imageContainer').classList.add('hidden');
    document.getElementById('imageInput').value = '';
    document.getElementById('downloadBtn').classList.add('hidden');

    const ctx1 = originalCanvas.getContext('2d');
    const ctx2 = processedCanvas.getContext('2d');
    ctx1.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
    ctx2.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
}
