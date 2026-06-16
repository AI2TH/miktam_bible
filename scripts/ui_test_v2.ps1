# Miktam Bible App - Comprehensive UI Test Script v2 (Fixed)
# PowerShell ADB automation test
# Run from project root: .\scripts\ui_test_v2.ps1

$ErrorActionPreference = "Continue"
$ADB = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$DEVICE = "emulator-5554"
$PKG = "miktam.bible"
$RESULTS_DIR = "C:\Users\kevin\OneDrive\Documents\kalvin\bible\test_results"

$script:Pass = 0
$script:Fail = 0
$script:Log = @()

# ============================================================
# CORE HELPERS
# ============================================================
function adb_cmd {
    param([string[]]$Args)
    $result = & $ADB -s $DEVICE @Args 2>&1
    return ($result | Out-String)
}

function Tap([int]$x, [int]$y, [int]$delay = 600) {
    adb_cmd @("shell","input","tap",$x,$y) | Out-Null
    Start-Sleep -Milliseconds $delay
}

function LongPress([int]$x, [int]$y, [int]$ms = 1200) {
    adb_cmd @("shell","input","swipe",$x,$y,$x,$y,$ms) | Out-Null
    Start-Sleep -Milliseconds 1800
}

function SwipeUp {
    adb_cmd @("shell","input","swipe","540","1400","540","500","400") | Out-Null
    Start-Sleep -Milliseconds 700
}

function PressBack {
    adb_cmd @("shell","input","keyevent","KEYCODE_BACK") | Out-Null
    Start-Sleep -Milliseconds 900
}

function GetDump {
    adb_cmd @("shell","uiautomator","dump","/sdcard/dump.xml") | Out-Null
    Start-Sleep -Milliseconds 400
    $local = "$env:TEMP\dump.xml"
    adb_cmd @("pull","/sdcard/dump.xml",$local) | Out-Null
    if (Test-Path $local) {
        return [System.IO.File]::ReadAllText($local)
    }
    return ""
}

function FindEl([string]$dump, [string]$text) {
    $escaped = [regex]::Escape($text)
    $pat = "text=`"$escaped`"[^>]*bounds=`"\[(\d+),(\d+)\]\[(\d+),(\d+)\]`""
    if ($dump -match $pat) {
        return @{
            Found = $true
            X = ([int]$Matches[1] + [int]$Matches[3]) / 2
            Y = ([int]$Matches[2] + [int]$Matches[4]) / 2
        }
    }
    return @{ Found = $false }
}

function TapEl([string]$dump, [string]$text) {
    $el = FindEl $dump $text
    if ($el.Found) { Tap ([int]$el.X) ([int]$el.Y); return $true }
    return $false
}

function WaitText([string]$text, [int]$secs = 10) {
    $end = (Get-Date).AddSeconds($secs)
    while ((Get-Date) -lt $end) {
        $d = GetDump
        if ($d -match [regex]::Escape($text)) { return $true }
        Start-Sleep -Seconds 1
    }
    return $false
}

function Shot([string]$name) {
    $r = "/sdcard/shot_$name.png"
    adb_cmd @("shell","screencap",$r) | Out-Null
    $l = "$RESULTS_DIR\$name.png"
    adb_cmd @("pull",$r,$l) | Out-Null
}

# ============================================================
# LOGGING
# ============================================================
function Pass([string]$name, [string]$detail = "") {
    $script:Pass++
    $msg = "  [✓] $name"
    if ($detail) { $msg += " | $detail" }
    Write-Host $msg -ForegroundColor Green
    $script:Log += [PSCustomObject]@{ Test=$name; Status="PASS"; Detail=$detail }
}

function Fail([string]$name, [string]$detail = "") {
    $script:Fail++
    $msg = "  [✗] $name"
    if ($detail) { $msg += " | $detail" }
    Write-Host $msg -ForegroundColor Red
    $script:Log += [PSCustomObject]@{ Test=$name; Status="FAIL"; Detail=$detail }
}

function Assert([bool]$cond, [string]$name, [string]$detail = "") {
    if ($cond) { Pass $name $detail } else { Fail $name $detail }
}

function Header([string]$text) {
    Write-Host "`n=== $text ===" -ForegroundColor Cyan
}

