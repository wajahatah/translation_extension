# Quran Inline Translator — Simple Setup Guide

This guide is written for anyone, no technical knowledge required.

---

## What Does This Extension Do?

This is a **Google Chrome extension**. Once installed, it lets you:

- **Select any Arabic / Quranic text** on any webpage and instantly see its Urdu or English translation in a small popup.
- If the text is from the Quran, it also shows **which Surah and Ayah** it came from.
- **Open Arabic PDF files** directly in Chrome and translate text inside them the same way.
- **Read text from images** (optional feature — covered at the end).

---

## What You Need

- A computer running **Windows, Mac, or Linux**
- **Google Chrome** browser installed  
  → Download it free from: [google.com/chrome](https://www.google.com/chrome)
- The extension folder (the folder you already have, or received)

That's it. No accounts, no sign-up, no payment needed for basic use.

---

## Step 1 — Download the Extension Files

1. Open Google Chrome and go to this link:
   [https://github.com/wajahatah/translation_extension](https://github.com/wajahatah/translation_extension)

2. You will see a page with some files listed. Look for the green button that says **"Code"** — click it.

3. A small menu drops down. Click **"Download ZIP"** at the bottom of that menu.

4. A file named **`translation_extension-main.zip`** will be saved to your **Downloads** folder.

5. Go to your Downloads folder, **right-click** the ZIP file, and choose:
   - **Windows:** "Extract All…" → click Extract
   - **Mac:** just double-click it

6. You will now have a folder called **`translation_extension-main`**. Remember where it is — you will need it in the next step.

> **Note:** Do not rename or move any files inside the folder. The extension needs all files to be exactly where they are.

---

## Step 2 — Open Chrome Extensions Page

1. Open **Google Chrome**
2. In the address bar at the top, type exactly:
   ```
   chrome://extensions
   ```
   and press **Enter**

You will see a page that lists all your installed extensions.

---

## Step 3 — Turn On Developer Mode

On the **Extensions page**, look at the **top-right corner** of the screen.

You will see a toggle switch labelled **"Developer mode"**.

Click it to turn it **ON** (it should turn blue).

---

## Step 4 — Load the Extension

1. Click the button that says **"Load unpacked"** (it appears after you turn on Developer mode, usually top-left)
2. A file picker window will open
3. Navigate to the folder you extracted in Step 1 (`translation_extension-main`) and **select that folder** (single-click it, then click "Select Folder")
4. The extension will appear in your list with the name **"Quran Inline Translator"**

---

## Step 5 — Pin the Extension to Your Toolbar (Recommended)

1. Look for the **puzzle piece icon** in the top-right corner of Chrome
2. Click it — a list of your extensions appears
3. Find **"Quran Inline Translator"** and click the **pin icon** next to it

You will now see a small icon in your Chrome toolbar for quick access.

---

## How to Use It

### Translating Text on a Webpage

1. Go to any webpage that has Arabic text (for example, an Islamic website)
2. Use your mouse to **click and drag** to highlight the Arabic text you want to translate
3. **Release the mouse button**
4. A small popup will appear near the text showing:
   - The **word/sentence translation** in Urdu (or English)
   - If it is a Quranic ayah: the **Surah name and Ayah number** plus the full translation
5. Click the **× button** on the popup to close it, or just click anywhere else on the page

### Translating Text in a PDF File

1. Open a `.pdf` file in Chrome (drag it into Chrome, or open it via File → Open)
2. The extension automatically loads the PDF in its own viewer
3. Highlight Arabic text the same way as above — the translation popup will appear

---

## Changing the Translation Language

By default, translations are shown in **Urdu (Jalandhri)**. To switch to English or another translator:

1. Click the **extension icon** in your Chrome toolbar
2. A small settings panel opens
3. Use the **dropdown menu** to pick your preferred translator:
   - Urdu options: Jalandhry, Junagarhi, Maududi
   - English options: Sahih International, Muhammad Asad
4. The change saves automatically — no button to press

---

## Reading Arabic Text from Images (Optional)

Sometimes Arabic text is inside a photo or scanned image. The extension can read and translate that too.

There are **three options** — pick whichever suits you:

| Option | Requires | Internet needed? | Accuracy |
|---|---|---|---|
| OCR.space | Free account | Yes | Good |
| Tesseract (local) | Node.js installed | No | Good |
| EasyOCR (local) | Python installed | No (after first run) | Best |

---

### Option A — OCR.space (Easiest, No Installation)

1. Go to [ocr.space/ocrapi](https://ocr.space/ocrapi) in your browser
2. Sign up for a **free account** (25,000 image reads per month at no cost)
3. You will receive an **API key** — a random string like `K81234ABCDEF`
4. Click the **extension icon** in Chrome
5. Paste your API key into the box labelled **"OCR.space API Key"**
6. Done — no further setup needed

---

### Option B — Tesseract (Runs on Your Computer, No Internet)

This option runs fully offline. You need to install **Node.js** once, then start the server each time you want to use OCR.

#### Part 1 — Install Node.js (one time only)

1. Go to [nodejs.org](https://nodejs.org)
2. Click the big green button that says **"LTS"** (recommended version)
3. Run the downloaded installer and click **Next** through all the steps — the defaults are fine
4. When it finishes, close the installer

#### Part 2 — Open the Command Prompt and go to the extension folder

**On Windows:**
1. Press the **Windows key + R** on your keyboard
2. Type `cmd` and press **Enter** — a black window (Command Prompt) opens
3. Type the following and press **Enter** (replace the path with wherever you extracted the folder in Step 1):
   ```
   cd C:\Users\YourName\Downloads\translation_extension-main
   ```
   > **Tip:** You can drag the folder from File Explorer into the Command Prompt window instead of typing the path — it fills it in automatically.

**On Mac:**
1. Press **Command + Space**, type `Terminal`, press **Enter**
2. Type `cd ` (with a space), then drag the `translation_extension-main` folder into the Terminal window, then press **Enter**

#### Part 3 — Start the OCR server

In the same Command Prompt / Terminal window, type:
```
node ocr-server.js
```
and press **Enter**.

You should see the message:
```
OCR server running at http://localhost:5001
Keep this window open while using the Quran Translator extension.
```

**Keep this window open** as long as you want to use OCR. Closing it stops the server.

> Next time you want to use OCR, just repeat Part 2 and Part 3 — Node.js installation only needs to be done once.

---

### Option C — EasyOCR (Best Accuracy, Runs on Your Computer)

This option gives the most accurate results for Arabic. It downloads an AI model (~200 MB) the first time, then works completely offline.

#### Part 1 — Install Python (one time only)

1. Go to [python.org/downloads](https://www.python.org/downloads)
2. Click the yellow **"Download Python"** button (latest version)
3. Run the installer
4. **Important:** On the first screen of the installer, tick the box that says **"Add Python to PATH"** before clicking Install
5. Click **Install Now** and wait for it to finish

#### Part 2 — Install the required packages (one time only)

1. Open Command Prompt (Windows: Windows key + R → type `cmd` → Enter) or Terminal (Mac)
2. Type the following and press **Enter**:
   ```
   pip install flask flask-cors easyocr Pillow
   ```
3. Wait for it to finish — it may take a few minutes as it downloads files

#### Part 3 — Go to the extension folder

In the same Command Prompt / Terminal window, navigate to the folder (same as Option B Part 2):
```
cd C:\Users\YourName\Downloads\translation_extension-main
```

#### Part 4 — Start the OCR server

Type the following and press **Enter**:
```
python ocr-server-easyocr.py
```

The **first time** you run this, it will download the Arabic AI model (~200 MB). You will see download progress in the window. This only happens once.

When ready, you will see:
```
EasyOCR server running at http://localhost:5002
Keep this window open while using the Quran Translator extension.
```

**Keep this window open** as long as you want to use OCR.

> Next time, just repeat Part 3 and Part 4 — installation only needs to be done once.

---

## Troubleshooting

| Problem | What to do |
|---|---|
| No popup appears when I select text | Make sure the extension is enabled on the Extensions page. Refresh the webpage and try again. |
| Popup shows "ترجمہ دستیاب نہیں۔" (Translation not available) | The selected text may not be Arabic or Quranic. Try selecting a different portion. |
| Extension disappeared from toolbar | Click the puzzle piece icon and pin it again (Step 5 above). |
| PDF does not open in the extension viewer | Make sure you are opening the PDF directly in Chrome, not in another program. |
| OCR.space is not working | Check that you pasted the API key correctly in the extension settings — no extra spaces. |
| Local OCR server not working | Make sure the Command Prompt / Terminal window is still open and shows the "running" message. If you closed it, start the server again. |
| "pip is not recognized" error | Python was not added to PATH during installation. Re-run the Python installer and tick the "Add Python to PATH" box. |
| "node is not recognized" error | Node.js was not installed correctly. Re-download and re-run the Node.js installer from nodejs.org. |

---

## Frequently Asked Questions

**Do I need the internet for translations?**
Yes. The translation works by contacting free online services. An internet connection is required.

**Does it cost anything?**
No. The extension itself is free. The translation and Quran APIs it uses are also free. OCR.space has a free tier that covers normal use.

**Will it work in Microsoft Edge or Firefox?**
The steps above are for Google Chrome. Edge (which is also Chromium-based) works the same way — follow the same steps. Firefox is not supported.

**Is my text sent to any server?**
The selected text is sent to [AlQuran Cloud API](https://alquran.cloud) (for Quran matching) and [MyMemory](https://mymemory.translated.net) (for general translation). No personal information is collected.

---

*For any issues, contact the person who gave you this extension.*
