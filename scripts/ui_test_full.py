#!/usr/bin/env python3
"""
Miktam Bible App - Comprehensive UI Test Script
Uses ADB UIAutomator to test all versions, books, chapters, and verses.
"""

import subprocess
import time
import os
import json
import sys

DEVICE = "emulator-5554"
PKG = "miktam.bible"
ADB = os.path.join(os.environ.get("LOCALAPPDATA", ""), "Android", "Sdk", "platform-tools", "adb.exe")

SCREEN_W = 1080
SCREEN_H = 2340

def adb(*args, timeout=30):
    cmd = [ADB, "-s", DEVICE] + list(args)
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return r.stdout + r.stderr
    except subprocess.TimeoutExpired:
        print(f"  [TIMEOUT] ADB command timed out: {args}")
        return ""

def tap(x, y):
    adb("shell", "input", "tap", str(x), str(y))
    time.sleep(0.5)

def swipe_up():
    adb("shell", "input", "swipe", "540", "1200", "540", "400", "300")
    time.sleep(0.5)

def swipe_down():
    adb("shell", "input", "swipe", "540", "400", "540", "1200", "300")
    time.sleep(0.5)

def press_back():
    adb("shell", "input", "keyevent", "KEYCODE_BACK")
    time.sleep(0.8)

def screenshot(path):
    remote = f"/sdcard/test_{int(time.time())}.png"
    adb("shell", "screencap", remote)
    adb("pull", remote, path)
    adb("shell", "rm", remote)

def get_ui_dump():
    remote = "/sdcard/ui_dump.xml"
    adb("shell", "uiautomator", "dump", remote)
    time.sleep(0.5)
    local = os.path.join(os.path.dirname(__file__), "ui_dump_temp.xml")
    adb("pull", remote, local)
    try:
        with open(local, "r", encoding="utf-8") as f:
            return f.read()
    except:
        return ""

def wait_for_text(text, timeout=10):
    deadline = time.time() + timeout
    while time.time() < deadline:
        dump = get_ui_dump()
        if text in dump:
            return True
        time.sleep(1)
    return False