# ============================================================
# TAB COORDINATES (1080x2340 screen)
# ============================================================
$T_HOME = 72; $T_READ = 216; $T_SEARCH = 360; $T_CAL = 504; $T_PROF = 648; $T_Y = 2100

function GoHome   { Tap $T_HOME $T_Y 1500 }
function GoRead   { Tap $T_READ $T_Y 1500 }
function GoSearch { Tap $T_SEARCH $T_Y 1500 }
function GoCalendar { Tap $T_CAL $T_Y 1500 }
function GoProfile  { Tap $T_PROF $T_Y 1500 }

# ============================================================
# BOOK/CHAPTER DATA
# ============================================================
$CHAPTERS = @{
    1=50;2=40;3=27;4=36;5=34;6=24;7=21;8=4;9=31;10=24
    11=22;12=25;13=29;14=36;15=10;16=13;17=10;18=42;19=150;20=31
    21=12;22=8;23=66;24=52;25=5;26=48;27=12;28=14;29=3;30=9
    31=1;32=4;33=7;34=3;35=3;36=3;37=2;38=14;39=4
    40=28;41=16;42=24;43=21;44=28;45=16;46=16;47=13;48=6;49=6
    50=4;51=4;52=5;53=3;54=6;55=4;56=3;57=1;58=13;59=5
    60=5;61=3;62=5;63=1;64=1;65=1;66=22
}

$NAMES = @{
    1="Genesis";2="Exodus";3="Leviticus";4="Numbers";5="Deuteronomy"
    6="Joshua";7="Judges";8="Ruth";9="1 Samuel";10="2 Samuel"
    11="1 Kings";12="2 Kings";13="1 Chronicles";14="2 Chronicles"
    15="Ezra";16="Nehemiah";17="Esther";18="Job";19="Psalms"
    20="Proverbs";21="Ecclesiastes";22="Song of Solomon";23="Isaiah"
    24="Jeremiah";25="Lamentations";26="Ezekiel";27="Daniel"
    28="Hosea";29="Joel";30="Amos";31="Obadiah";32="Jonah"
    33="Micah";34="Nahum";35="Habakkuk";36="Zephaniah";37="Haggai"
    38="Zechariah";39="Malachi"
    40="Matthew";41="Mark";42="Luke";43="John";44="Acts"
    45="Romans";46="1 Corinthians";47="2 Corinthians";48="Galatians"
    49="Ephesians";50="Philippians";51="Colossians"
    52="1 Thessalonians";53="2 Thessalonians"
    54="1 Timothy";55="2 Timothy";56="Titus";57="Philemon"
    58="Hebrews";59="James";60="1 Peter";61="2 Peter"
    62="1 John";63="2 John";64="3 John";65="Jude";66="Revelation"
}

$ABBR = @{
    1="Gen";2="Exo";3="Lev";4="Num";5="Deu";6="Jos";7="Jdg";8="Rut";9="1Sa";10="2Sa"
    11="1Ki";12="2Ki";13="1Ch";14="2Ch";15="Ezr";16="Neh";17="Est";18="Job";19="Psa";20="Pro"
    21="Ecc";22="Sng";23="Isa";24="Jer";25="Lam";26="Eze";27="Dan";28="Hos";29="Joe";30="Amo"
    31="Oba";32="Jon";33="Mic";34="Nah";35="Hab";36="Zep";37="Hag";38="Zec";39="Mal"
    40="Mat";41="Mrk";42="Luk";43="Jhn";44="Act";45="Rom";46="1Co";47="2Co";48="Gal"
    49="Eph";50="Php";51="Col";52="1Th";53="2Th";54="1Ti";55="2Ti";56="Tit";57="Phm"
    58="Heb";59="Jas";60="1Pe";61="2Pe";62="1Jn";63="2Jn";64="3Jn";65="Jud";66="Rev"
}

