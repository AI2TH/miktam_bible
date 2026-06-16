const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ADB = 'C:\\Users\\kevin\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';
const TEST_RESULTS_DIR = 'C:\\Users\\kevin\\OneDrive\\Documents\\kalvin\\bible\\test_results';

if (!fs.existsSync(TEST_RESULTS_DIR)) {
  fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
}

const BOOK_ABBREVIATIONS = {
  1: 'Gen', 2: 'Exo', 3: 'Lev', 4: 'Num', 5: 'Deu',
  6: 'Jos', 7: 'Jdg', 8: 'Rut', 9: '1Sa', 10: '2Sa',
  11: '1Ki', 12: '2Ki', 13: '1Ch', 14: '2Ch',
  15: 'Ezr', 16: 'Neh', 17: 'Est', 18: 'Job', 19: 'Psa',
  20: 'Pro', 21: 'Ecc', 22: 'Sng', 23: 'Isa',
  24: 'Jer', 25: 'Lam', 26: 'Eze', 27: 'Dan',
  28: 'Hos', 29: 'Joe', 30: 'Amo', 31: 'Oba', 32: 'Jon',
  33: 'Mic', 34: 'Nah', 35: 'Hab', 36: 'Zep', 37: 'Hag',
  38: 'Zec', 39: 'Mal',
  40: 'Mat', 41: 'Mrk', 42: 'Luk', 43: 'Jhn', 44: 'Act',
  45: 'Rom', 46: '1Co', 47: '2Co', 48: 'Gal',
  49: 'Eph', 50: 'Php', 51: 'Col',
  52: '1Th', 53: '2Th',
  54: '1Ti', 55: '2Ti', 56: 'Tit', 57: 'Phm',
  58: 'Heb', 59: 'Jas', 60: '1Pe', 61: '2Pe',
  62: '1Jn', 63: '2Jn', 64: '3Jn', 65: 'Jud', 66: 'Rev',
};

const CHAPTERS_PER_BOOK = {
  1: 50, 2: 40, 3: 27, 4: 36, 5: 34, 6: 24, 7: 21, 8: 4, 9: 31, 10: 24,
  11: 22, 12: 25, 13: 29, 14: 36, 15: 10, 16: 13, 17: 10, 18: 42, 19: 150, 20: 31,
  21: 12, 22: 8, 23: 66, 24: 52, 25: 5, 26: 48, 27: 12, 28: 14, 29: 3, 30: 9,
  31: 1, 32: 4, 33: 7, 34: 3, 35: 3, 36: 3, 37: 2, 38: 14, 39: 4,
  40: 28, 41: 16, 42: 24, 43: 21, 44: 28, 45: 16, 46: 16, 47: 13, 48: 6, 49: 6,
  50: 4, 51: 4, 52: 5, 53: 3, 54: 6, 55: 4, 56: 3, 57: 1, 58: 13, 59: 5,
  60: 5, 61: 3, 62: 5, 63: 1, 64: 1, 65: 1, 66: 22
};

const BOOK_NAMES = {
  1: 'Genesis', 2: 'Exodus', 3: 'Leviticus', 4: 'Numbers', 5: 'Deuteronomy',
  6: 'Joshua', 7: 'Judges', 8: 'Ruth', 9: '1 Samuel', 10: '2 Samuel',
  11: '1 Kings', 12: '2 Kings', 13: '1 Chronicles', 14: '2 Chronicles',
  15: 'Ezra', 16: 'Nehemiah', 17: 'Esther', 18: 'Job', 19: 'Psalms',
  20: 'Proverbs', 21: 'Ecclesiastes', 22: 'Song of Solomon', 23: 'Isaiah',
  24: 'Jeremiah', 25: 'Lamentations', 26: 'Ezekiel', 27: 'Daniel',
  28: 'Hosea', 29: 'Joel', 30: 'Amos', 31: 'Obadiah', 32: 'Jonah',
  33: 'Micah', 34: 'Nahum', 35: 'Habakkuk', 36: 'Zephaniah', 37: 'Haggai',
  38: 'Zechariah', 39: 'Malachi',
  40: 'Matthew', 41: 'Mark', 42: 'Luke', 43: 'John', 44: 'Acts',
  45: 'Romans', 46: '1 Corinthians', 47: '2 Chronicles', // wait, let's keep 47: '2 Corinthians' correct
  47: '2 Corinthians', 48: 'Galatians',
  49: 'Ephesians', 50: 'Philippians', 51: 'Colossians',
  52: '1 Thessalonians', 53: '2 Thessalonians',
  54: '1 Timothy', 55: '2 Timothy', 56: 'Titus', 57: 'Philemon',
  58: 'Hebrews', 59: 'James', 60: '1 Peter', 61: '2 Peter',
  62: '1 John', 63: '2 John', 64: '3 John', 65: 'Jude', 66: 'Revelation',
};

