import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const LanguageContext = createContext(null);

const translations = {
  en: {
    common: {
      dashboard: "Dashboard",
      settings: "Settings",
      logout: "Logout",
      searchPlaceholder: "Search homework, exams, announcements...",
      changePassword: "Change Password",
      fingerprint: "Enable Fingerprint Login",
      appLanguage: "App Language",
      preferences: "Preferences",
      supportInfo: "Support & Information",
      studentPortal: "Student Portal",
      teacherPortal: "Teacher Portal",
      adminConsole: "Admin Console",
      platformTagline: "The complete digital platform for modern schools",
      welcome: "Welcome back",
      guest: "Guest",
      back: "Go Back",
    },
    nav: {
      dashboard: "Dashboard",
      marks: "Marks",
      attendance: "Attendance",
      analytics: "Analytics",
      exam: "Exam Timetable",
      homework: "Homework",
      events: "Events",
      profile: "Profile",
      announcements: "Announcements",
      voice: "Voice",
      timetable: "Timetable",
      studentLogin: "Student Login",
      teacherLogin: "Teacher Login",
      adminLogin: "Admin Login",
    },
    landing: {
      tagline: "The complete digital platform for modern schools",
      studentButton: "Student Portal",
      teacherButton: "Teacher Portal",
      adminButton: "Admin Console",
      footer: "School Management Suite",
    },
  },
  hi: {
    common: {
      dashboard: "डैशबोर्ड",
      settings: "सेटिंग्स",
      logout: "लॉगआउट",
      searchPlaceholder: "होमवर्क, परीक्षा, घोषणाएँ खोजें...",
      changePassword: "पासवर्ड बदलें",
      fingerprint: "फिंगरप्रिंट लॉगिन सक्षम करें",
      appLanguage: "ऐप भाषा",
      preferences: "पसंद",
      supportInfo: "सहायता और जानकारी",
      studentPortal: "विद्यार्थी पोर्टल",
      teacherPortal: "शिक्षक पोर्टल",
      adminConsole: "एडमिन कंसोल",
      platformTagline: "आधुनिक स्कूलों के लिए संपूर्ण डिजिटल प्लेटफ़ॉर्म",
      welcome: "वापसी पर स्वागत है",
      guest: "अतिथि",
      back: "वापस जाएँ",
    },
    nav: {
      dashboard: "डैशबोर्ड",
      marks: "अंक",
      attendance: "उपस्थिति",
      analytics: "एनालिटिक्स",
      exam: "परीक्षा समय सारणी",
      homework: "होमवर्क",
      events: "कार्यक्रम",
      profile: "प्रोफ़ाइल",
      announcements: "घोषणाएँ",
      voice: "वॉयस",
      timetable: "समय सारणी",
      studentLogin: "विद्यार्थी लॉगिन",
      teacherLogin: "शिक्षक लॉगिन",
      adminLogin: "एडमिन लॉगिन",
    },
    landing: {
      tagline: "आधुनिक स्कूलों के लिए संपूर्ण डिजिटल प्लेटफ़ॉर्म",
      studentButton: "विद्यार्थी पोर्टल",
      teacherButton: "शिक्षक पोर्टल",
      adminButton: "एडमिन कंसोल",
      footer: "स्कूल प्रबंधन सूट",
    },
  },
  kn: {
    common: {
      dashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
      settings: "ಸೆಟ್ಟಿಂಗ್ಸ್",
      logout: "ಲಾಗ್ ಔಟ್",
      searchPlaceholder: "ಹೋಂವರ್ಕ್, ಪರೀಕ್ಷೆಗಳು, ಪ್ರಕಟಣೆಗಳನ್ನು ಹುಡುಕಿ...",
      changePassword: "ಪಾಸ್ವರ್ಡ್ ಬದಲಿಸಿ",
      fingerprint: "ಫಿಂಗರ್ಪ್ರಿಂಟ್ ಲಾಗಿನ್ ಸಕ್ರಿಯಗೊಳಿಸಿ",
      appLanguage: "ಆಪ್ ಭಾಷೆ",
      preferences: "ಆಸಕ್ತಿಗಳು",
      supportInfo: "ಸಹಾಯ ಮತ್ತು ಮಾಹಿತಿ",
      studentPortal: "ವಿದ್ಯಾರ್ಥಿ ಪೋರ್ಟಲ್",
      teacherPortal: "ಶಿಕ್ಷಕ ಪೋರ್ಟಲ್",
      adminConsole: "ಅಡ್ಮಿನ್ ಕನ್‌ಸೋಲ್",
      platformTagline: "ಆಧುನಿಕ ಶಾಲೆಗಳಿಗಾಗಿ ಸಂಪೂರ್ಣ ಡಿಜಿಟಲ್ ವೇದಿಕೆ",
      welcome: "ಮತ್ತೆ ಸ್ವಾಗತ",
      guest: "ಅತಿಥಿ",
      back: "ಹಿಂದೆಗೆ",
    },
    nav: {
      dashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
      marks: "ಅಂಕಗಳು",
      attendance: "ಹಾಜರಾತಿ",
      analytics: "ವಿಶ್ಲೇಷಣೆ",
      exam: "ಪರೀಕ್ಷಾ ವೇಳಾಪಟ್ಟಿ",
      homework: "ಗೃಹಕಾರ್ಯ",
      events: "ಕಾರ್ಯಕ್ರಮಗಳು",
      profile: "ಪ್ರೊಫೈಲ್",
      announcements: "ಪ್ರಕಟನೆಗಳು",
      voice: "ಧ್ವನಿ",
      timetable: "ಪಾಠ ವೇಳಾಪಟ್ಟಿ",
      studentLogin: "ವಿದ್ಯಾರ್ಥಿ ಲಾಗಿನ್",
      teacherLogin: "ಶಿಕ್ಷಕ ಲಾಗಿನ್",
      adminLogin: "ಅಡ್ಮಿನ್ ಲಾಗಿನ್",
    },
    landing: {
      tagline: "ಆಧುನಿಕ ಶಾಲೆಗಳಿಗಾಗಿ ಸಂಪೂರ್ಣ ಡಿಜಿಟಲ್ ವೇದಿಕೆ",
      studentButton: "ವಿದ್ಯಾರ್ಥಿ ಪೋರ್ಟಲ್",
      teacherButton: "ಶಿಕ್ಷಕ ಪೋರ್ಟಲ್",
      adminButton: "ಅಡ್ಮಿನ್ ಕನ್‌ಸೋಲ್",
      footer: "ಶಾಲಾ ನಿರ್ವಹಣಾ ಸ್ಯೂಟ್",
    },
  },
  te: {
    common: {
      dashboard: "డ్యాష్‌బోర్డ్",
      settings: "సెట్టింగులు",
      logout: "లాగ్ అవుట్",
      searchPlaceholder: "హోంవర్క్, పరీక్షలు, ప్రకటనలు వెతకండి...",
      changePassword: "పాస్‌వర్డ్ మార్చండి",
      fingerprint: "ఫింగర్‌ప్రింట్ లాగిన్‌ను ప్రారంభించండి",
      appLanguage: "యాప్ భాష",
      preferences: "ఆసక్తులు",
      supportInfo: "సహాయం & సమాచారం",
      studentPortal: "విద్యార్థి పోర్టల్",
      teacherPortal: "అధ్యాపక పోర్టల్",
      adminConsole: "అడ్మిన్ కన్సోల్",
      platformTagline: "ఆధునిక పాఠశాలల కోసం సంపూర్ణ డిజిటల్ ప్లాట్‌ఫారం",
      welcome: "తిరిగి స్వాగతం",
      guest: "అతిథి",
      back: "వెనక్కి వెళ్ళు",
    },
    nav: {
      dashboard: "డ్యాష్‌బోర్డ్",
      marks: "మార్కులు",
      attendance: "హాజరు",
      analytics: "అనలిటిక్స్",
      exam: "పరీక్షా సమయపట్టిక",
      homework: "హోంవర్క్",
      events: "ఈవెంట్లు",
      profile: "ప్రొఫైల్",
      announcements: "ప్రకటనలు",
      voice: "వాయిస్",
      timetable: "టైం టేబుల్",
      studentLogin: "విద్యార్థి లాగిన్",
      teacherLogin: "అధ్యాపక లాగిన్",
      adminLogin: "అడ్మిన్ లాగిన్",
    },
    landing: {
      tagline: "ఆధునిక పాఠశాలల కోసం సంపూర్ణ డిజిటల్ ప్లాట్‌ఫారం",
      studentButton: "విద్యార్థి పోర్టల్",
      teacherButton: "అధ్యాపక పోర్టల్",
      adminButton: "అడ్మిన్ కన్సోల్",
      footer: "పాఠశాల నిర్వహణ సూట్",
    },
  },
};

export function LanguageProvider({ children }) {
  const [language] = useState("en");

  const t = useMemo(
    () => (key, fallback) => {
      const [ns, k] = key.includes(".") ? key.split(".") : ["common", key];
      return translations[language]?.[ns]?.[k] ?? translations.en?.[ns]?.[k] ?? fallback ?? key;
    },
    [language]
  );

  const value = useMemo(() => ({ language, setLanguage: () => {}, t }), [language, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