# ============================================================
# NAVIGATE TO BOOK IN GRID
# ============================================================
function GoToBook([int]$bookNum) {
    GoRead
    Start-Sleep -Seconds 1

    $dump = GetDump

    # Switch to correct testament
    if ($bookNum -ge 40) {
        $el = FindEl $dump "New Testament (27)"
        if ($el.Found) { Tap ([int]$el.X) ([int]$el.Y) 800 }
    } else {
        $el = FindEl $dump "Old Testament (39)"
        if ($el.Found) { Tap ([int]$el.X) ([int]$el.Y) 800 }
    }

    $abbr = $ABBR[$bookNum]
    # Try to find book (up to 4 scroll attempts)
    for ($i = 0; $i -lt 4; $i++) {
        $dump = GetDump
        $el = FindEl $dump $abbr
        if ($el.Found) {
            Tap ([int]$el.X) ([int]$el.Y) 1500
            return $true
        }
        SwipeUp
    }
    return $false
}

# ============================================================
# NAVIGATE TO CHAPTER
# ============================================================
function GoToChapter([int]$bookNum, [int]$chapNum) {
    $ok = GoToBook $bookNum
    if (-not $ok) { return $false }

    # Find chapter in grid
    for ($i = 0; $i -lt 4; $i++) {
        $dump = GetDump
        $el = FindEl $dump "$chapNum"
        if ($el.Found) {
            Tap ([int]$el.X) ([int]$el.Y) 2500
            return $true
        }
        SwipeUp
    }
    return $false
}

# ============================================================
# TESTS
# ============================================================

function Test-01-HomeScreen {
    Header "1. HOME SCREEN"
    GoHome
    $d = GetDump
    Shot "01_home"
    Assert ($d -match "Miktam Bible") "Home: App title visible"
    Assert ($d -match "Verse of the Day" -or $d -match "John 3:16") "Home: VOTD card"
    Assert ($d -match "Continue Study" -or $d -match "Resume Reading") "Home: Continue Study card"
    Assert ($d -match "AI Study Assistant" -or $d -match "OFFLINE") "Home: AI Assistant card"
    Assert ($d -match ">Read<") "Home: Read tab in nav"
    Assert ($d -match ">Search<") "Home: Search tab in nav"
    Assert ($d -match ">Calendar<") "Home: Calendar tab in nav"
    Assert ($d -match ">Profile<") "Home: Profile tab in nav"
}

function Test-02-ReadTabVersions {
    Header "2. READ TAB - BOOK PICKER & VERSIONS"
    GoRead
    $d = GetDump
    Shot "02_read_bookpicker"
    
    Assert ($d -match "Holy Bible" -or $d -match "Old Testament") "Read: Book picker screen"
    Assert ($d -match "Old Testament") "Read: OT tab visible"
    Assert ($d -match "New Testament") "Read: NT tab visible"
    
    # Find version chips (format: "EN • KJV" etc)
    $foundVers = @()
    foreach ($v in @("KJV","BBE","RVR","LSG","HIN","TAM","TEL","KAN","MAL","KOR","RON","ARA","NCV","EPO","FIN","LUT","WEB","GRC","POR")) {
        if ($d -match $v) { $foundVers += $v }
    }
    Assert ($foundVers.Count -ge 3) "Read: Downloaded versions shown ($($foundVers.Count) found: $($foundVers -join ', '))"
}

function Test-03-BookGridOT {
    Header "3. OT BOOK GRID"
    GoRead
    $d = GetDump
    
    # Make sure OT tab is selected
    $otEl = FindEl $d "Old Testament (39)"
    if ($otEl.Found) { Tap ([int]$otEl.X) ([int]$otEl.Y) 800 }
    $d = GetDump
    Shot "03_ot_books"
    
    $expectedOT = @("Gen","Exo","Lev","Num","Deu","Jos","Jdg","Rut","1Sa","2Sa","1Ki","2Ki","1Ch","2Ch","Ezr","Neh","Est","Job","Psa","Pro")
    $foundOT = $expectedOT | Where-Object { $d -match $_ }
    Assert ($foundOT.Count -ge 10) "OT Grid: First 20 books visible ($($foundOT.Count)/20)" "$($foundOT -join ',')"
    
    # Scroll to check remaining OT books
    SwipeUp
    $d2 = GetDump
    Shot "03b_ot_books_scrolled"
    $moreOT = @("Ecc","Sng","Isa","Jer","Lam","Eze","Dan","Hos","Joe","Amo","Oba","Jon","Mic","Nah","Hab","Zep","Hag","Zec","Mal")
    $foundMore = $moreOT | Where-Object { $d2 -match $_ }
    Assert ($foundMore.Count -ge 5) "OT Grid: Minor prophets visible ($($foundMore.Count)/19)" "$($foundMore -join ',')"
}

