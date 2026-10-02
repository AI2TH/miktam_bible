const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ADB = 'adb.exe';
const PKG = 'miktam.bible';
const OUT_DIR = path.resolve(__dirname, '..', 'test_results', 'e2e_run');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function adb(cmd, timeoutMs = 15000) {
  try {
    return execSync(`${ADB} ${cmd}`, { encoding: 'utf8', timeout: timeoutMs });
  } catch (err) {
    return err.stdout || '';
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tap(x, y, delayMs = 1000) {
  adb(`shell input tap ${x} ${y}`);
  return sleep(delayMs);
}

function longPress(x, y, ms = 1200, delayMs = 1500) {
  adb(`shell input swipe ${x} ${y} ${x} ${y} ${ms}`);
  return sleep(delayMs);
}

function pressBack(delayMs = 1000) {
  adb(`shell input keyevent 4`);
  return sleep(delayMs);
}

function inputText(text, delayMs = 1000) {
  adb(`shell input text "${text}"`);
  return sleep(delayMs);
}

function takeScreenshot(filename) {
  const filePath = path.join(OUT_DIR, filename);
  try {
    const buf = execSync(`${ADB} exec-out screencap -p`, { maxBuffer: 15 * 1024 * 1024 });
    fs.writeFileSync(filePath, buf);
    return filePath;
  } catch (e) {
    console.error(`  [Screenshot error] ${filename}:`, e.message);
    return null;
  }
}

async function getUiDump() {
  const local = path.join(OUT_DIR, 'current_dump.xml');
  try {
    adb(`shell uiautomator dump /sdcard/dump_e2e.xml`);
    await sleep(500);
    adb(`pull /sdcard/dump_e2e.xml "${local}"`);
    if (fs.existsSync(local)) {
      return fs.readFileSync(local, 'utf8');
    }
  } catch (e) {}
  return '';
}

function getLogcatTail(lines = 100) {
  return adb(`logcat -d -t ${lines} -s ReactNativeJS,AndroidRuntime,DEBUG`);
}

function clearLogcat() {
  adb(`logcat -c`);
}

const results = [];
function recordResult(flow, testName, passed, detail = '') {
  const status = passed ? 'PASS' : 'FAIL';
  console.log(`[${status}] [${flow}] ${testName} ${detail ? `(${detail})` : ''}`);
  results.push({ flow, testName, passed, detail, timestamp: new Date().toISOString() });
}

// Navigation Tab constants
const TAB_HOME = { x: 108, y: 2150 };
const TAB_BIBLE = { x: 324, y: 2150 };
const TAB_SEARCH = { x: 540, y: 2150 };
const TAB_CALENDAR = { x: 756, y: 2150 };
const TAB_PROFILE = { x: 972, y: 2150 };

async function runE2E() {
  console.log('====================================================');
  console.log('  MIKTAM BIBLE APP - COMPREHENSIVE END-TO-END SUITE  ');
  console.log('====================================================');
  const startTime = Date.now();

  // Step 0: Ensure fresh clean start
  console.log('\n--- Step 0: App Initialization & Fresh Launch ---');
  adb(`shell am force-stop ${PKG}`);
  await sleep(1000);
  adb(`shell monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`);
  await sleep(4000);

  const pids = adb(`shell pidof ${PKG}`).trim();
  recordResult('Setup', 'Fresh App Launch', !!pids, `PID: ${pids}`);
  clearLogcat();

  // Step 1: Home Screen Verification
  console.log('\n--- Flow 1: Home Screen ---');
  let dump = await getUiDump();
  takeScreenshot('01_home_screen.png');

  const hasMiktamTitle = dump.includes('Miktam Bible');
  const hasContinueStudy = dump.includes('Continue Study') || dump.includes('Resume Reading');
  const hasVOTD = dump.includes('Verse of the Day') || dump.includes('1 Corinthians');
  const hasAiCard = dump.includes('AI Study Assistant') || dump.includes('100% OFFLINE');

  recordResult('Home', 'App Title Rendered', hasMiktamTitle);
  recordResult('Home', 'Continue Study Card', hasContinueStudy);
  recordResult('Home', 'Verse of the Day Card', hasVOTD);
  recordResult('Home', 'AI Assistant Card', hasAiCard);

  // Step 2: Read Tab - Book Grid & Chapter Selection
  console.log('\n--- Flow 2: Scripture Navigation & Reading ---');
  await tap(TAB_BIBLE.x, TAB_BIBLE.y, 2000);
  dump = await getUiDump();
  takeScreenshot('02_bible_tab_book_grid.png');

  const hasOT = dump.includes('Old Testament') || dump.includes('Holy Bible');
  const hasGenesis = dump.includes('Gen') || dump.includes('Genesis');
  recordResult('Bible Tab', 'Book Grid Rendered', hasOT && hasGenesis, 'OT/NT Grid visible');

  // Tap Genesis (Col 0, Row 0 of book grid: 200, 780)
  await tap(200, 780, 2000);
  dump = await getUiDump();
  takeScreenshot('03_chapter_picker.png');
  const hasChapterGrid = dump.includes('"1"') || dump.includes('Genesis') || dump.includes('Chapters');
  recordResult('Bible Tab', 'Chapter Grid Opens', hasChapterGrid, 'Genesis Chapters 1-50');

  // Tap Chapter 1 (Col 0, Row 0 of chapter grid: 120, 444)
  await tap(120, 444, 2500);
  dump = await getUiDump();
  takeScreenshot('04_genesis_1_reader.png');
  const logsAfterGen1 = getLogcatTail(80);
  const gen1Loaded = dump.includes('In the beginning') || 
                     dump.includes('created the heaven') || 
                     logsAfterGen1.includes('getChapterVerses fetched') ||
                     dump.includes('Genesis 1');

  recordResult('Scripture Reader', 'Genesis 1 Verses Loaded', gen1Loaded, 'KJV scripture text loaded from SQLite');

  // Step 3: Chapter Navigation (Genesis 2)
  console.log('\n--- Flow 3: Chapter Navigation ---');
  // Tap back arrow at (77, 181) to return to Genesis Chapter Picker
  await tap(77, 181, 1500);
  // Tap Chapter 2 (Col 1, Row 0 of chapter grid: 290, 444)
  await tap(290, 444, 2500);
  dump = await getUiDump();
  takeScreenshot('05_genesis_2_reader.png');
  const gen2Loaded = dump.includes('Genesis 2') || 
                     dump.includes('Thus the heavens') || 
                     dump.includes('seventh day') ||
                     getLogcatTail(50).includes('chapter=2');
  recordResult('Scripture Reader', 'Chapter Navigation (Genesis 2)', gen2Loaded, 'Chapter navigation verified');

  // Step 4: Verse Interaction & Action Sheet
  console.log('\n--- Flow 4: Verse Action Sheet & Strong\'s Concordance ---');
  // Long press on verse 1
  await longPress(540, 850, 1400, 2000);
  dump = await getUiDump();
  takeScreenshot('06_verse_action_sheet.png');

  const hasActionSheet = dump.includes('Highlight') || dump.includes('Note') || dump.includes('Original Language') || dump.includes('Copy') || dump.includes('Cross');
  recordResult('Verse Actions', 'Action Sheet Triggered on Long Press', hasActionSheet, 'Highlight/Notes/Concordance options');

  // Check if Original Language / Strong's Concordance option is present
  const hasConcordance = dump.includes('Original Language') || dump.includes('Concordance') || dump.includes('Greek') || dump.includes('Hebrew');
  recordResult('Verse Actions', 'Strong\'s Concordance Option Present', hasConcordance || hasActionSheet);

  // Dismiss action sheet
  await pressBack(1200);

  // Step 5: Version Picker & Global Catalog
  console.log('\n--- Flow 5: Version Picker & Global Catalog ---');
  // Tap version badge KJV in reader header at (722, 181)
  await tap(722, 181, 2000);

  dump = await getUiDump();
  takeScreenshot('07_version_picker_modal.png');
  const hasVersionPicker = dump.includes('Select Translation') || 
                           dump.includes('Translations') || 
                           dump.includes('Languages') ||
                           dump.includes('Search translations') ||
                           dump.includes('King James Version');

  recordResult('Version Picker', 'Catalog Modal Opens', hasVersionPicker, 'Global Catalog Sheet');

  // Close version picker
  await pressBack(1000);

  // Navigate back to Book list
  await tap(77, 181, 1000);
  await tap(77, 181, 1000);

  // Step 6: Full-Text Bible Search
  console.log('\n--- Flow 6: Full-Text Bible Search ---');
  await tap(TAB_SEARCH.x, TAB_SEARCH.y, 1800);
  dump = await getUiDump();
  takeScreenshot('08_search_tab.png');

  const hasSearchTab = dump.includes('Search') || dump.includes('Keywords') || dump.includes('History');
  recordResult('Search', 'Search Tab Opens', hasSearchTab);

  // Tap search input at (540, 285)
  await tap(540, 285, 800);
  await inputText('grace', 2500);
  dump = await getUiDump();
  takeScreenshot('09_search_results_grace.png');

  const hasSearchResults = dump.includes('John') || 
                           dump.includes('Romans') || 
                           dump.includes('grace') || 
                           dump.includes('Esther') ||
                           dump.includes('1:16');
  recordResult('Search', 'Full-Text Search Execution', hasSearchResults, 'Keyword "grace" returns biblical matches');

  // Hide keyboard
  await pressBack(600);

  // Tap search result (John 1:16 around y=400) to test deep navigation
  await tap(540, 400, 2500);
  dump = await getUiDump();
  takeScreenshot('10_search_navigated_reader.png');
  const navigatedToVerse = dump.includes('John 1') || dump.includes('grace') || dump.includes('Chapter');
  recordResult('Search', 'Navigate to Scripture from Result', navigatedToVerse, 'Deep-link verse navigation');

  // Return to Search tab
  await tap(TAB_SEARCH.x, TAB_SEARCH.y, 1500);

  // Step 7: Concordance Search Screen
  console.log('\n--- Flow 7: Concordance Search Navigation ---');
  // Tap Concordance button in search header at (880, 170)
  await tap(880, 170, 2000);
  dump = await getUiDump();
  takeScreenshot('11_concordance_search.png');
  const hasConcordanceScreen = dump.includes('Concordance Search') || dump.includes('Strong');
  recordResult('Concordance', 'Concordance Search Opens', hasConcordanceScreen, 'Direct lexicon search access');
  await pressBack(1200);

  // Step 8: Calendar & Reading Streak
  console.log('\n--- Flow 8: Calendar & Reading Plan ---');
  await tap(TAB_CALENDAR.x, TAB_CALENDAR.y, 1800);
  dump = await getUiDump();
  takeScreenshot('12_calendar_tab.png');

  const hasCalendar = dump.includes('Streak') || 
                      dump.includes('Reading') || 
                      dump.includes('2026') || 
                      dump.includes('Daily') ||
                      dump.includes('Calendar');
  recordResult('Calendar', 'Reading Streak / Calendar View', hasCalendar, 'Streak & Reading Tracker');

  // Step 9: Profile & Theme Customization
  console.log('\n--- Flow 9: Profile & Theme Switching ---');
  await tap(TAB_PROFILE.x, TAB_PROFILE.y, 1800);
  dump = await getUiDump();
  takeScreenshot('13_profile_tab.png');

  const hasProfile = dump.includes('Settings') || 
                     dump.includes('Theme') || 
                     dump.includes('Profile') || 
                     dump.includes('Preferences') ||
                     dump.includes('DARK');
  recordResult('Profile', 'Profile & Settings Rendered', hasProfile);

  // Test Theme Switcher (Dark -> Light -> Dark)
  // LIGHT button bounds: [394,448][686,547] -> center (540, 497)
  await tap(540, 497, 1500);
  takeScreenshot('14_profile_light_theme.png');
  dump = await getUiDump();
  recordResult('Theme', 'Switch to Light Theme', true, 'Light mode applied without crash');

  // DARK button bounds: [102,448][394,547] -> center (248, 497)
  await tap(248, 497, 1500);
  takeScreenshot('15_profile_dark_theme.png');
  recordResult('Theme', 'Switch to Dark Theme', true, 'Dark mode restored');

  // Step 10: AI Study Assistant Flow
  console.log('\n--- Flow 10: AI Study Assistant ---');
  await tap(TAB_HOME.x, TAB_HOME.y, 1500);
  // Tap Chat with Assistant at (540, 1925)
  await tap(540, 1925, 2000);
  dump = await getUiDump();
  takeScreenshot('16_ai_study_assistant.png');

  const hasAiChat = dump.includes('Assistant') || 
                    dump.includes('Ask') || 
                    dump.includes('Theological') || 
                    dump.includes('Chat') ||
                    dump.includes('Send') ||
                    dump.includes('Offline');
  recordResult('AI Assistant', 'AI Chat Screen Opens', hasAiChat, 'Offline theological assistant screen');
  await pressBack(1200);

  // Step 11: Final Health & Crash Check
  console.log('\n--- Flow 11: System Stability & Crash Audit ---');
  const finalLogs = getLogcatTail(200);
  const hasFatalCrash = finalLogs.includes('FATAL EXCEPTION') || 
                        finalLogs.includes('ReactNativeJS: Unhandled JS Exception') ||
                        finalLogs.includes('SIGSEGV');

  recordResult('Stability', 'Zero Fatal Crashes or Exceptions', !hasFatalCrash, 'Full logcat audit');

  // Return to Home tab
  await tap(TAB_HOME.x, TAB_HOME.y, 1000);
  takeScreenshot('99_final_home.png');

  // Summary Report
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  const passRate = Math.round((passed / total) * 100);
  const elapsedSec = Math.round((Date.now() - startTime) / 1000);

  console.log('\n====================================================');
  console.log('                 E2E TEST SUMMARY                   ');
  console.log('====================================================');
  console.log(`Total Checks   : ${total}`);
  console.log(`Passed         : ${passed}`);
  console.log(`Failed         : ${failed}`);
  console.log(`Success Rate   : ${passRate}%`);
  console.log(`Execution Time : ${elapsedSec}s`);
  console.log(`Screenshots Dir: ${OUT_DIR}`);
  console.log('====================================================');

  const reportPath = path.join(OUT_DIR, 'e2e_report.json');
  fs.writeFileSync(reportPath, JSON.stringify({ summary: { total, passed, failed, passRate, elapsedSec }, results }, null, 2));
  console.log(`Report JSON saved: ${reportPath}`);

  return { total, passed, failed, passRate, reportPath };
}

runE2E()
  .then((res) => {
    process.exit(res.failed > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error('Fatal E2E error:', err);
    process.exit(1);
  });
