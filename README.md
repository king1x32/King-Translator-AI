<p align="right">
  <b>English</b> | <a href="./docs/vi/">Tiếng Việt</a>
</p>

# King Translator AI - The All-in-One AI Translation Tool 🔥

![Version](https://img.shields.io/badge/version-5.3-blue?style=for-the-badge)
![Status](https://img.shields.io/badge/status-active-green?style=for-the-badge)
![License](https://img.shields.io/badge/license-GPL--3.0-orange?style=for-the-badge)
[![Discord](https://img.shields.io/discord/1206126615848554526?style=for-the-badge&logo=discord&label=Discord)](https://discord.gg/8DTwr8QpsM)

<div align="center">
  <img src="https://raw.githubusercontent.com/king1x32/King-Translator-AI/refs/heads/main/icon/kings.jpg" alt="King Translator AI Logo" width="200"/>
  <br>
  <i>Translate everything with the power of 6 leading AI providers, right in your browser!</i>
  <h3>If you like this userscript, please give this repository a star! ✨</h3>
</div>

## 📖 Table of Contents
- [What's New in Version 5.0?](#-whats-new-in-version-50)
- [Introduction](#-introduction)
- [Core Features](#-core-features)
- [Screenshots](#-screenshots)
- [Installation Guide](#-installation-guide)
- [Usage Guide](#-usage-guide)
- [Hotkeys & Gestures](#-hotkeys--gestures)
- [Support & Contribution](#-support--contribution)
- [License](#-license)
- [Vietnamese Guide](README_vi.md)

## 🚀 What's New in Version 5.0?

Version 5.0 is a major update focused on expanding capabilities, optimizing performance, and enhancing user experience:

- 🧠 **Multi-AI Provider Support:** Integrates 8 leading AI providers: **Gemini, Claude, Perplexity, OpenAI, Mistral, Deepseek and Ollama**.
  - **Gemini:** Full support for all features, including large file translation.
  - **Claude, Perplexity, OpenAI, Mistral:** All features supported except file translation.
  - **Deepseek, Ollama:** Text-related features and YouTube live-caption translation.
- 🗣️ **Versatile Text-to-Speech (TTS):** Adds 5 new TTS sources (Gemini, OpenAI, Google Cloud, Google Translate) alongside device TTS, with customizable voice, speed, and pitch.
- 📂 **Advanced File & Media Translation:** Translate a wide range of local files and URLs. Supports documents (`PDF`, `DOCX`, `HTML`, `SRT`), media (`MP4`, `MP3`, `WAV`), and large files up to 2GB via the Gemini API.
- 🚀 **API & Performance Optimization:** Improved API key management to minimize rate-limiting, resulting in faster and more stable page translations.
- 🎨 **Enhanced Manga Web Translation:** More accurate translation placement with interactive overlays. Users can now freely move, resize, reset (`Double-click`), and even adjust the background opacity (hold `Ctrl` + `roll the mouse wheel`) of translated text bubbles for a perfect reading experience.
- 🖼️ **Upgraded OCR:** The "OCR Region" feature has been revamped into a more powerful and convenient "Capture and Translate Screen Region" tool.
- 🔒 **Enhanced Security:** Settings backup files are now encrypted to protect your API keys.
- ✍️ **Improved Input Translation:** The translation tool for input fields can now be moved and its position saved per website.
- ⚙️ **UI & Experience:**
  - A redesigned, more attractive translation popup with a convenient copy button.
  - A global toggle switch to enable or disable all translation tools at once.
- ✅ **Bug Fixes & Stability:** Resolves issues reported in previous versions.

## 🌟 Introduction
**King Translator AI** is a powerful userscript that transforms your browser into an all-encompassing translation powerhouse. By integrating the most advanced AI models, the script allows you to break down any language barrier, from simple text translation to complex video analysis, all with just a few clicks.

## ✨ Core Features

<details>
<summary><b>🧠 Multi-AI Provider Translation</b></summary>

- Flexibly choose from 8 leading AI providers: **Google Gemini, Anthropic Claude, Perplexity, OpenAI, Mistral, Deepseek and Ollama**.
- Leverage the strengths of each model for different translation tasks.
- Smart API key management with automatic rotation to optimize performance and avoid rate-limits.
</details>

<details>
<summary><b>📝 Intelligent Text Translation</b></summary>

- **Quick Translation:** Instantly translate selected text.
- **Popup Translation:** A modern popup interface displaying the original text, phonetic transcription (IPA/Pinyin), and translation.
- **Advanced Translation:** Deeper vocabulary and context analysis.
- **Input Field Translation:** Automatically translate text within input fields and textareas as you type.
- **Full Page Translation:** Translate entire web pages with the option to exclude specific elements.
- **YouTube Live-Caption Translation:** Real-time translation of YouTube video subtitles, with bilingual display support.
</details>

<details>
<summary><b>🖼️ Image (OCR) & Manga Translation</b></summary>

- **Capture and Translate Screen Region:** Drag your mouse to select and translate any content on your screen.
- **Web Image Translation:** Click on any image on a webpage to translate its embedded text.
- **Image File Translation:** Upload an image file from your computer to translate it.
- **Specialized Manga Translation:** Automatically detects and translates speech bubbles in comics, allowing you to move and resize the translated text overlays.
</details>

<details>
<summary><b>🎵 Media & File Translation (Up to 2GB)</b></summary>

- **Audio/Video File Translation:** Upload media files (MP3, MP4, WAV, WEBM...) to get transcripts and translations.
- **Large File Support (Gemini API):** Translate documents and media files up to 2GB.
- **Direct URL Translation (Gemini):** Paste a file link to translate without downloading.
- **Document Translation:** Supports PDF, HTML, SRT, VTT, JSON, MD, and more.
</details>

<details>
<summary><b>⚙️ Comprehensive Customization</b></summary>

- **Custom Prompts:** Full control to modify the prompts sent to the AI for each translation task.
- **Interface:** Light/Dark mode, customizable font size, and popup width.
- **Display Modes:** Choose between "Translation Only," "Parallel (Bilingual)," and "Language Learning" (Original + Phonetics + Translation).
- **Hotkeys & Gestures:** Set up custom keyboard shortcuts and touch gestures for mobile devices.
- **Cache Management:** Enable/disable and customize caching to speed up subsequent translations.
- **Backup & Restore:** Easily export/import all your settings with an encrypted file.
</details>

## 📸 Screenshots

<details>
<summary><b>📱 Mobile Interface</b></summary>
<div style="display: flex; flex-wrap: wrap; justify-content: space-around;">
  <img src="https://i.imgur.com/7pi9USr.jpeg" width="45%" alt="Mobile 1" />
  <img src="https://i.imgur.com/3ksRC8R.jpeg" width="45%" alt="Mobile 2" />
  <img src="https://i.imgur.com/Wu5jXLv.jpeg" width="45%" alt="Mobile 3" />
  <img src="https://i.imgur.com/Bcy8QIu.jpeg" width="45%" alt="Mobile 4" />
</div>
</details>

<details>
<summary><b>💻 Desktop Interface</b></summary>
<div style="display: flex; flex-wrap: wrap; justify-content: space-around;">
  <img src="https://i.imgur.com/tZ5NqOG.jpeg" width="45%" alt="PC 1" />
  <img src="https://i.imgur.com/esxZv9N.jpeg" width="45%" alt="PC 2" />
  <img src="https://i.imgur.com/4tTFvZW.jpeg" width="45%" alt="PC 3" />
  <img src="https://i.imgur.com/gIExWnd.jpeg" width="45%" alt="PC 4" />
</div>
</details>

## 🔧 Installation Guide

### Step 1: Install a Userscript Manager
You need a userscript manager. **Violentmonkey** is highly recommended.

- **Firefox:** Install [Violentmonkey](https://addons.mozilla.org/en-US/firefox/addon/violentmonkey/) or [Tampermonkey](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/).
- **Chrome:** Install [Violentmonkey](https://chromewebstore.google.com/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag) or [Tampermonkey](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo).
- **Safari:** Use the [Tampermonkey](https://www.tampermonkey.net/index.php?browser=safari) or [Userscripts](https://apps.apple.com/us/app/userscripts/id1463298887) app.

### Step 2: Install the King Translator AI Script

<p align="center">
  <i>Install the latest version from GitHub:</i>
  <br><br>
  <a href="https://raw.githubusercontent.com/king1x32/compiledUserscripts/release/release/KingTranslatorAI.user.js" style="text-decoration:none;">
    <img src="https://img.shields.io/badge/Compressed_Version-Fast_&_Light-blueviolet?style=for-the-badge&logo=github" alt="GitHub Compressed Version">
  </a>
     
  <a href="https://raw.githubusercontent.com/king1x32/King-Translator-AI/refs/heads/main/King-Translator-AI.user.js" style="text-decoration:none;">
    <img src="https://img.shields.io/badge/Normal_Version-Source_Code-blue?style=for-the-badge&logo=github" alt="GitHub Normal Version">
  </a>
</p>

<p align="center">
  <i>Install the latest version from GreasyFork:</i>
  <br><br>
  <a href="https://greasyfork.org/en/scripts/529348-king-translator-ai" style="text-decoration:none;">
    <img src="https://img.shields.io/badge/GreasyFork-Source_Code-bluegray?style=for-the-badge" alt="Greasy Fork">
  </a>
</p>

### Step 3: Get & Configure API Keys
1. **Get API Keys:**
   - **Gemini (Recommended):** Go to [Google AI Studio](https://makersuite.google.com/app/apikey) -> `Create API Key`.
   - For other providers, visit their respective websites to obtain an API key (Claude, OpenAI, Perplexity, Mistral).
2. **Configure the Script:**
   - Open the script settings:
      - Hotkey `Alt + S` (Windows, Linux, Android)
      - Hotkey `Cmd + S` (IOS, IpadOS, MacOS)
      - Via the Violentmonkey menu.
   - In the `API PROVIDER` section, select your desired provider.
   - Paste your API key(s) into the corresponding field. **Note:** For smooth page and live-caption translation, it is recommended to add multiple keys (3-5 keys) to avoid rate limits.
   - Click **Save**.

## 📚 Usage Guide

<details>
<summary><b>📝 Translating Selected Text</b></summary>

1. Highlight any text with your mouse.
2. A small translation button will appear.
3. **Interact with the button:**
   - **Single Click:** Popup translation (default).
   - **Double Click:** Quick translation (displays inline).
   - **Click and Hold:** Advanced translation (deeper analysis).
   (These actions are customizable in the settings)
</details>

<details>
<summary><b>✍️ Input Field Translation</b></summary>

- Automatically displays a compact translation tool inside active input fields (chat boxes, comment sections, etc.).
- Quickly translate the content you're writing to the target language (via the 🌐 button) or back to the source language (via the 🔄 button).
- Use the `Alt + T` hotkey for instant translation.
- **(New in v5.0)** The tool's position is now draggable and its location is saved per website.
</details>

<details>
<summary><b>🖼️ Translating Images & Manga</b></summary>

- **Translate Screen Region:**
  1. Open the Tools Menu (⚙️ icon in the bottom-right corner) -> `OCR Region Trans`.
  2. Drag your mouse to select the area of the screen you want to translate.
- **Translate Web Images:**
  1. Open the Tools Menu -> `Web Image Trans`.
  2. Hover over images; a blue border will highlight the selectable image.
  3. Click the image to translate its content.
- **Translate Manga:**
  1. Open the Tools Menu -> `Manga Web Trans`.
  2. Click on a comic/manga panel.
  3. The script will automatically detect and translate speech bubbles with interactive overlays:
     - **Move & Resize:** Drag the overlays to your desired position or resize them for better visibility.
     - **Reset Position:** Double-click any customized overlay to instantly reset it to its original position.
     - **Adjust Opacity:** Hover your cursor over a text bubble, hold `Ctrl`, and `roll the mouse wheel` to change the background's transparency.
</details>

<details>
<summary><b>🎵 Translating YouTube Live-Captions</b></summary>

1. Open a YouTube video that has subtitles.
2. A translation button with the script's logo will appear on the video control bar.
3. Click this button to toggle real-time subtitle translation.
</details>

<details>
<summary><b>📂 Translating Files</b></summary>

- **Standard File Translation (Processes locally):**
  1. Open the Tools Menu -> `File Translate`.
  2. Select a file from your computer.
  3. The translated file will be downloaded automatically.
  - **Supported Formats:** `PDF`, `HTML`, `SRT`, `VTT`, `JSON`, `MD` (Markdown), `TXT`.

- **VIP File Translation (via API - Gemini Recommended):**
  1. Open the Tools Menu -> `Translate VIP`.
  2. Choose to upload a file or paste a file URL.
  3. The translation is displayed in a popup. This method supports files up to 2GB.
  - **Supported Document Formats:** `PDF`, `DOCX`, `PPTX`, `XLSX`, `CSV`, and more.
  - **Supported Media Formats:** All common image (`JPG`, `PNG`, `WEBP`), audio (`MP3`, `WAV`, `M4A`), and video (`MP4`, `WEBM`, `MOV`) formats.
</details>

## ⌨️ Hotkeys & Gestures

| Action | Hotkey (Windows/Linux) | Hotkey (macOS) | Gesture (Mobile) |
|---|---|---|---|
| **Open Settings** | `Alt` + `S` | `Cmd` + `S` | 4-finger tap |
| **Translate Full Page** | `Alt` + `F` | `Cmd` + `F` | - |
| **Quick Translate** (selected) | `Alt` + `Q` | `Cmd` + `Q` | - |
| **Popup Translate** (selected) | `Alt` + `E` | `Cmd` + `E` | 2-finger tap |
| **Advanced Translate** (selected)| `Alt` + `A` | `Cmd` + `A` | 3-finger tap |
| **Translate in Input Field** | `Alt` + `T` | `Cmd` + `T` | - |
| **Toggle Translator Tools** | - | - | 5-finger tap |

## 🤝 Support & Contribution

- **Bug Reports & Feature Requests:** Please open an [Issue on GitHub](https://github.com/king1x32/King-Translator-AI/issues).
- **Discussion & Support:** Join our community [Discord Server](https://discord.gg/8DTwr8QpsM).
- **Code Contributions:** Feel free to fork the project and create a Pull Request. All contributions are welcome!

### ❤️ Support the Developer
If you find this script useful, please consider supporting my work with a donation. It helps me dedicate more time to development and updates.

- **Patreon:** [patreon.com/king1x32](https://www.patreon.com/c/king1x32/membership)
- **Donation Page:** [kingsmanvn.pages.dev](https://kingsmanvn.pages.dev/)

## 📄 License
This project is licensed under the GNU General Public License v3.0. See the `LICENSE` file for details.

---

<div align="center">
  Made with ❤️ by King1x32
  <br>
  <a href="https://facebook.com/king1x32">Facebook</a> •
  <a href="https://t.me/king1x32">Telegram</a>
</div>