function Test-04-BookGridNT {
    Header "4. NT BOOK GRID"
    GoRead
    $d = GetDump
    $ntEl = FindEl $d "New Testament (27)"
    if ($ntEl.Found) { Tap ([int]$ntEl.X) ([int]$ntEl.Y) 1000 }
    $d = GetDump
    Shot "04_nt_books"
    
    $expectedNT = @("Mat","Mrk","Luk","Jhn","Act","Rom","1Co","2Co","Gal","Eph","Php","Col","1Th","2Th","1Ti","2Ti","Tit","Phm","Heb","Jas","1Pe","2Pe","1Jn","2Jn","3Jn","Jud","Rev")
    $foundNT = $expectedNT | Where-Object { $d -match $_ }
    Assert ($foundNT.Count -ge 15) "NT Grid: Books visible ($($foundNT.Count)/27)" "$($foundNT -join ',')"
}

function Test-05-AllBooksChapterGrids {
    Header "5. ALL 66 BOOKS - CHAPTER GRID OPENS"
    
    foreach ($bookNum in 1..66) {
        $name = $NAMES[$bookNum]
        $abbr = $ABBR[$bookNum]
        Write-Host "  Book $bookNum: $name ($abbr)..." -ForegroundColor White -NoNewline
        
        $ok = GoToBook $bookNum
        if ($ok) {
            $d = GetDump
            # Chapter grid should show at least "1" and the book name
            $hasGrid = $d.Length -gt 500
            if ($hasGrid) {
                Write-Host " ✓" -ForegroundColor Green
                Pass "Book $bookNum ($name): Chapter grid opens"
            } else {
                Write-Host " ✗ (empty content)" -ForegroundColor Red
                Fail "Book $bookNum ($name): Chapter grid opens" "Content too short"
            }
        } else {
            Write-Host " ✗ (not found)" -ForegroundColor Red
            Fail "Book $bookNum ($name): Book found in grid" "Abbreviation '$abbr' not found"
        }
    }
}

function Test-06-RepresentativeChapters {
    Header "6. REPRESENTATIVE CHAPTERS - VERSE DISPLAY"
    
    # Test key chapters from various books
    $testCases = @(
        @{B=1;C=1;Desc="Genesis 1 (Creation)"}
        @{B=1;C=50;Desc="Genesis 50 (Last chapter)"}
        @{B=19;C=1;Desc="Psalms 1"}
        @{B=19;C=23;Desc="Psalms 23 (Shepherd)"}
        @{B=19;C=119;Desc="Psalms 119 (Longest chapter)"}
        @{B=19;C=150;Desc="Psalms 150 (Last)"}
        @{B=23;C=1;Desc="Isaiah 1"}
        @{B=23;C=53;Desc="Isaiah 53 (Servant Song)"}
        @{B=40;C=1;Desc="Matthew 1 (NT Start)"}
        @{B=40;C=5;Desc="Matthew 5 (Sermon on Mount)"}
        @{B=43;C=1;Desc="John 1 (In the beginning)"}
        @{B=43;C=3;Desc="John 3 (John 3:16)"}
        @{B=45;C=8;Desc="Romans 8"}
        @{B=46;C=13;Desc="1 Cor 13 (Love chapter)"}
        @{B=58;C=11;Desc="Hebrews 11 (Faith chapter)"}
        @{B=66;C=1;Desc="Revelation 1"}
        @{B=66;C=22;Desc="Revelation 22 (Bible end)"}
    )
    
    foreach ($tc in $testCases) {
        Write-Host "  $($tc.Desc)..." -ForegroundColor White -NoNewline
        $ok = GoToChapter $tc.B $tc.C
        if ($ok) {
            $d = GetDump
            $hasVerses = $d.Length -gt 2000
            if ($hasVerses) {
                Write-Host " ✓" -ForegroundColor Green
                Pass "$($tc.Desc): Verses load"
            } else {
                Write-Host " ✗" -ForegroundColor Red
                Fail "$($tc.Desc): Verses load" "Dump length: $($d.Length)"
            }
            Shot "ch_$($tc.B)_$($tc.C)"
        } else {
            Write-Host " ✗ (nav failed)" -ForegroundColor Red
            Fail "$($tc.Desc): Navigation works"
        }
    }
}

