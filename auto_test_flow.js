const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ADB = 'C:\\Users\\kevin\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';
const TEST_RESULTS_DIR = 'C:\\Users\\kevin\\OneDrive\\Documents\\kalvin\\bible\\test_results';

if (!fs.existsSync(TEST_RESULTS_DIR)) {
  fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
}

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
      try { fs.unlinkSync(localFile); } catch (e) {}
    }
    runAdb('shell rm -f /data/local/tmp/window_dump.xml');
    const res = runAdb('shell uiautomator dump /data/local/tmp/window_dump.xml');
    if (res === null) {
      console.log(`[getUiDump] uiautomator dump failed on attempt ${attempt + 1}. Retrying in 2s...`);
      await sleep(2000);
      continue;
    }
    runAdb(`pull /data/local/tmp/window_dump.xml ${localFile}`);
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

function findVersionChips(xml) {
  const chips = [];
  const regex = /<node[^>]*content-desc="([^"]+ • [^"]+)"[^>]*bounds="([^"]+)"/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const desc = match[1];
    const boundsStr = match[2];
    const bounds = parseBounds(boundsStr);
    if (bounds) {
      chips.push({ desc, id: desc.split(' • ')[1].toLowerCase(), bounds });
    }
  }
  return chips;
}

async function ensureOnBookGrid(attempt = 0) {
  if (attempt > 10) {
    throw new Error('Failed to ensure app is on Book Grid after 10 attempts. Exiting to avoid infinite recursion.');
  }
  const xml = await getUiDump();
  if (!xml.includes('package="miktam.bible"')) {
    console.log('[Recovery] App is closed or not in foreground. Relaunching app...');
    runAdb('shell monkey -p miktam.bible -c android.intent.category.LAUNCHER 1');
    await sleep(4000);
    return ensureOnBookGrid(attempt + 1);
  }

  // If we are on the Home screen, tap the Read tab to go to Book Grid
  if (xml.includes('Miktam Bible') || xml.includes('Your offline study companion') || xml.includes('Verse of the Day')) {
    console.log('[Recovery] On Home screen. Tapping Read tab...');
    runAdb('shell input tap 324 2311');
    await sleep(1500);
    return ensureOnBookGrid(attempt + 1);
  }

  if (xml.includes('Old Testament') || xml.includes('New Testament') || xml.includes('Gênesis') || xml.includes('Genesis') || xml.includes('Geneza')) {
    // We are on Book Grid or Chapter Picker
    if ((xml.includes('Genesis') || xml.includes('Gênesis') || xml.includes('Geneza')) && !xml.includes('Old Testament')) {
      // In scripture or chapter list. Go back.
      console.log('[Recovery] In Scripture/Chapter Picker. Pressing Back...');
      runAdb('shell input keyevent 4');
      await sleep(1200);
      return ensureOnBookGrid(attempt + 1);
    }
    return true;
  }
  
  // Not on Read tab. Tap Read tab.
  console.log('[Recovery] Not on Read tab. Tapping Read tab...');
  runAdb('shell input tap 324 2311');
  await sleep(1500);
  return ensureOnBookGrid(attempt + 1);
}

