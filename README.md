# Project Information

This document presents **ScentsAndPA**, the mobile application and hardware‐in‐the‐loop system developed as the core deliverable of the author’s graduate thesis. The ScentsAndPA project **constitutes** the thesis: it rigorously examines the influence of precisely synchronized olfactory stimuli on exercise performance, physiological response, and user experience.

**Research Objectives:**

- Quantify the effect of controlled scent delivery on muscle contraction strength and heart‐rate recovery.
- Provide a turnkey platform for real‐time biofeedback acquisition (MAX30102 heart‐rate, FSR pressure, device IMU).
- Enable fully customizable exercise sessions with integrated scent protocols.
- Supply a comprehensive analysis toolkit for paired‐data statistics, effect‐size estimation, and reproducibility.

**System Architecture & Components:**

| Layer                   | Technology / Hardware                          |
|-------------------------|------------------------------------------------|
| **Mobile Application**  | React Native & Expo (TypeScript)               |
| **Backend & Database**  | Node.js, Express, MongoDB (Mongoose)           |
| **BLE Microcontrollers**| ESP32 (Arduino IDE sketches)                   |
| **Sensors**             | MAX30102 (heart rate), FSR (pressure), IMU     |
| **Scent Delivery Unit** | OWidgets programmable olfactometer             |

---

## User Manual

1. **Download & Install APK**  
   Obtain the latest `.apk` from [here](https://drive.google.com/file/d/1XjzZfPCCDvxQ0wmsWfh0WzEw0pDuMxwu/view?usp=sharing).
   _Note: Android 11 or later is required. iOS binaries require an Xcode license and are built separately._

2. **Install Expo CLI**  

   ```bash
   npm install --global expo-cli

3. **Clone Repository & Install Dependencies**  

     ```bash
   git clone https://github.com/your-org/ScentsAndPA.git

cd ScentsAndPA
npm install

3. **Configure Backend Connection**  

     ```bash
   # Edit the configuration file
   code app/config.ts

In config.ts, set the backEndUrl constant to the IP address of the server machine (obtain via ipconfig on Windows or ifconfig on macOS/Linux).

4. **Launch Backend Server**

   ```bash
      cd backend
      node server.js

The API will listen on port 3000 by default.

5. **Start the app**

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

To use the application with all the intended functionalities use the development build.

5. **Hardware Setup**

- Connect **ESP32 #1** to the **MAX30102** sensor via I²C for heart-rate measurement.  
- Connect **ESP32 #2** to the **FSR** sensor via analog input for muscle-pressure measurement.  
- Power each ESP32 from a USB power source.  
- Position the scent-delivery unit approximately 1 m from the user’s face and select the desired scent channel in the application.  

6. **Operating Procedure**

- Log in or register using the **Profile** screen.  
- Pair both ESP32 modules and the scent-delivery unit via BLE.  
- Enter baseline heart rate and maximum contraction pressure in **Profile**.  
- In **Exercises**, select “Bicep Curls” (or define a custom exercise), then choose a scent protocol.  
- Tap **Start** → 5 s countdown → haptic cue → commence exercise.  
  - Scents are delivered in 5 s pulses every 10 s.  
  - A 4 min post-exercise recording captures recovery metrics.  
- Tap **Stop** to save the session and review real-time charts.  

## Analysis

   The Analysis files are found under the analysis directory.

 Key performance metrics from exercise recordings and user baseline data extraction:

- **Normalised Maximum Muscle Contraction:** For each repetition, the maximum pressure is normalized to the user’s baseline pressure (from the users file) and then averaged.
- **Average Time Under Tension (TUT):** The average contraction duration per repetition.
- **Heart Rate Recovery:** Difference between the average heart rate during exercise and after exercise.

This analysis compares paired measurements for the same individuals under different scents and control conditions using a suite of methods and visualizations that include:

- **Paired Data Visualisation:** Paired line plots, density plots of differences, and Bland–Altman plots.
- **Statistical Testing:** Paired t–test, Wilcoxon signed–rank test, effect size (Cohen’s d), and bootstrap confidence intervals.
- **Multivariate Analysis:** MANOVA on the vector of differences across performance metrics.