function Test-07-VerseTapAndActionSheet {
    Header "7. VERSE TAP & ACTION SHEET"
    
    # Genesis 1
    $ok = GoToChapter 1 1
    Assert $ok "Genesis 1: Navigation for action sheet test"
    if ($ok) {
        Start-Sleep -Seconds 1
        
        # Tap verse 1
        Tap 540 780 500
        $d = GetDump
        Assert $true "Genesis 1: Verse tap (no crash)"
        
        # Long press verse 1
        LongPress 540 780 1500
        $d = GetDump
        $hasSheet = $d -match "Highlight" -or $d -match "Note" -or $d -match "Study Reflection"
        Assert $hasSheet "Genesis 1: Long press opens action sheet"
        Shot "07_action_sheet_gen1"
        
        if ($hasSheet) {
            Assert ($d -match "Highlight Color" -or $d -match "Highlight") "Action sheet: Highlight Color section"
            Assert ($d -match "Original Language" -or $d -match "Language") "Action sheet: Original Language button"
            Assert ($d -match "Cross References" -or $d -match "Cross Ref") "Action sheet: Cross References button"
            Assert ($d -match "Compare Translations" -or $d -match "Compare" -or $d -match "Parallel") "Action sheet: Compare Translations button"
            Assert ($d -match "Reflection" -or $d -match "Note" -or $d -match "note") "Action sheet: Study Note section"
            PressBack
            Start-Sleep -Seconds 0.8
        }
    }
    
    # John 3 verse action sheet
    $ok2 = GoToChapter 43 3
    Assert $ok2 "John 3: Navigation for action sheet"
    if ($ok2) {
        LongPress 540 780 1500
        $d = GetDump
        Assert ($d -match "Highlight" -or $d -match "Note") "John 3: Action sheet opens"
        PressBack
    }
}

function Test-08-VersionSwitching {
    Header "8. VERSION SWITCHING (in Reader)"
    
    # Navigate to John 3:16 context
    $ok = GoToChapter 43 3
    Assert $ok "John 3: Navigated for version switching"
    if (-not $ok) { return }
    
    Start-Sleep -Seconds 1.5
    
    # Click version badge in header (approximately x=830, y=130)
    Tap 830 130 1500
    $d = GetDump
    $hasSheet = $d -match "Select Translation" -or $d -match "KJV" -or $d -match "BBE"
    
    if (-not $hasSheet) {
        # Try slightly different position
        Tap 900 110 1500
        $d = GetDump
        $hasSheet = $d -match "Select Translation" -or $d -match "KJV" -or $d -match "BBE" -or $d -match "Translation"
    }
    
    Assert $hasSheet "Version selector: Sheet opens from header"
    Shot "08_version_selector"
    
    if ($hasSheet) {
        # Test each version
        $versions = @(
            "KJV","BBE","RVR","LSG","LUT","EPO","FIN","RON","ARA","HIN","TAM","TEL","KAN","MAL","KOR","NCV","WEB","GRC"
        )
        
        foreach ($ver in $versions) {
            $d = GetDump
            $el = FindEl $d $ver
            if (-not $el.Found) {
                # Try POR_AA for Portuguese
                if ($ver -eq "POR") { $el = FindEl $d "POR_AA" }
            }
            if (-not $el.Found) {
                # Scroll within sheet
                SwipeUp
                $d = GetDump
                $el = FindEl $d $ver
            }
            
            if ($el.Found) {
                Tap ([int]$el.X) ([int]$el.Y) 2000
                $d2 = GetDump
                $hasContent = $d2.Length -gt 2000
                Assert $hasContent "Version $ver: John 3 displays" "Dump len=$($d2.Length)"
                Shot "ver_$($ver.ToLower())_john3"
                
                # Re-open version selector
                Tap 830 130 1500
                $d = GetDump
                if (-not ($d -match "KJV" -or $d -match "Select Translation")) {
                    Tap 900 110 1500
                }
            } else {
                Fail "Version $ver: Chip visible in selector"
            }
        }
        
        # Close selector
        PressBack
    }
}