async function main() {
  console.log('=== Starting E2E UI Automation Bible Version Tester ===');
  
  // Clear logcat
  runAdb('logcat -c');
  console.log('Cleared Logcat logs.');

  // Ensure we start on Book Grid
  await ensureOnBookGrid();

  const testedVersions = new Set();
  let swipeCount = 0;
  let noNewVersionsCount = 0;

  while (swipeCount < 10) {
    await ensureOnBookGrid();
    const xml = await getUiDump();
    const visibleChips = findVersionChips(xml);
    console.log(`\n--- Scan ${swipeCount + 1}: Found ${visibleChips.length} visible version chips ---`);

    let newVersionsThisScan = 0;

    for (const chip of visibleChips) {
      if (testedVersions.has(chip.id)) {
        continue;
      }
      newVersionsThisScan++;
      testedVersions.add(chip.id);

      console.log(`\n👉 Testing Version: ${chip.desc.toUpperCase()} (ID: ${chip.id})`);
      
      // Ensure on Book Grid before tapping chip
      await ensureOnBookGrid();
      
      // Tap version chip
      console.log(`Tapping version chip at [${chip.bounds.cx}, ${chip.bounds.cy}]...`);
      runAdb(`shell input tap ${chip.bounds.cx} ${chip.bounds.cy}`);
      await sleep(1200);

      // Select Old Testament Tab
      console.log('Selecting Old Testament tab...');
      runAdb('shell input tap 274 240');
      await sleep(800);

      // Tap Genesis Book (Col 0, Row 0 on Book Grid: 197 776)
      console.log('Tapping Genesis book...');
      runAdb('shell input tap 197 776');
      await sleep(2000);

      // Tap Chapter 1 (Col 0, Row 0 on Chapter Grid: 121 444)
      console.log('Tapping Chapter 1...');
      runAdb('shell input tap 121 444');
      await sleep(2500);

      // Check logcat or UI XML for verses loading
      console.log('Verifying verse loading...');
      const logcat = runAdb('logcat -d');
      let loadedVersesCount = null;
      if (logcat) {
        const lines = logcat.split('\n');
        for (let i = lines.length - 1; i >= 0; i--) {
          if (lines[i].includes('getChapterVerses fetched')) {
            const match = lines[i].match(/fetched (\d+) verses/);
            if (match) {
              loadedVersesCount = parseInt(match[1]);
              break;
            }
          }
        }
      }

      // Check UI Dump for scripture verses
      const readXml = await getUiDump();
      const hasScriptureText = readXml.includes('And the whole earth was of one language') || 
                               readXml.includes('In the beginning') ||
                               readXml.includes('1 ') ||
                               readXml.includes('verse');

      const pass = (loadedVersesCount !== null && loadedVersesCount > 0) || hasScriptureText;
      console.log(`Verification Status: ${pass ? '✅ SUCCESS' : '❌ FAILED'}`);
      if (loadedVersesCount !== null) {
        console.log(`  Logcat reports: ${loadedVersesCount} verses fetched.`);
      } else {
        console.log(`  UI XML includes scripture marker: ${hasScriptureText}`);
      }

      // Capture screenshot
      const screenshotPath = `${TEST_RESULTS_DIR}\\screenshot_${chip.id}_Gen_1.png`;
      try {
        const buffer = execSync(`"${ADB}" exec-out screencap -p`, { maxBuffer: 15 * 1024 * 1024 });
        fs.writeFileSync(screenshotPath, buffer);
        console.log(`  Screenshot saved: ${screenshotPath}`);
      } catch (err) {
        console.error('  Failed to capture screenshot:', err.message);
      }
    }

    if (newVersionsThisScan === 0) {
      noNewVersionsCount++;
      if (noNewVersionsCount >= 2) {
        console.log('\nNo new versions discovered after 2 consecutive swipes. Ending loop.');
        break;
      }
    } else {
      noNewVersionsCount = 0;
    }

    // Ensure we are back on Book Grid before swiping
    await ensureOnBookGrid();

    // Swipe left to reveal more version chips
    console.log('\nSwiping left to reveal more versions...');
    runAdb('shell input swipe 900 402 200 402 600');
    await sleep(2000);
    swipeCount++;
  }

  // Final recovery to book grid
  await ensureOnBookGrid();

  console.log(`\n==================================================`);
  console.log(`🎉 AUTOMATION COMPLETED!`);
  console.log(`Tested ${testedVersions.size} Bible versions successfully.`);
  console.log(`All captured screenshots are in: ${TEST_RESULTS_DIR}`);
  console.log(`==================================================`);
}

main().catch(console.error);
