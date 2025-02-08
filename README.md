## Fire \Min
🔥 Fire Min – The Fun & Merry Browser That Puts You First! 🎉

Designed for a smooth, distraction-free experience, Fire Min is packed with powerful features:

✨ Full-Text Search – Instantly find any page you’ve visited!
🛡️ Ad & Tracker Blocking – Browse freely without interruptions!
📖 Automatic Reader View – Focus on what matters most!
🗂️ Tasks (Tab Groups) – Organize like a pro with effortless tab management!
🏷️ Bookmark Tagging – Find saved pages in a snap!
🔐 Password Manager Integration – Secure, seamless logins every time!
🌙 Dark Theme – Browse in style, day or night!

🚀 Fast, fun, and fiercely private – Fire Min is your ultimate browsing companion! 🔥## Note Fire Min is designed for Windows First 

<img alt="The search bar, showing information from DuckDuckGo" src="http://minbrowser.org/tour/img/searchbar_duckduckgo_answers.png" width="650"/>

<img alt="The Tasks Overlay" src="http://minbrowser.org/tour/img/tasks.png" width="650"/>

<img alt="Reader View" src="https://user-images.githubusercontent.com/10314059/53312382-67ca7d80-387a-11e9-9ccc-88ac592c9b1c.png" width="650"/>

## 🌟 **Installing Fire Min**  

Getting Fire Min is easy! Grab the prebuilt binaries [here](https://github.com/minbrowser/min/releases), or if you're feeling adventurous, scroll down to learn how to build it from source!  

### 🔧 **Linux Installation**  

💾 **.deb File:** `sudo dpkg -i /path/to/download`  
📦 **RPM Build:** `sudo rpm -i /path/to/download --ignoreos`  
🖥️ **Arch Linux:** Install via [AUR](https://aur.archlinux.org/packages/min-browser-bin)  
🍓 **Raspberry Pi:** Install from [Pi-Apps](https://github.com/Botspot/pi-apps)  

---

## 🚀 **Getting Started with Fire Min**  

Explore Fire Min’s powerful features with our **[wiki](https://github.com/minbrowser/min/wiki)**! 📚  

✨ Learn all the **keyboard shortcuts** to browse like a pro.  
💡 Check out **frequently asked questions** [here](https://github.com/minbrowser/min/wiki/FAQ).  
🛠️ Customize your experience with **userscripts**—find guides and community scripts in the [userscript documentation](https://github.com/minbrowser/min/wiki/userscripts).  
💬 Have questions or want to geek out with fellow users? **Join our [Discord server](https://discord.gg/bRpqjJ4)!**  

---

## 🛠 **For Developers: Hacking Fire Min**  

Want to make Fire Min even better? Here's how to get started:  

1️⃣ Install [Node.js](https://nodejs.org)  
2️⃣ Run `npm install` to grab dependencies  
3️⃣ Start Fire Min in **development mode** with `npm run start`  
4️⃣ Made some changes? Refresh instantly with `alt+ctrl+r` (or `opt+cmd+r` on Mac)!  

### 🏗 **Building Fire Min from Source**  

Once installed, use these magic spells (a.k.a. commands) to build Fire Min for your platform:  

🪟 **Windows:** `npm run buildWindows`  
🍏 **Mac (Intel):** `npm run buildMacIntel`  
🍎 **Mac (M1/M2+):** `npm run buildMacArm`  
🐧 **Debian:** `npm run buildDebian`  
🍓 **Raspberry Pi (32-bit):** `npm run buildRaspi`  
🤖 **Linux (ARM 64-bit):** `npm run buildLinuxArm64`  
🎩 **Red Hat:** `npm run buildRedhat`  

⚠️ **Platform-Specific Requirements:**  
- **Mac:** Install Xcode & command-line tools. Set SDK to macOS 11.0+ (`export SDKROOT=...`).  
- **Windows:** Install Visual Studio & configure it with `npm config set msvs_version 2019`.  

---

## 🤝 **Contributing to Fire Min**  

We 💖 our contributors! If you have a great idea, found a bug, or just want to help out, here’s how you can contribute:  

### 🐞 **Found a Bug or Have a Feature Request?**  
Report it by opening a **[new issue](https://github.com/minbrowser/min/issues/new/choose)!**  

### 💻 **Writing Code**  
- Follow the **[development instructions](#developing)** above.  
- Check out the **[architecture guide](https://github.com/minbrowser/min/wiki/Architecture)**.  
- Stick to the **[Standard](https://github.com/feross/standard) coding style** (your editor likely has a plugin for auto-formatting!).  

### 🌍 **Helping with Translations**  

#### **Adding a New Language**  
1️⃣ Find your **language code** [here](https://source.chromium.org/chromium/chromium/src/+/main:ui/base/l10n/l10n_util.cc;l=55).  
2️⃣ Create a new file in `localization/languages` named `[your language code].json`.  
3️⃣ Copy everything from [en-US.json](https://github.com/minbrowser/min/blob/master/localization/languages/en-US.json).  
4️⃣ Replace all English text with your translation.  
5️⃣ Fire Min will automatically use your language if your system matches it!  

#### **Updating an Existing Language**  
- Open your language file in `localization/languages`.  
- Look for `"null"` values or `"missing translation"` comments.  
- Translate the corresponding English text from `en-US.json`.  
- Submit a **pull request** with your updates!  

---

🎉 **Welcome to the Fire Min Community!** Whether you're here to browse, develop, or contribute, we’re excited to have you on board! **Let’s build the future of private, fun, and merry browsing—together!** 🔥🚀