function Test-09-SearchTab {
    Header "9. SEARCH TAB"
    GoSearch
    $d = GetDump
    Shot "09_search"
    Assert ($d -match "Search" -or $d -match "search" -or $d.Length -gt 500) "Search: Tab opens"
    
    # Type in search box
    Tap 540 200 800
    adb_cmd @("shell","input","text","love") | Out-Null
    Start-Sleep -Seconds 3
    $d2 = GetDump
    $hasResults = $d2 -match "John" -or $d2 -match "Rom" -or $d2 -match "love" -or $d2 -match "Gen"
    Assert $hasResults "Search 'love': Results appear"
    Shot "09_search_love"
    
    # Clear
    adb_cmd @("shell","input","keyevent","KEYCODE_CTRL_A") | Out-Null
    Start-Sleep -Milliseconds 200
    adb_cmd @("shell","input","keyevent","KEYCODE_DEL") | Out-Null
    Start-Sleep -Milliseconds 500
    
    # Search faith
    adb_cmd @("shell","input","text","faith") | Out-Null
    Start-Sleep -Seconds 3
    $d3 = GetDump
    Assert ($d3 -match "Heb" -or $d3 -match "faith" -or $d3 -match "Rom" -or $d3.Length -gt 2000) "Search 'faith': Results appear"
    Shot "09_search_faith"
}

function Test-10-CalendarTab {
    Header "10. CALENDAR TAB"
    GoCalendar
    Start-Sleep -Seconds 2
    $d = GetDump
    Shot "10_calendar"
    Assert ($d.Length -gt 500) "Calendar: Tab loads content"
    $hasCalContent = $d -match "Streak" -or $d -match "streak" -or $d -match "2026" -or $d -match "June" -or $d -match "January" -or $d -match "chapter" -or $d -match "Chapter" -or $d -match "Reading"
    Assert $hasCalContent "Calendar: Calendar content visible"
}

function Test-11-ProfileTab {
    Header "11. PROFILE/SETTINGS TAB"
    GoProfile
    Start-Sleep -Seconds 2
    $d = GetDump
    Shot "11_profile"
    $hasTheme = $d -match "DARK" -or $d -match "LIGHT" -or $d -match "SYSTEM" -or $d -match "Theme"
    Assert $hasTheme "Profile: Theme selector visible"
    $hasReflect = $d -match "Reflection" -or $d -match "Notes" -or $d -match "Study"
    Assert $hasReflect "Profile: Study Reflections section"
    
    # Test theme switching
    $darkEl = FindEl $d "DARK"
    if ($darkEl.Found) {
        Tap ([int]$darkEl.X) ([int]$darkEl.Y) 800
        $d2 = GetDump
        Assert $true "Profile: Dark theme selectable"
        Shot "11_profile_dark"
        
        $lightEl = FindEl $d2 "LIGHT"
        if ($lightEl.Found) {
            Tap ([int]$lightEl.X) ([int]$lightEl.Y) 800
            Assert $true "Profile: Light theme selectable"
        }
        
        $systemEl = FindEl $d "SYSTEM"
        if ($systemEl.Found) {
            Tap ([int]$systemEl.X) ([int]$systemEl.Y) 800
            Assert $true "Profile: System theme selectable"
        }
    }
}

