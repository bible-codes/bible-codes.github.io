/**
 * Internationalization (i18n) Module
 * Provides Hebrew/English language toggle functionality
 */

// Translation dictionaries
const translations = {
  // Index page
  index: {
    he: {
      // Header & Navigation
      logo: "ניתוח תנ\"ך",
      menuLabel: "תפריט",
      home: "דף הבית",
      elsCodes: "קודי תורה (ELS)",
      textSearch: "חיפוש טקסט",
      gematria: "גימטריה",
      acronyms: "ראשי תיבות",
      tsirufim: "צירופים",
      rootTest: "בדיקת שורשים",
      matrixView: "תצוגת מטריצה",
      bookView: "תצוגת ספר",

      // Hero
      heroTitle: "ניתוח מקיף של התנ״ך העברי",
      heroSubtitle: "כלים מתקדמים לחיפוש, ניתוח וחקר התורה",
      heroLegend: "פעיל | חדש | מתוכנן",

      // Status labels
      statusActive: "פעיל",
      statusNew: "חדש!",
      statusPlanned: "מתוכנן",

      // Tool cards
      elsTitle: "קודי תורה (ELS)",
      elsDesc: "חיפוש רצפים שווי-מרחק (ELS) עם ניתוח skip-distance דינמי על פני הטקסט המלא.",

      textSearchTitle: "חיפוש טקסט",
      textSearchDesc: "חיפוש מתקדם עם התאמת תבניות, סינון אותיות ראשונות/אחרונות, וניווט פסוק אחר פסוק.",

      gematriaTitle: "גימטריה",
      gematriaDesc: "חישוב גימטריה במספר שיטות (רגיל, מצומצם, סידורי). חיפוש פסוקים לפי ערך מספרי.",

      acronymTitle: "ראשי תיבות ונוטריקון",
      acronymDesc: "חילוץ אותיות ראשונות ואחרונות ליצירת ראשי תיבות. ניתוח תבניות נוטריקון מסורתיות.",

      tsirufimTitle: "צירופים סמנטיים",
      tsirufimDesc: "ניתוח פרמוטציות סמנטי מתקדם: גלה כיצד אותיות מצטרפות למשמעויות קשורות. משתמש בלמידת מכונה ואשכולות סמנטיים.",

      rootsTitle: "חילוץ שורשים",
      rootsDesc: "זיהוי שורשים עבריים (שלושיים/רבועיים) ממילים. 56K מילים במילון, זיהוי בניין, ציון ביטחון.",

      matrixView: "תצוגת מטריצה",
      matrixViewDesc: "רשת תווים חזותית עם ממדים מותאמים אישית. חפש דפוסי ELS בתוך תצוגת המטריצה.",

      bookView: "תצוגת ספר",
      bookViewDesc: "קורא בסגנון ספר מסורתי עם ניווט פרק/פסוק. הפעל/בטל ניקוד וטעמים.",

      letterAnalysisTitle: "ניתוח אותיות ומילים",
      letterAnalysisDesc: "מסד נתונים ברמת תו לספירת אותיות, ניתוח תבניות מילים וחקר מבנה הטקסט.",

      cantillationTitle: "מציג טעמים",
      cantillationDesc: "צפייה והשוואה של סימני טעמים, כולל מסורות חלופיות כמו עשרת הדיברות.",

      crossRefTitle: "אינדקס צולב",
      crossRefDesc: "חקור היכן פסוקים מופיעים בתלמוד, מדרש וזוהר. קישורים לספריא ומקורות אחרים.",

      // Features section
      featuresTitle: "תכונות מרכזיות",
      feature1: "100% עיבוד צד-לקוח",
      feature2: "עבודה מלאה במצב לא מקוון",
      feature3: "מסד נתונים ברמת תו",
      feature4: "ביצועים מהירים",
      feature5: "גימטריה מרובת שיטות",
      feature6: "ניתוח מבוסס שורשים",
      feature7: "למידת מכונה סמנטית",
      feature8: "חיפוש מדויק ומהיר",
      feature9: "ממשק מותאם למובייל",
      feature10: "פרטיות מלאה (ללא שרת)",
      feature11: "PWA להתקנה",
      feature12: "ניתוח סטטיסטי",

      // About section
      aboutTitle: "אודות הפרויקט",
      aboutText1: "חבילת ניתוח תנ\"ך עברי מקיפה המספקת כלים מתקדמים ללימוד תורה, מחקר וחקירה. הפרויקט בנוי כולו בטכנולוגיות צד-לקוח, כך שכל העיבוד מתבצע בדפדפן שלך ללא תלות בשרת. האפליקציה משתמשת בארכיטקטורת מסד נתונים ברמת תו המאפשרת הכל החל מחיפושי ELS מסורתיים ועד ניתוח סטטיסטי מתקדם, חישובי גימטריה וחקר מבני של הטקסט המסורתי.",
      aboutText2: "בתור Progressive Web App (PWA), ניתן להתקין את האפליקציה ולהשתמש בה לחלוטין במצב לא מקוון, מה שהופך אותה לאידיאלית ללימוד ומחקר ללא צורך בחיבור לאינטרנט.",
      aboutText3: "חדש! המערכת כוללת כעת מנוע חילוץ שורשים עבריים עם מילון של 56,000+ מילים, וכלי צירופים סמנטיים המשתמש בלמידת מכונה לזיהוי קשרים סמנטיים נסתרים בין מילים.",

      // Footer
      footerCopyright: "חבילת ניתוח התנ\"ך העברי | פרויקט קוד פתוח",
      documentation: "תיעוד",
      contact: "צור קשר",

      // Offline indicator
      offlineMsg: "אתה במצב לא מקוון. חלק מהתכונות עשויות להיות מוגבלות.",

      // Language toggle
      langToggle: "English"
    },
    en: {
      // Header & Navigation
      logo: "Bible Analysis",
      menuLabel: "Menu",
      home: "Home",
      elsCodes: "Torah Codes (ELS)",
      textSearch: "Text Search",
      gematria: "Gematria",
      acronyms: "Acronyms",
      tsirufim: "Tsirufim",
      rootTest: "Root Testing",
      matrixView: "Matrix View",
      bookView: "Book View",

      // Hero
      heroTitle: "Comprehensive Hebrew Bible Analysis",
      heroSubtitle: "Advanced tools for searching, analyzing, and studying the Torah",
      heroLegend: "Active | New | Planned",

      // Status labels
      statusActive: "Active",
      statusNew: "New!",
      statusPlanned: "Planned",

      // Tool cards
      elsTitle: "Torah Codes (ELS)",
      elsDesc: "Equidistant Letter Sequence (ELS) search with dynamic skip-distance analysis across the full text.",

      textSearchTitle: "Text Search",
      textSearchDesc: "Advanced search with pattern matching, first/last letter filtering, and verse-by-verse navigation.",

      gematriaTitle: "Gematria",
      gematriaDesc: "Gematria calculation using multiple methods (standard, reduced, ordinal). Search verses by numeric value.",

      acronymTitle: "Acronyms & Notarikon",
      acronymDesc: "Extract first and last letters to form acronyms. Analysis of traditional Notarikon patterns.",

      tsirufimTitle: "Semantic Permutations",
      tsirufimDesc: "Advanced semantic permutation analysis: discover how letters combine into related meanings. Uses machine learning and semantic clustering.",

      rootsTitle: "Root Extraction",
      rootsDesc: "Identify Hebrew roots (triliteral/quadriliteral) from words. 56K word dictionary, binyan detection, confidence scoring.",

      matrixView: "Matrix View",
      matrixViewDesc: "Visual character grid with configurable dimensions. Search for ELS patterns within the matrix display.",

      bookView: "Book View",
      bookViewDesc: "Traditional book-style reader with chapter/verse navigation. Toggle niqqud and cantillation marks.",

      letterAnalysisTitle: "Letter & Word Analysis",
      letterAnalysisDesc: "Character-level database for letter counting, word pattern analysis, and text structure exploration.",

      cantillationTitle: "Cantillation Viewer",
      cantillationDesc: "View and compare cantillation marks, including alternate traditions like the Ten Commandments.",

      crossRefTitle: "Cross-Reference Index",
      crossRefDesc: "Explore where verses appear in Talmud, Midrash, and Zohar. Links to Sefaria and other sources.",

      // Features section
      featuresTitle: "Key Features",
      feature1: "100% Client-Side Processing",
      feature2: "Full Offline Functionality",
      feature3: "Character-Level Database",
      feature4: "Fast Performance",
      feature5: "Multiple Gematria Methods",
      feature6: "Root-Based Analysis",
      feature7: "Semantic Machine Learning",
      feature8: "Precise & Fast Search",
      feature9: "Mobile-Optimized Interface",
      feature10: "Full Privacy (No Server)",
      feature11: "Installable PWA",
      feature12: "Statistical Analysis",

      // About section
      aboutTitle: "About the Project",
      aboutText1: "A comprehensive Hebrew Bible analysis suite providing advanced tools for Torah study, research, and exploration. The project is built entirely with client-side technologies, so all processing happens in your browser without server dependency. The application uses a character-level database architecture enabling everything from traditional ELS searches to advanced statistical analysis, gematria calculations, and structural exploration of the Masoretic text.",
      aboutText2: "As a Progressive Web App (PWA), the application can be installed and used completely offline, making it ideal for study and research without an internet connection.",
      aboutText3: "New! The system now includes a Hebrew root extraction engine with a 56,000+ word dictionary, and a semantic permutation tool using machine learning to identify hidden semantic connections between words.",

      // Footer
      footerCopyright: "Hebrew Bible Analysis Suite | Open Source Project",
      documentation: "Documentation",
      contact: "Contact",

      // Offline indicator
      offlineMsg: "You are offline. Some features may be limited.",

      // Language toggle
      langToggle: "עברית"
    }
  }
};

