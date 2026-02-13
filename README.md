# LaMaEraser

## Overview
![LaMaEraser Demo](https://raw.githubusercontent.com/Rootport-AI/LaMaEraser/main/demo.gif)  
LaMaEraser is a web-based image editing tool that integrates with the [LaMa inpainting model](https://github.com/advimman/lama) to remove unwanted objects from images. Users can draw masks on the image using a brush, eraser, or bucket tool, and then process the image with AI to seamlessly erase the masked areas. This tool is built with Flask, JavaScript, and leverages Rootport-AI's GPU-enhanced fork of the LaMa model.

## Features
- Image Upload: Load images via file selection or drag-and-drop.  
- Drawing Tools: Brush, eraser, and bucket fill for mask creation.   
- AI Processing: Send masked images to LaMa for inpainting.
- Download: Save the processed image locally.

## Installation
### Prerequisites
- Windows OS (tested on Windows 10/11)
- Python 3.10
- Git
- Internet connection (for cloning repository and downloading models)
- CUDA GPU with VRAM 6GB or more.

### Steps
1. Download the Repository   
- Clone or download this repository from GitHub.  
2. Prepare the Files  
- Ensure the following files are in a single folder:  
```
app.py
index.html
main.js
nouislider.min.css
nouislider.min.js
require.txt
run.bat
setup.bat
style.css
\images
    defimg.png
    favicon16.png
    favicon32.png
    favicon64.png
    favicon_original.jpg
```
3. Run the Setup Script  
- Double-click setup.bat in the folder.  
- The script will:  
   - Create an \appfiles directory.  
   - Clone Rootport-AI's LaMa fork.
   - Copy necessary files to \appfiles\lama.
   - Set up a Python virtual environment.
   - Install dependencies from require.txt.
   - Download and extract the big-lama model from Hugging Face.
4. Verify Installation
- After setup completes, check \appfiles\lama for the installed files.  

## Usage
1. Launch the Application  
- Local only (default): double-click `run.bat` to start the Flask server bound to `127.0.0.1`.
- LAN share: run `run.bat --listen` from Command Prompt (or double-click `run_listen.bat`) to bind to `0.0.0.0`.
2. Access the Tool  
- Local PC: open http://localhost:7859.  
- LAN clients (when `--listen` is enabled): open `http://<host-pc-ip>:7859`.
3. Edit an Image  
- Load an image using the "Load" button (F) or drag-and-drop.  
- Use the brush (B), eraser (E), or bucket (G) to draw a mask.  
- Press "Run" (Enter) to process the image with LaMa.  
- Download the result with the "Download" button (S).  

### Startup examples
- `run.bat`
  - Localhost only (`127.0.0.1`), not reachable from other devices.
- `run.bat --listen`
  - LAN accessible (`0.0.0.0`), reachable at `http://<host-pc-ip>:7859`.
  - For safety, Flask debug mode is always disabled when `--listen` is set.

### LAN access notes
- Ensure the host PC and client device are on the same network.
- Allow Python/port `7859` through Windows Defender Firewall if prompted.
- Avoid exposing this port to untrusted/public networks.

## Keyboard Shortcuts  
- Ctrl+Z: Undo
- Ctrl+Y: Redo  
- H: Toggle Pan mode  
- B / P: Brush mode  
- E: Eraser mode  
- G: Bucket mode  
- [ ]: Decrease/Increase brush size  
- "+ / -": Zoom in/out  
- 0: Reset view  
- F: Load file  
- Enter: Run  
- S: Download  

## Dependencies
See require.txt for the full list of Python dependencies. Key libraries include:  
- Flask (BSD 3-Clause)  
- PyTorch (BSD 3-Clause)  
- TensorFlow (Apache 2.0)  
- noUISlider (MIT, included as nouislider.min.js and nouislider.min.css)  

## License  
This project is licensed under the MIT License. See below for third-party licenses:  

## Third-Party Licenses  
- LaMa: Resolution-robust Large Mask Inpainting with Fourier Convolutions  
    - Source: https://github.com/advimman/lama  
- big-lama Model: No explicit license (research use assumed)  
    - Source: https://huggingface.co/smartywu/big-lama  
    - Provided by smartywu via Hugging Face  
- Font Awesome: CC BY 4.0 (icons), MIT (CSS)  
    - Source: https://fontawesome.com/  
    - Used via CDN in index.html  
- noUISlider: MIT License  
    - Source: https://refreshless.com/nouislider/  
    - Included as nouislider.min.js and nouislider.min.css  

## Notes
- The Undo/Redo functionality for background edits is still under refinement and may not work as expected in this version.  
- Ensure a stable internet connection during setup for cloning and model download.  
- For GPU acceleration, CUDA 12.1-compatible hardware and drivers are recommended (see PyTorch requirements).  

## Contributing  
Feel free to fork this repository, submit issues, or send pull requests. Feedback and contributions are welcome!  

## Acknowledgments  
- Rootport-AI for their GPU-enhanced LaMa fork.  
- The original LaMa project by SAI-MDAL.  
- The open-source community for providing invaluable tools and libraries.  
