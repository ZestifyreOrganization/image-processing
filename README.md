# Image Processing - White Background Remover

A client-side web application that removes white backgrounds from images and converts them to PNG with transparent backgrounds.

## Features

- Upload any image with a white background
- Intelligent flood-fill algorithm that preserves enclosed white areas (like in windows, text, etc.)
- Edge smoothing and anti-aliasing for clean cutouts
- Adjustable threshold for background detection
- Side-by-side comparison view
- Download processed image as PNG
- 100% client-side processing (no server uploads)

## How to Use

1. Open `index.html` in a web browser
2. Click "Choose Image" to upload an image
3. Adjust the threshold slider if needed (200-255)
4. Click "Remove Background" to process
5. Click "Download PNG" to save the result

## Technical Details

The application uses:
- HTML5 Canvas for image processing
- Flood-fill algorithm starting from image edges
- Morphological operations for edge cleanup
- Alpha channel manipulation for smooth transitions
- Edge-aware feathering for anti-aliasing

## Files

- `index.html` - Main HTML structure and UI
- `style.css` - Styling and layout
- `script.js` - Image processing algorithms

## Browser Compatibility

Works in all modern browsers that support:
- HTML5 Canvas
- File API
- ES6+ JavaScript

## Future Enhancements

- AI-powered background removal using deep learning models
- Advanced edge refinement algorithms
- Batch processing support
- More output format options