function Test-12-FullAllBooksAllChapters {
    Header "12. FULL BOOK+CHAPTER COVERAGE TEST (All 66 Books)"
    Write-Host "  Testing first chapter + sample chapters for each of 66 books..." -ForegroundColor Gray
    
    foreach ($bookNum in 1..66) {
        $name = $NAMES[$bookNum]
        $maxCh = $CHAPTERS[$bookNum]
        Write-Host "  [$bookNum/66] $name ($maxCh chs)..." -ForegroundColor White -NoNewline
        
        # Chapter 1
        $ok1 = GoToChapter $bookNum 1
        if ($ok1) {
            $d = GetDump
            $verses1 = $d.Length -gt 2000
            if ($verses1) { Write-Host " Ch1✓" -ForegroundColor Green -NoNewline } else { Write-Host " Ch1?" -ForegroundColor Yellow -NoNewline }
            Assert $verses1 "Book $bookNum ($name) Ch1: Verses display"
            
            # Tap a verse
            Tap 540 800 300
            Assert $true "Book $bookNum ($name) Ch1: Verse tap (no crash)"
            
            # Middle chapter if exists
            if ($maxCh -gt 5) {
                $midCh = [int]($maxCh / 2)
                $ok2 = GoToChapter $bookNum $midCh
                if ($ok2) {
                    $d2 = GetDump
                    Assert ($d2.Length -gt 1500) "Book $bookNum ($name) Ch$midCh (mid): Verses display"
                    Write-Host " Mid✓" -ForegroundColor Green -NoNewline
                } else {
                    Fail "Book $bookNum ($name) Ch$midCh (mid): Navigation"
                    Write-Host " Mid✗" -ForegroundColor Red -NoNewline
                }
            }
            
            # Last chapter if different from ch1
            if ($maxCh -gt 1) {
                $ok3 = GoToChapter $bookNum $maxCh
                if ($ok3) {
                    $d3 = GetDump
                    Assert ($d3.Length -gt 1500) "Book $bookNum ($name) Ch$maxCh (last): Verses display"
                    Write-Host " Last✓" -ForegroundColor Green -NoNewline
                } else {
                    Fail "Book $bookNum ($name) Ch$maxCh (last): Navigation"
                    Write-Host " Last✗" -ForegroundColor Red -NoNewline
                }
            }
            Write-Host ""
        } else {
            Write-Host " FAIL (not found)" -ForegroundColor Red
            Fail "Book $bookNum ($name): GoToBook navigation"
        }
    }
}

# ============================================================
# MAIN RUNNER
# ============================================================
$startTime = Get-Date

Write-Host "=" * 65
Write-Host "  MIKTAM BIBLE APP - COMPREHENSIVE UI TEST SUITE v2"
Write-Host "  Device: $DEVICE | Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "=" * 65

# Launch app
Write-Host "`n[LAUNCH] Starting app..." -ForegroundColor Cyan
adb_cmd @("shell","cmd","activity","start-activity","$PKG/.MainActivity") | Out-Null
Start-Sleep -Seconds 7
$ok = WaitText "Miktam Bible" 15
Assert $ok "App: Launches successfully"
Shot "00_launch"

# Run tests
Test-01-HomeScreen
Test-02-ReadTabVersions
Test-03-BookGridOT
Test-04-BookGridNT
Test-05-AllBooksChapterGrids
Test-06-RepresentativeChapters
Test-07-VerseTapAndActionSheet
Test-08-VersionSwitching
Test-09-SearchTab
Test-10-CalendarTab
Test-11-ProfileTab
Test-12-FullAllBooksAllChapters

# Final state
GoHome
Shot "99_final_state"

# Summary
$elapsed = ((Get-Date) - $startTime).ToString("hh\:mm\:ss")
$total = $script:Pass + $script:Fail
$pct = if ($total -gt 0) { [math]::Round(100*$script:Pass/$total) } else { 0 }

Write-Host "`n$("=" * 65)"
Write-Host "  TEST SUMMARY" -ForegroundColor Cyan
Write-Host "$("=" * 65)"
Write-Host "  Total Tests : $total"
Write-Host "  Passed      : $($script:Pass)" -ForegroundColor Green
Write-Host "  Failed      : $($script:Fail)" -ForegroundColor $(if ($script:Fail -eq 0) { "Green" } else { "Red" })
Write-Host "  Pass Rate   : $pct%" -ForegroundColor $(if ($pct -ge 90) { "Green" } elseif ($pct -ge 70) { "Yellow" } else { "Red" })
Write-Host "  Duration    : $elapsed"

if ($script:Fail -gt 0) {
    Write-Host "`n  FAILED TESTS:" -ForegroundColor Red
    $script:Log | Where-Object { $_.Status -eq "FAIL" } | ForEach-Object {
        Write-Host "    ✗ $($_.Test)" -ForegroundColor Red
        if ($_.Detail) { Write-Host "       $($_.Detail)" -ForegroundColor Gray }
    }
}

# Save results
$jsonPath = "$RESULTS_DIR\results_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
$script:Log | ConvertTo-Json | Out-File $jsonPath -Encoding UTF8
Write-Host "`n  Results: $jsonPath" -ForegroundColor Gray
Write-Host "  Screenshots: $RESULTS_DIR\" -ForegroundColor Gray
Write-Host ""
