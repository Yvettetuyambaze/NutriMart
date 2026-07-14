#!/usr/bin/env bash
set -euo pipefail
pip install --upgrade pip
pip install --no-cache-dir -r requirements.txt
# Install Keras 3 over TF's bundled Keras 2.15 (required for our .h5 model)
pip install --no-cache-dir "keras==3.4.1" "namex" "optree" "ml-dtypes" "rich"
