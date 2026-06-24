# 🧠 Models

This directory is intended to store the compiled ONNX model weights (`brahmos_vision_model.onnx`).

### Why is this folder empty by default?
Machine learning models are large binary files (e.g., 10MB to 100MB+). They are ignored by Git (via `.gitignore`) to keep the repository lightweight and cloneable.

### How to get the model:
1. Navigate to the `backend/` directory.
2. Run the export script:
   ```bash
   python export_onnx.py
   ```
3. The script will download the base YOLOv8 model from the Ultralytics servers and compile it into an `.onnx` file.
4. Move or ensure `brahmos_vision_model.onnx` is placed here (or inside `backend/` depending on your environment config).

> **Important**: Never commit `.onnx`, `.pt`, or `.weights` files to the repository!