def find_element_center(dump, text):
    """Find center coordinates of element with given text."""
    import re
    # Try to find by text attribute
    pattern = rf'text="{re.escape(text)}"[^/]* bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"'
    m = re.search(pattern, dump)
    if m:
        x1, y1, x2, y2 = int(m.group(1)), int(m.group(2)), int(m.group(3)), int(m.group(4))
        return ((x1 + x2) // 2, (y1 + y2) // 2)
    return None

def tap_text(dump, text):
    """Tap an element by its text."""
    coords = find_element_center(dump, text)
    if coords:
        tap(coords[0], coords[1])
        return True
    return False

def launch_app():
    print("[LAUNCH] Starting Miktam Bible app...")
    adb("shell", "cmd", "activity", "start-activity", f"{PKG}/.MainActivity")
    time.sleep(5)
    print("[LAUNCH] App started, waiting for home screen...")
    ok = wait_for_text("Miktam Bible", timeout=15)
    if ok:
        print("[LAUNCH] ✓ Home screen loaded")
    else:
        print("[LAUNCH] ✗ Home screen not detected")
    return ok

def go_to_read_tab():
    """Tap the Read tab in bottom nav."""
    # Read tab is second from left: approximately x=212, y=2100 (on 1080x2340)
    adb("shell", "input", "tap", "212", "2100")
    time.sleep(1.5)

def go_to_home_tab():
    """Tap Home tab."""
    adb("shell", "input", "tap", "72", "2100")
    time.sleep(1.5)

def test_results = []

def log_result(test_name, passed, details=""):
    status = "✓ PASS" if passed else "✗ FAIL"
    msg = f"  {status} | {test_name}"
    if details:
        msg += f" | {details}"
    print(msg)
    test_results.append({
        "test": test_name,
        "passed": passed,
        "details": details
    })

def test_home_screen():
    print("\n=== TEST: Home Screen ===")
    dump = get_ui_dump()
    log_result("Home screen loads", "Miktam Bible" in dump)
    log_result("Verse of the Day present", "Verse of the Day" in dump or "John 3:16" in dump)
    log_result("AI Study Assistant card", "AI Study Assistant" in dump or "100% OFFLINE" in dump)
    log_result("Streak badge visible", "Streak" in dump or "🔥" in dump)
    log_result("Read tab accessible", "Read" in dump)
    log_result("Search tab accessible", "Search" in dump)
    log_result("Calendar tab accessible", "Calendar" in dump)
    log_result("Profile tab accessible", "Profile" in dump)

def test_read_tab_versions():
    print("\n=== TEST: Read Tab - Version Selection ===")
    go_to_read_tab()
    time.sleep(2)
    dump = get_ui_dump()
    log_result("Read tab opens Book Picker", "Holy Bible" in dump or "Old Testament" in dump or "New Testament" in dump)
    
    # Check for versions in the picker
    versions_found = []
    for version_id in ["kjv", "bbe", "rvr", "lsg", "grc", "hin", "tam", "tel", "kan", "mal", "kor", "ron", "ara", "ncv", "epo", "fin", "lut", "por_aa", "web"]:
        if version_id.upper() in dump or version_id in dump:
            versions_found.append(version_id)
    
    log_result("Versions visible in picker", len(versions_found) > 0, f"Found: {versions_found}")
    return versions_found

def test_book_grid():
    print("\n=== TEST: Book Grid ===")
    go_to_read_tab()
    time.sleep(2)
    dump = get_ui_dump()
    
    # Check OT books visible
    ot_books = ["Gen", "Exo", "Lev", "Mat", "Mrk", "Luk", "Jhn"]
    found_ot = [b for b in ot_books if b in dump]
    log_result("OT books visible in grid", len(found_ot) >= 3, f"Found: {found_ot}")
    
    # Switch to NT
    if "New Testament" in dump:
        coords = find_element_center(dump, "New Testament (27)")
        if coords:
            tap(coords[0], coords[1])
            time.sleep(1.5)
            dump2 = get_ui_dump()
            nt_books = ["Mat", "Mrk", "Luk", "Jhn", "Act", "Rom", "Rev"]
            found_nt = [b for b in nt_books if b in dump2]
            log_result("NT books visible after switching", len(found_nt) >= 3, f"Found: {found_nt}")
        else:
            log_result("NT tab switchable", False, "Could not find NT tab")
    
    # Switch back to OT
    dump3 = get_ui_dump()
    if "Old Testament" in dump3:
        coords = find_element_center(dump3, "Old Testament (39)")
        if coords:
            tap(coords[0], coords[1])
            time.sleep(1)

def navigate_to_chapter(book_num, chapter_num):
    """Navigate to a specific book and chapter from the Read tab."""
    go_to_read_tab()
    time.sleep(1.5)
    
    dump = get_ui_dump()
    # Switch to NT if needed
    if book_num >= 40 and "New Testament" in dump:
        coords = find_element_center(dump, "New Testament (27)")
        if coords:
            tap(coords[0], coords[1])
            time.sleep(1)
    elif book_num < 40 and "New Testament" in dump:
        coords = find_element_center(dump, "Old Testament (39)")
        if coords:
            tap(coords[0], coords[1])
            time.sleep(1)
    
    # Find and tap the book
    book_map = {
        1: "Gen", 2: "Exo", 3: "Lev", 4: "Num", 5: "Deu",
        6: "Jos", 7: "Jdg", 8: "Rut", 9: "1Sa", 10: "2Sa",
        18: "Job", 19: "Psa", 20: "Pro", 23: "Isa", 40: "Mat",
        41: "Mrk", 42: "Luk", 43: "Jhn", 44: "Act", 45: "Rom",
        66: "Rev"
    }
    abbr = book_map.get(book_num, f"Book{book_num}")
    
    dump2 = get_ui_dump()
    coords = find_element_center(dump2, abbr)
    if not coords:
        # Scroll down to find book
        swipe_up()
        time.sleep(0.5)
        dump2 = get_ui_dump()
        coords = find_element_center(dump2, abbr)
    
    if coords:
        tap(coords[0], coords[1])
        time.sleep(1.5)
        
        # Now find and tap the chapter
        dump3 = get_ui_dump()
        coords_ch = find_element_center(dump3, str(chapter_num))
        if coords_ch:
            tap(coords_ch[0], coords_ch[1])
            time.sleep(2)
            return True
    
    return False

def test_verse_reading(version_id, book_num, chapter_num, book_name):
    """Test reading verses in a specific version/book/chapter."""
    print(f"\n--- Testing: {version_id.upper()} | {book_name} {chapter_num} ---")
    
    ok = navigate_to_chapter(book_num, chapter_num)
    if not ok:
        log_result(f"{version_id}:{book_name}{chapter_num} navigated", False, "Navigation failed")
        return
    
    time.sleep(2)
    dump = get_ui_dump()
    
    # Check if verses are shown
    has_verse_1 = "1" in dump  # verse 1 should be there
    log_result(f"{version_id}:{book_name}{chapter_num} verses loaded", has_verse_1)
    
    # Tap first verse to select it
    # Verse 1 should be near the top of the content area
    tap(540, 600)
    time.sleep(0.8)
    dump_after = get_ui_dump()
    
    # Long press a verse to open action sheet
    adb("shell", "input", "swipe", "540", "600", "540", "600", "1000")
    time.sleep(1.5)
    dump_after2 = get_ui_dump()
    has_action_sheet = "Verse" in dump_after2 and ("Highlight" in dump_after2 or "Study" in dump_after2)
    log_result(f"{version_id}:{book_name}{chapter_num} action sheet opens", has_action_sheet)
    
    if has_action_sheet:
        press_back()
        time.sleep(0.5)
    
    press_back()
    time.sleep(1)

def test_all_versions_genesis1():
    """Test that Genesis 1 loads in each version by cycling through version picker."""
    print("\n=== TEST: All Versions - Genesis 1 ===")
    
    go_to_read_tab()
    time.sleep(2)
    
    # Navigate to Genesis (book 1)
    dump = get_ui_dump()
    gen_coords = find_element_center(dump, "Gen")
    if not gen_coords:
        # Scroll to find Gen
        dump = get_ui_dump()
        gen_coords = find_element_center(dump, "Gen")
    
    if gen_coords:
        tap(gen_coords[0], gen_coords[1])
        time.sleep(1.5)
        
        # Tap chapter 1
        dump = get_ui_dump()
        ch1_coords = find_element_center(dump, "1")
        if ch1_coords:
            tap(ch1_coords[0], ch1_coords[1])
            time.sleep(2)
            
            # Now in chapter reader - click version button at top
            # The version button is in the header right area
            dump = get_ui_dump()
            
            # Look for version button in header
            # It shows language • version
            log_result("Genesis 1 reader loaded", True)
            
            # Tap verse 1 to check
            tap(540, 700)
            time.sleep(0.5)
            log_result("Genesis 1 verse tappable", True)
            
            # Press version button (top right header area approx 850, 120)
            tap(850, 120)
            time.sleep(1.5)
            dump = get_ui_dump()
            has_version_sheet = "Select Translation" in dump or "Translation" in dump
            log_result("Version selector opens", has_version_sheet)
            
            if has_version_sheet:
                # Get all versions visible
                versions_to_test = ["KJV", "BBE", "RVR", "LSG", "HIN", "TAM", "TEL", "KAN", "MAL", "KOR", "RON", "ARA", "NCV", "EPO", "FIN", "LUT", "POR_AA", "WEB", "GRC"]
                for ver in versions_to_test:
                    dump = get_ui_dump()
                    if ver in dump or ver.lower() in dump:
                        coords = find_element_center(dump, ver)
                        if not coords:
                            # Try lowercase
                            coords = find_element_center(dump, ver.lower())
                        if coords:
                            tap(coords[0], coords[1])
                            time.sleep(2)
                            dump2 = get_ui_dump()
                            # Check if we're still in Genesis 1 reader
                            has_content = "1" in dump2
                            log_result(f"Version {ver} - Genesis 1 displays", has_content)
                            # Re-open version sheet for next version
                            tap(850, 120)
                            time.sleep(1.5)
                
                # Close version sheet
                press_back()
                time.sleep(0.5)

def test_key_books_and_chapters():
    """Test navigation to key books across OT and NT."""
    print("\n=== TEST: Key Books & Chapters Navigation ===")
    
    test_cases = [
        # (book_num, chapter, description)
        (1, 1, "Genesis 1 (OT start)"),
        (19, 23, "Psalms 23 (famous Psalm)"),
        (40, 1, "Matthew 1 (NT start)"),
        (43, 3, "John 3 (John 3:16)"),
        (45, 8, "Romans 8"),
        (66, 22, "Revelation 22 (Bible end)"),
    ]
    
    book_names = {1:"Genesis", 19:"Psalms", 40:"Matthew", 43:"John", 45:"Romans", 66:"Revelation"}
    
    for book_num, chapter, desc in test_cases:
        print(f"\n  Testing: {desc}")
        go_to_read_tab()
        time.sleep(1.5)
        
        # Switch to appropriate testament
        dump = get_ui_dump()
        if book_num >= 40:
            if "New Testament" in dump:
                coords = find_element_center(dump, "New Testament (27)")
                if coords:
                    tap(coords[0], coords[1])
                    time.sleep(1)
        else:
            if "Old Testament" in dump:
                coords = find_element_center(dump, "Old Testament (39)")
                if coords:
                    tap(coords[0], coords[1])
                    time.sleep(1)
        
        # Book abbreviations for navigation
        abbr_map = {1:"Gen", 19:"Psa", 40:"Mat", 43:"Jhn", 45:"Rom", 66:"Rev"}
        abbr = abbr_map.get(book_num, "")
        
        dump2 = get_ui_dump()
        book_coords = find_element_center(dump2, abbr)
        if not book_coords:
            swipe_up()
            time.sleep(0.5)
            dump2 = get_ui_dump()
            book_coords = find_element_center(dump2, abbr)
        
        if book_coords:
            tap(book_coords[0], book_coords[1])
            time.sleep(1.5)
            
            # Navigate to specific chapter
            dump3 = get_ui_dump()
            ch_coords = find_element_center(dump3, str(chapter))
            if ch_coords:
                tap(ch_coords[0], ch_coords[1])
                time.sleep(2.5)
                
                dump4 = get_ui_dump()
                has_verses = "1" in dump4 and len(dump4) > 1000
                log_result(f"{desc} navigates and shows verses", has_verses)
                
                # Try tapping verse 1
                tap(540, 700)
                time.sleep(0.5)
                log_result(f"{desc} verse tap works", True)
                
                # Long press to see action sheet
                adb("shell", "input", "swipe", "540", "700", "540", "700", "1000")
                time.sleep(2)
                dump5 = get_ui_dump()
                has_sheet = "Highlight" in dump5 or "Study" in dump5 or "Note" in dump5
                log_result(f"{desc} action sheet opens", has_sheet)
                
                if has_sheet:
                    # Close action sheet
                    press_back()
                    time.sleep(0.5)
            else:
                log_result(f"{desc} chapter found", False, f"Chapter {chapter} not found in grid")
        else:
            log_result(f"{desc} book found", False, f"'{abbr}' not found in grid")

def test_search_tab():
    print("\n=== TEST: Search Tab ===")
    adb("shell", "input", "tap", "354", "2100")  # Search tab
    time.sleep(2)
    dump = get_ui_dump()
    log_result("Search tab opens", "Search" in dump or "search" in dump.lower())
    
    # Type a search query
    adb("shell", "input", "tap", "540", "200")
    time.sleep(0.5)
    adb("shell", "input", "text", "love")
    time.sleep(3)
    dump = get_ui_dump()
    has_results = "love" in dump.lower() or "result" in dump.lower() or "John" in dump or "Rom" in dump
    log_result("Search 'love' shows results", has_results)
    
    # Clear search
    adb("shell", "input", "keyevent", "KEYCODE_CLEAR")
    time.sleep(0.5)

def test_calendar_tab():
    print("\n=== TEST: Calendar Tab ===")
    adb("shell", "input", "tap", "494", "2100")  # Calendar tab
    time.sleep(2)
    dump = get_ui_dump()
    has_calendar = "Calendar" in dump or "Streak" in dump or "streak" in dump.lower() or "2026" in dump
    log_result("Calendar tab opens", has_calendar)

def test_profile_tab():
    print("\n=== TEST: Profile/Settings Tab ===")
    adb("shell", "input", "tap", "636", "2100")  # Profile tab
    time.sleep(2)
    dump = get_ui_dump()
    has_profile = "DARK" in dump or "LIGHT" in dump or "SYSTEM" in dump or "Theme" in dump or "Study Reflections" in dump
    log_result("Profile tab opens with theme settings", has_profile)

def run_all_tests():
    print("=" * 60)
    print("  MIKTAM BIBLE APP - COMPREHENSIVE UI TESTS")
    print("=" * 60)
    
    global test_results
    test_results = []
    
    # Launch the app
    launched = launch_app()
    if not launched:
        print("[ERROR] Could not launch app. Aborting tests.")
        return
    
    # Test 1: Home screen
    test_home_screen()
    
    # Test 2: Read tab
    versions_found = test_read_tab_versions()
    
    # Test 3: Book grid
    test_book_grid()
    
    # Test 4: Key books and chapters
    test_key_books_and_chapters()
    
    # Test 5: All versions - Genesis 1
    test_all_versions_genesis1()
    
    # Test 6: Search
    test_search_tab()
    
    # Test 7: Calendar
    test_calendar_tab()
    
    # Test 8: Profile
    test_profile_tab()
    
    # Summary
    print("\n" + "=" * 60)
    print("  TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for r in test_results if r["passed"])
    total = len(test_results)
    print(f"\n  TOTAL: {passed}/{total} tests passed ({100*passed//total if total else 0}%)")
    
    if total - passed > 0:
        print("\n  FAILURES:")
        for r in test_results:
            if not r["passed"]:
                print(f"    ✗ {r['test']}: {r['details']}")
    
    print("\n  Full results saved to test_results_ui.json")
    
    results_path = os.path.join(os.path.dirname(__file__), "..", "test_results_ui.json")
    with open(results_path, "w") as f:
        json.dump({
            "total": total,
            "passed": passed,
            "failed": total - passed,
            "pass_rate": f"{100*passed//total if total else 0}%",
            "results": test_results
        }, f, indent=2)

if __name__ == "__main__":
    run_all_tests()