// Current language state
let currentLang = localStorage.getItem('preferredLang') || 'he';

/**
 * Get translation for a key
 * @param {string} page - Page name (e.g., 'index')
 * @param {string} key - Translation key
 * @returns {string} Translated text
 */
export function t(page, key) {
  return translations[page]?.[currentLang]?.[key] || key;
}

/**
 * Get current language
 * @returns {string} Current language code ('he' or 'en')
 */
export function getLang() {
  return currentLang;
}

/**
 * Set language and persist preference
 * @param {string} lang - Language code ('he' or 'en')
 */
export function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('preferredLang', lang);

  // Update document direction and lang
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
}

/**
 * Toggle between Hebrew and English
 * @returns {string} New language code
 */
export function toggleLang() {
  const newLang = currentLang === 'he' ? 'en' : 'he';
  setLang(newLang);
  return newLang;
}

/**
 * Initialize i18n on page load
 * Sets up document direction based on stored preference
 */
export function initI18n() {
  // Apply stored language preference
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === 'he' ? 'rtl' : 'ltr';
}

/**
 * Apply translations to elements with data-i18n attribute
 * @param {string} page - Page name for translation lookup
 */
export function applyTranslations(page) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = t(page, key);
    if (translation) {
      el.textContent = translation;
    }
  });

  // Update placeholder attributes
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const translation = t(page, key);
    if (translation) {
      el.placeholder = translation;
    }
  });

  // Update aria-label attributes
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria');
    const translation = t(page, key);
    if (translation) {
      el.setAttribute('aria-label', translation);
    }
  });
}

/**
 * Create language toggle button element
 * @param {Function} onToggle - Callback when language is toggled
 * @returns {HTMLButtonElement} Toggle button element
 */
export function createLangToggle(onToggle) {
  const btn = document.createElement('button');
  btn.className = 'lang-toggle';
  btn.textContent = currentLang === 'he' ? 'EN' : 'עב';
  btn.setAttribute('aria-label', 'Toggle language');
  btn.title = currentLang === 'he' ? 'Switch to English' : 'עבור לעברית';

  btn.addEventListener('click', () => {
    toggleLang();
    btn.textContent = currentLang === 'he' ? 'EN' : 'עב';
    btn.title = currentLang === 'he' ? 'Switch to English' : 'עבור לעברית';
    if (onToggle) onToggle(currentLang);
  });

  return btn;
}

// Export translations for direct access if needed
export { translations };