// Fix the typo in duplicate key 47
BOOK_NAMES[47] = '2 Corinthians';

function runAdb(cmd) {
  try {
    return execSync(`"${ADB}" ${cmd}`, { encoding: 'utf8', stdio: 'pipe', maxBuffer: 15 * 1024 * 1024, timeout: 15000 });
  } catch (e) {
    console.error(`ADB command failed: ${cmd}`, e.message);
    if (cmd.includes('uiautomator')) {
      console.log('uiautomator command timed out or failed. Attempting to kill stray uiautomator processes...');
      try {
        execSync(`"${ADB}" shell pkill -f uiautomator`, { stdio: 'ignore' });
      } catch (err) {
        // ignore
      }
    }
    return null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getUiDump() {
  const localFile = 'temp_dump.xml';
  for (let attempt = 0; attempt < 3; attempt++) {
    if (fs.existsSync(localFile)) {
      try {
        fs.unlinkSync(localFile);
      } catch (e) {}
    }
    runAdb('shell rm -f /sdcard/window_dump.xml');
    const res = runAdb('shell uiautomator dump /sdcard/window_dump.xml');
    if (res === null) {
      console.log(`[getUiDump] uiautomator dump failed on attempt ${attempt + 1}. Retrying in 2s...`);
      await sleep(2000);
      continue;
    }
    runAdb(`pull /sdcard/window_dump.xml ${localFile}`);
    if (fs.existsSync(localFile)) {
      return fs.readFileSync(localFile, 'utf8');
    }
    await sleep(1000);
  }
  return '';
}

function parseBounds(boundsStr) {
  const match = boundsStr.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (match) {
    const x1 = parseInt(match[1]);
    const y1 = parseInt(match[2]);
    const x2 = parseInt(match[3]);
    const y2 = parseInt(match[4]);
    return {
      x1, y1, x2, y2,
      cx: Math.round((x1 + x2) / 2),
      cy: Math.round((y1 + y2) / 2)
    };
  }
  return null;
}

async function scrollToTop() {
  console.log('Scrolling Book Grid to top...');
  for (let i = 0; i < 4; i++) {
    runAdb('shell input swipe 540 800 540 1800 250');
    await sleep(400);
  }
  await sleep(1500); // Wait for scroll momentum to stop
}

async function scrollChapterGridToTop() {
  console.log('Scrolling Chapter Grid to top...');
  for (let i = 0; i < 6; i++) {
    runAdb('shell input swipe 540 800 540 1800 250');
    await sleep(300);
  }
  await sleep(1000); // Wait for scroll momentum to stop
}

async function selectVersion(versionId) {
  const targetDesc = versionId.toUpperCase();
  console.log(`Selecting version: ${targetDesc}...`);
  
  // Scroll horizontal version picker to far left first
  for (let i = 0; i < 5; i++) {
    runAdb('shell input swipe 200 170 900 170 200');
    await sleep(300);
  }
  await sleep(1500); // Wait for horizontal scroll to settle
  
  for (let attempt = 0; attempt < 10; attempt++) {
    const xml = await getUiDump();
    const regex = new RegExp(`content-desc="([^"]+ • ${targetDesc})"[^>]*bounds="([^"]+)"`, 'i');
    const match = xml.match(regex);
    if (match) {
      const bounds = parseBounds(match[2]);
      if (bounds) {
        console.log(`Found version chip ${match[1]} at [${bounds.cx}, ${bounds.cy}]. Tapping...`);
        runAdb(`shell input tap ${bounds.cx} ${bounds.cy}`);
        await sleep(1500);
        return true;
      }
    }
    console.log(`Version chip ${targetDesc} not found. Swiping right...`);
    runAdb('shell input swipe 900 170 200 170 400');
    await sleep(1500); // Wait for scroll momentum to stop
  }
  return false;
}

async function findAndTapBook(bookNum) {
  const name = BOOK_NAMES[bookNum];
  const abbr = BOOK_ABBREVIATIONS[bookNum];
  console.log(`Looking for book: ${name} (${abbr})...`);

  // Switch to correct Testament tab
  if (bookNum <= 39) {
    runAdb('shell input tap 274 240');
  } else {
    runAdb('shell input tap 738 240');
  }
  await sleep(500);

  await scrollToTop();
  await sleep(1000); // Extra buffer for top settle

  for (let attempt = 0; attempt < 6; attempt++) {
    const xml = await getUiDump();
    const regex = new RegExp(`content-desc="(${abbr}, [^"]+)"[^>]*bounds="([^"]+)"`, 'i');
    const match = xml.match(regex);
    if (match) {
      const bounds = parseBounds(match[2]);
      if (bounds) {
        console.log(`Found book ${match[1]} at [${bounds.cx}, ${bounds.cy}]. Tapping...`);
        runAdb(`shell input tap ${bounds.cx} ${bounds.cy}`);
        await sleep(1200);
        return true;
      }
    }
    console.log(`Book ${abbr} not visible. Scrolling down...`);
    runAdb('shell input swipe 540 1800 540 800 400');
    await sleep(1500); // Wait for scroll momentum to stop
  }
  return false;
}

function getVisibleChapters(xml) {
  const regex = /<node[^>]*content-desc="(\d+)"[^>]*clickable="true"[^>]*bounds="([^"]+)"/g;
  let match;
  const map = {};
  while ((match = regex.exec(xml)) !== null) {
    const chNum = parseInt(match[1]);
    const bounds = parseBounds(match[2]);
    if (bounds) {
      // Filter out elements that are partially obscured at the top/bottom of scrollview
      if (bounds.cy >= 320 && bounds.cy <= 2180) {
        map[chNum] = bounds;
      }
    }
  }
  return map;
}

function countLogcatOccurrences(query) {
  const logcat = runAdb('logcat -d');
  if (!logcat) return 0;
  const matches = logcat.match(new RegExp(query, 'g'));
  return matches ? matches.length : 0;
}

function captureScreenshot(filename) {
  const localPath = path.join(TEST_RESULTS_DIR, filename);
  try {
    const buffer = execSync(`"${ADB}" exec-out screencap -p`, { maxBuffer: 15 * 1024 * 1024 });
    fs.writeFileSync(localPath, buffer);
  } catch (err) {
    console.error(`Failed to capture screenshot: ${filename}`, err.message);
  }
}

async function deepLinkToBook(bookNum) {
  console.log(`[Recovery] Deep linking directly to book ${bookNum}...`);
  runAdb(`shell am start -a android.intent.action.VIEW -d "bible-app://read/${bookNum}"`);
  await sleep(1500);
  await scrollChapterGridToTop();
}

async function runTest() {
  console.log('=== Bible UI Automation Test Runner Started ===');
  
  // Bring app to foreground
  runAdb('shell monkey -p miktam.bible -c android.intent.category.LAUNCHER 1');
  
  // Wait for the app to load
  console.log('Waiting for app to load...');
  let loaded = false;
  for (let attempt = 0; attempt < 20; attempt++) {
    await sleep(2000);
    const xml = await getUiDump();
    if (xml.includes('Miktam Bible') || xml.includes('Read') || xml.includes('Holy Bible')) {
      console.log('App loaded successfully.');
      loaded = true;
      break;
    }
    console.log('Still waiting for app to load...');
  }

  if (!loaded) {
    console.error('App failed to load within 40 seconds. Exiting...');
    return;
  }

  const versionsToTest = ['asv', 'bbe', 'ncv', 'cuv', 'ara', 'kjv'];
  const report = [];

  for (const ver of versionsToTest) {
    console.log(`\n==========================================`);
    console.log(`🚀 STARTING TEST FOR TRANSLATION: ${ver.toUpperCase()}`);
    console.log(`==========================================`);
    
    // Deep link to reset navigation stack to book list
    console.log('Resetting navigation stack to main Read screen...');
    runAdb('shell am start -a android.intent.action.VIEW -d "bible-app://read"');
    await sleep(2000);

    const verSelected = await selectVersion(ver);
    if (!verSelected) {
      console.error(`Failed to select version ${ver}. Skipping...`);
      report.push({ version: ver, status: 'FAILED_TO_SELECT' });
      continue;
    }

    let verSuccessCount = 0;
    let verFailureCount = 0;
    const failedChapters = [];

    // Loop through all 66 books
    for (let bookNum = 1; bookNum <= 66; bookNum++) {
      const bookName = BOOK_NAMES[bookNum];
      const bookAbbr = BOOK_ABBREVIATIONS[bookNum];
      const totalChapters = CHAPTERS_PER_BOOK[bookNum];

      console.log(`\n--- Testing Book: ${bookName} (${bookAbbr}) [${totalChapters} Chapters] ---`);
      
      const bookTapped = await findAndTapBook(bookNum);
      if (!bookTapped) {
        console.error(`Could not find/tap book ${bookName}. Attempting deep link recovery...`);
        await deepLinkToBook(bookNum);
      }

      // Clear logcat at start of book
      runAdb('logcat -c');
      let lastFetchedCount = 0;
      console.log('Cleared logcat logs for book.');

      let nextCh = 1;
      let consecutiveScrolls = 0;
      let visibleMap = {};
      let needsDump = true;

      while (nextCh <= totalChapters) {
        if (needsDump) {
          const xml = await getUiDump();
          visibleMap = getVisibleChapters(xml);
          needsDump = false;
        }

        if (visibleMap[nextCh]) {
          consecutiveScrolls = 0;
          const { cx, cy } = visibleMap[nextCh];

          // Tap chapter button
          runAdb(`shell input tap ${cx} ${cy}`);
          await sleep(400); // Allow database query to execute and transition to start

          // Go back
          runAdb('shell input keyevent 4');
          await sleep(250); // Allow transition back to complete

          // Verify using running logcat count
          const currentCount = countLogcatOccurrences('getChapterVerses fetched');
          let success = currentCount > lastFetchedCount;

          if (!success) {
            // Fallback: wait a bit longer and check again
            await sleep(400);
            const retryCount = countLogcatOccurrences('getChapterVerses fetched');
            if (retryCount > lastFetchedCount) {
              success = true;
              lastFetchedCount = retryCount;
            }
          } else {
            lastFetchedCount = currentCount;
          }

          if (success) {
            verSuccessCount++;
            if (nextCh === 1 || nextCh % 10 === 0 || nextCh === totalChapters) {
              console.log(`    Chapter ${nextCh}: ✅ PASS`);
            }
          } else {
            verFailureCount++;
            console.error(`    Chapter ${nextCh}: ❌ FAIL (Verse query log not detected)`);
            failedChapters.push({ book: bookAbbr, chapter: nextCh, reason: 'Log entry not found' });

            // Save failure screenshot
            captureScreenshot(`fail_${ver}_${bookAbbr}_${nextCh}.png`);

            // Recover navigation: deep link directly to the book
            await deepLinkToBook(bookNum);
            needsDump = true;
            
            // Reset logcat count tracker
            runAdb('logcat -c');
            lastFetchedCount = 0;
          }

          nextCh++;
        } else {
          // Chapter not visible in cache. Scroll down!
          console.log(`  Chapter ${nextCh} not visible in cache. Scrolling chapter grid down...`);
          runAdb('shell input swipe 540 1500 540 800 500');
          await sleep(2000); // Wait for list to settle
          needsDump = true;
          
          consecutiveScrolls++;
          if (consecutiveScrolls > 5) {
            console.error(`  [Recovery] Stuck searching for chapter ${nextCh}. Re-triggering deep link...`);
            await deepLinkToBook(bookNum);
            needsDump = true;
            consecutiveScrolls = 0;
          }
        }
      }

      // Return to book list screen
      console.log(`Finished book ${bookName}. Navigating back to Book Grid...`);
      runAdb('shell input keyevent 4');
      await sleep(1000);
    }

    report.push({
      version: ver,
      successCount: verSuccessCount,
      failureCount: verFailureCount,
      failures: failedChapters
    });

    console.log(`\n==========================================`);
    console.log(`📊 TRANSLATION ${ver.toUpperCase()} RESULTS:`);
    console.log(`  Success: ${verSuccessCount} chapters`);
    console.log(`  Failures: ${verFailureCount} chapters`);
    console.log(`==========================================`);
  }

  // Save final report to JSON file
  const reportPath = path.join(TEST_RESULTS_DIR, 'test_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n🎉 ALL TESTS COMPLETED! Final report saved to: ${reportPath}`);
}

runTest().catch(console.error);
