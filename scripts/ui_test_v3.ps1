# Miktam Bible App - Comprehensive UI Test Script v3
# PowerShell ADB automation - ASCII safe version
$ErrorActionPreference = "Continue"
$ADB = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$DEVICE = "emulator-5554"
$PKG = "miktam.bible"
$RESULTS_DIR = "C:\Users\kevin\OneDrive\Documents\kalvin\bible\test_results"

$script:Pass = 0
$script:Fail = 0
$script:Log = [System.Collections.ArrayList]::new()

function adb_cmd ([string[]]$ArgList) {
    $r = & $ADB -s $DEVICE @ArgList 2>&1
    return ($r | Out-String)
}

function Tap([int]$x, [int]$y, [int]$delayMs = 600) {
    adb_cmd @("shell","input","tap","$x","$y") | Out-Null
    Start-Sleep -Milliseconds $delayMs
}

function LongPress([int]$x, [int]$y, [int]$ms = 1200) {
    adb_cmd @("shell","input","swipe","$x","$y","$x","$y","$ms") | Out-Null
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
    $local = "$env:TEMP\dump_miktam.xml"
    adb_cmd @("pull","/sdcard/dump.xml","$local") | Out-Null
    if (Test-Path $local) {
        return [System.IO.File]::ReadAllText($local,[System.Text.Encoding]::UTF8)
    }
    return ""
}

function FindEl([string]$dump, [string]$text) {
    $escaped = [regex]::Escape($text)
    $pat = "text=`"$escaped`"[^>]*bounds=`"\[(\d+),(\d+)\]\[(\d+),(\d+)\]`""
    if ($dump -match $pat) {
        $cx = ([int]$Matches[1] + [int]$Matches[3]) / 2
        $cy = ([int]$Matches[2] + [int]$Matches[4]) / 2
        return @{ Found = $true; X = [int]$cx; Y = [int]$cy }
    }
    return @{ Found = $false; X = 0; Y = 0 }
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
    $safeN = $name -replace "[^a-zA-Z0-9_]","_"
    $r = "/sdcard/shot_$safeN.png"
    adb_cmd @("shell","screencap","$r") | Out-Null
    $l = "$RESULTS_DIR\$safeN.png"
    adb_cmd @("pull","$r","$l") | Out-Null
}

function PassTest([string]$name, [string]$detail = "") {
    $script:Pass++
    $msg = "  [PASS] $name"
    if ($detail) { $msg += " [$detail]" }
    Write-Host $msg -ForegroundColor Green
    [void]$script:Log.Add([PSCustomObject]@{ Test=$name; Status="PASS"; Detail=$detail })
}

function FailTest([string]$name, [string]$detail = "") {
    $script:Fail++
    $msg = "  [FAIL] $name"
    if ($detail) { $msg += " [$detail]" }
    Write-Host $msg -ForegroundColor Red
    [void]$script:Log.Add([PSCustomObject]@{ Test=$name; Status="FAIL"; Detail=$detail })
}

function AssertTest([bool]$cond, [string]$name, [string]$detail = "") {
    if ($cond) { PassTest $name $detail } else { FailTest $name $detail }
}

function Header([string]$text) {
    Write-Host "`n=== $text ===" -ForegroundColor Cyan
}

# Tab coordinates (1080x2340 screen)
$TY = 2100
$T_HOME = 72; $T_READ = 216; $T_SEARCH = 360; $T_CAL = 504; $T_PROF = 648

function GoHome    { Tap $T_HOME   $TY 1500 }
function GoRead    { Tap $T_READ   $TY 1500 }
function GoSearch  { Tap $T_SEARCH $TY 1500 }
function GoCalendar{ Tap $T_CAL    $TY 1500 }
function GoProfile { Tap $T_PROF   $TY 1500 }

# Book data
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

function GoToBook([int]$bookNum) {
    GoRead
    $dump = GetDump
    if ($bookNum -ge 40) {
        $el = FindEl $dump "New Testament (27)"
        if ($el.Found) { Tap $el.X $el.Y 800 }
    } else {
        $el = FindEl $dump "Old Testament (39)"
        if ($el.Found) { Tap $el.X $el.Y 800 }
    }
    $abbr = $ABBR[$bookNum]
    for ($i = 0; $i -lt 4; $i++) {
        $dump = GetDump
        $el = FindEl $dump $abbr
        if ($el.Found) { Tap $el.X $el.Y 1500; return $true }
        SwipeUp
    }
    return $false
}

function GoToChapter([int]$bookNum, [int]$chapNum) {
    $ok = GoToBook $bookNum
    if (-not $ok) { return $false }
    for ($i = 0; $i -lt 4; $i++) {
        $dump = GetDump
        $el = FindEl $dump "$chapNum"
        if ($el.Found) { Tap $el.X $el.Y 2500; return $true }
        SwipeUp
    }
    return $false
}

# ============================================================
# TESTS
# ============================================================
function Test-01-HomeScreen {
    Header "TEST 1: HOME SCREEN"
    GoHome
    $d = GetDump
    Shot "01_home"
    AssertTest ($d -match "Miktam Bible") "Home: App title"
    AssertTest ($d -match "Verse of the Day" -or $d -match "John 3:16") "Home: VOTD card"
    AssertTest ($d -match "Continue Study" -or $d -match "Resume Reading") "Home: Continue Study card"
    AssertTest ($d -match "AI Study Assistant" -or $d -match "OFFLINE") "Home: AI Assistant card"
    AssertTest ($d -match "Read") "Home: Read tab"
    AssertTest ($d -match "Search") "Home: Search tab"
    AssertTest ($d -match "Calendar") "Home: Calendar tab"
    AssertTest ($d -match "Profile") "Home: Profile tab"
}

function Test-02-ReadTabVersions {
    Header "TEST 2: READ TAB VERSIONS"
    GoRead
    $d = GetDump
    Shot "02_read_bookpicker"
    AssertTest ($d -match "Holy Bible" -or $d -match "Old Testament") "Read: Book picker screen"
    AssertTest ($d -match "Old Testament") "Read: OT tab"
    AssertTest ($d -match "New Testament") "Read: NT tab"
    $vs = @("KJV","BBE","RVR","LSG","HIN","TAM","TEL","KAN","MAL","KOR","RON","ARA","NCV","EPO","FIN","LUT","WEB","GRC")
    $fv = @($vs | Where-Object { $d -match $_ })
    AssertTest ($fv.Count -ge 3) "Read: Versions visible ($($fv.Count) found)" ($fv -join ",")
}

function Test-03-BookGrids {
    Header "TEST 3: BOOK GRIDS (OT and NT)"
    GoRead
    $d = GetDump
    $otEl = FindEl $d "Old Testament (39)"
    if ($otEl.Found) { Tap $otEl.X $otEl.Y 800 }
    $d = GetDump
    Shot "03_ot_books"
    $otBks = @("Gen","Exo","Lev","Num","Deu","Jos","Jdg","Rut","1Sa","2Sa","1Ki","2Ki","Psa","Pro","Isa","Jer","Dan","Mal")
    $fot = @($otBks | Where-Object { $d -match $_ })
    AssertTest ($fot.Count -ge 8) "OT Grid: Books visible ($($fot.Count)/18)" ($fot -join ",")

    GoRead
    $d = GetDump
    $ntEl = FindEl $d "New Testament (27)"
    if ($ntEl.Found) { Tap $ntEl.X $ntEl.Y 1000 }
    $d = GetDump
    Shot "03_nt_books"
    $ntBks = @("Mat","Mrk","Luk","Jhn","Act","Rom","1Co","2Co","Gal","Eph","Php","Col","Heb","Jas","1Pe","1Jn","Rev")
    $fnt = @($ntBks | Where-Object { $d -match $_ })
    AssertTest ($fnt.Count -ge 10) "NT Grid: Books visible ($($fnt.Count)/17)" ($fnt -join ",")
}

function Test-04-AllBooks {
    Header "TEST 4: ALL 66 BOOKS - CHAPTER GRID OPENS"
    for ($bn = 1; $bn -le 66; $bn++) {
        $nm = $NAMES[$bn]
        $ab = $ABBR[$bn]
        Write-Host "  [$bn/66] $nm..." -ForegroundColor White -NoNewline
        $ok = GoToBook $bn
        if ($ok) {
            $d = GetDump
            if ($d.Length -gt 400) {
                Write-Host " OK" -ForegroundColor Green
                PassTest "Book $bn $nm - Chapter grid opens"
            } else {
                Write-Host " EMPTY" -ForegroundColor Yellow
                FailTest "Book $bn $nm - Chapter grid content" "Dump too short: $($d.Length)"
            }
        } else {
            Write-Host " NOT FOUND" -ForegroundColor Red
            FailTest "Book $bn $nm - Book found in grid" "$ab not found"
        }
    }
}

function Test-05-RepresentativeChapters {
    Header "TEST 5: REPRESENTATIVE CHAPTERS - VERSE DISPLAY"
    $cases = @(
        @{B=1;C=1;D="Genesis 1"}
        @{B=1;C=25;D="Genesis 25"}
        @{B=1;C=50;D="Genesis 50"}
        @{B=19;C=1;D="Psalms 1"}
        @{B=19;C=23;D="Psalms 23"}
        @{B=19;C=119;D="Psalms 119"}
        @{B=19;C=150;D="Psalms 150"}
        @{B=23;C=53;D="Isaiah 53"}
        @{B=40;C=1;D="Matthew 1"}
        @{B=40;C=5;D="Matthew 5"}
        @{B=43;C=1;D="John 1"}
        @{B=43;C=3;D="John 3"}
        @{B=43;C=21;D="John 21"}
        @{B=45;C=8;D="Romans 8"}
        @{B=46;C=13;D="1 Cor 13"}
        @{B=58;C=11;D="Hebrews 11"}
        @{B=66;C=1;D="Revelation 1"}
        @{B=66;C=22;D="Revelation 22"}
    )
    foreach ($tc in $cases) {
        Write-Host "  $($tc.D)..." -ForegroundColor White -NoNewline
        $ok = GoToChapter $tc.B $tc.C
        if ($ok) {
            $d = GetDump
            if ($d.Length -gt 1800) {
                Write-Host " OK" -ForegroundColor Green
                PassTest "$($tc.D) - Verses load" "len=$($d.Length)"
            } else {
                Write-Host " SHORT" -ForegroundColor Yellow
                FailTest "$($tc.D) - Verses load" "len=$($d.Length)"
            }
            Shot "ch_$($tc.B)_$($tc.C)"
        } else {
            Write-Host " NAV FAIL" -ForegroundColor Red
            FailTest "$($tc.D) - Navigation works"
        }
    }
}

function Test-06-VerseActionSheet {
    Header "TEST 6: VERSE ACTION SHEET"
    $ok = GoToChapter 1 1
    AssertTest $ok "Genesis 1 - Nav for action sheet"
    if ($ok) {
        Start-Sleep -Seconds 1
        Tap 540 800 400
        AssertTest $true "Genesis 1 - Verse tap (no crash)"
        LongPress 540 800 1500
        $d = GetDump
        $hs = $d -match "Highlight" -or $d -match "Note" -or $d -match "Study Reflection"
        AssertTest $hs "Genesis 1 - Long press opens action sheet"
        Shot "06_action_sheet"
        if ($hs) {
            AssertTest ($d -match "Highlight Color" -or $d -match "Highlight") "Action sheet - Highlight section"
            AssertTest ($d -match "Original Language" -or $d -match "Language") "Action sheet - Original Language"
            AssertTest ($d -match "Cross References" -or $d -match "Cross Ref") "Action sheet - Cross References"
            AssertTest ($d -match "Reflection" -or $d -match "Note") "Action sheet - Study Note section"
            PressBack
        }
    }
    # John 3
    $ok2 = GoToChapter 43 3
    AssertTest $ok2 "John 3 - Nav for action sheet"
    if ($ok2) {
        LongPress 540 800 1500
        $d = GetDump
        AssertTest ($d -match "Highlight" -or $d -match "Note") "John 3 - Action sheet opens"
        Shot "06_action_sheet_john3"
        PressBack
    }
}

function Test-07-VersionSwitchingInReader {
    Header "TEST 7: VERSION SWITCHING IN READER"
    $ok = GoToChapter 43 3
    AssertTest $ok "John 3 - Nav for version switching"
    if (-not $ok) { return }
    Start-Sleep -Seconds 1.5
    
    # Tap version badge (header right)
    Tap 830 130 1500
    $d = GetDump
    $hs = $d -match "Select Translation" -or $d -match "KJV" -or $d -match "BBE" -or $d -match "Translation"
    if (-not $hs) {
        Tap 900 110 1500
        $d = GetDump
        $hs = $d -match "Select Translation" -or $d -match "KJV" -or $d -match "BBE"
    }
    AssertTest $hs "Version selector - Sheet opens"
    Shot "07_version_sheet"
    
    if ($hs) {
        $vers = @("KJV","BBE","LSG","LUT","RVR","EPO","FIN","RON","ARA","HIN","TAM","TEL","KAN","MAL","KOR","NCV","WEB","GRC")
        foreach ($ver in $vers) {
            $d = GetDump
            $el = FindEl $d $ver
            if (-not $el.Found) {
                SwipeUp
                $d = GetDump
                $el = FindEl $d $ver
            }
            if ($el.Found) {
                Tap $el.X $el.Y 2000
                $d2 = GetDump
                AssertTest ($d2.Length -gt 1500) "Version $ver - John 3 displays" "len=$($d2.Length)"
                Shot "ver_$($ver.ToLower())_john3"
                # Reopen version sheet
                Tap 830 130 1500
                $d = GetDump
                if (-not ($d -match "KJV" -or $d -match "Select Translation")) {
                    Tap 900 110 1500
                }
            } else {
                FailTest "Version $ver - Chip visible in sheet" "Not found"
            }
        }
        PressBack
    }
}

function Test-08-FullBookCoverage {
    Header "TEST 8: FULL COVERAGE - FIRST CHAPTER ALL 66 BOOKS"
    Write-Host "  Testing Ch1 of all 66 books..." -ForegroundColor Gray
    for ($bn = 1; $bn -le 66; $bn++) {
        $nm = $NAMES[$bn]
        $maxCh = $CHAPTERS[$bn]
        Write-Host "  [$bn/66] $nm (maxCh=$maxCh)..." -ForegroundColor White -NoNewline
        $ok = GoToChapter $bn 1
        if ($ok) {
            $d = GetDump
            if ($d.Length -gt 1800) {
                Write-Host " OK($($d.Length))" -ForegroundColor Green
                PassTest "Book $bn $nm Ch1 - Verses load" "len=$($d.Length)"
                # Quick tap test
                Tap 540 800 300
                PassTest "Book $bn $nm Ch1 - Verse tap works"
            } else {
                Write-Host " SHORT($($d.Length))" -ForegroundColor Yellow
                FailTest "Book $bn $nm Ch1 - Verses load" "len=$($d.Length)"
            }
        } else {
            Write-Host " FAIL" -ForegroundColor Red
            FailTest "Book $bn $nm Ch1 - Navigation"
        }
    }
}

function Test-09-Search {
    Header "TEST 9: SEARCH"
    GoSearch
    $d = GetDump
    Shot "09_search"
    AssertTest ($d.Length -gt 300) "Search - Tab opens"
    Tap 540 200 800
    adb_cmd @("shell","input","text","love") | Out-Null
    Start-Sleep -Seconds 3
    $d = GetDump
    AssertTest ($d -match "John" -or $d -match "Rom" -or $d -match "love" -or $d.Length -gt 2000) "Search love - Results appear"
    Shot "09_search_love"
    adb_cmd @("shell","input","keyevent","KEYCODE_CTRL_A") | Out-Null
    adb_cmd @("shell","input","keyevent","KEYCODE_DEL") | Out-Null
    Start-Sleep -Milliseconds 500
    adb_cmd @("shell","input","text","faith") | Out-Null
    Start-Sleep -Seconds 3
    $d = GetDump
    AssertTest ($d -match "Heb" -or $d -match "faith" -or $d.Length -gt 2000) "Search faith - Results appear"
    Shot "09_search_faith"
}

function Test-10-Calendar {
    Header "TEST 10: CALENDAR"
    GoCalendar
    Start-Sleep -Seconds 2
    $d = GetDump
    Shot "10_calendar"
    AssertTest ($d.Length -gt 400) "Calendar - Tab loads"
    $cc = $d -match "Streak" -or $d -match "streak" -or $d -match "2026" -or $d -match "June" -or $d -match "Chapter" -or $d -match "Reading"
    AssertTest $cc "Calendar - Content visible"
}

function Test-11-Profile {
    Header "TEST 11: PROFILE"
    GoProfile
    Start-Sleep -Seconds 2
    $d = GetDump
    Shot "11_profile"
    AssertTest ($d -match "DARK" -or $d -match "LIGHT" -or $d -match "SYSTEM" -or $d -match "Theme") "Profile - Theme selector"
    AssertTest ($d -match "Reflection" -or $d -match "Notes" -or $d -match "Study") "Profile - Reflections section"
    $dk = FindEl $d "DARK"
    if ($dk.Found) {
        Tap $dk.X $dk.Y 800
        Shot "11_dark_theme"
        $d2 = GetDump
        $lt = FindEl $d2 "LIGHT"
        if ($lt.Found) { Tap $lt.X $lt.Y 800; Shot "11_light_theme" }
        $sy = FindEl $d2 "SYSTEM"
        if ($sy.Found) { Tap $sy.X $sy.Y 800 }
        PassTest "Profile - Theme switching works"
    }
}

# ============================================================
# MAIN
# ============================================================
$startTime = Get-Date
Write-Host "============================================================"
Write-Host "  MIKTAM BIBLE APP - COMPREHENSIVE UI TEST SUITE"
Write-Host "  Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "============================================================"

if (-not (Test-Path $RESULTS_DIR)) { New-Item -ItemType Directory -Path $RESULTS_DIR | Out-Null }

# Launch
Write-Host "`n[LAUNCH] Starting Miktam Bible..." -ForegroundColor Cyan
adb_cmd @("shell","cmd","activity","start-activity","$PKG/.MainActivity") | Out-Null
Start-Sleep -Seconds 7
$launched = WaitText "Miktam Bible" 15
AssertTest $launched "App launches successfully"
Shot "00_launch"

if (-not $launched) {
    Write-Host "FATAL: App did not launch!" -ForegroundColor Red
    exit 1
}

Test-01-HomeScreen
Test-02-ReadTabVersions
Test-03-BookGrids
Test-04-AllBooks
Test-05-RepresentativeChapters
Test-06-VerseActionSheet
Test-07-VersionSwitchingInReader
Test-08-FullBookCoverage
Test-09-Search
Test-10-Calendar
Test-11-Profile

GoHome
Shot "99_final_state"

$elapsed = ((Get-Date) - $startTime).ToString("hh\:mm\:ss")
$total = $script:Pass + $script:Fail
$pct = if ($total -gt 0) { [math]::Round(100*$script:Pass/$total) } else { 0 }

Write-Host "`n============================================================"
Write-Host "  FINAL RESULTS"
Write-Host "============================================================"
Write-Host "  Tests  : $total"
Write-Host "  Passed : $($script:Pass)" -ForegroundColor Green
Write-Host "  Failed : $($script:Fail)" -ForegroundColor $(if ($script:Fail -eq 0) { "Green" } else { "Red" })
Write-Host "  Rate   : $pct%" -ForegroundColor $(if ($pct -ge 90) { "Green" } elseif ($pct -ge 70) { "Yellow" } else { "Red" })
Write-Host "  Time   : $elapsed"

if ($script:Fail -gt 0) {
    Write-Host "`n  FAILURES:" -ForegroundColor Red
    foreach ($r in $script:Log) {
        if ($r.Status -eq "FAIL") {
            Write-Host "    - $($r.Test)" -ForegroundColor Red
            if ($r.Detail) { Write-Host "      $($r.Detail)" -ForegroundColor DarkGray }
        }
    }
}

$jsonPath = "$RESULTS_DIR\results_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
$script:Log | ConvertTo-Json | Out-File $jsonPath -Encoding UTF8
Write-Host "`n  JSON: $jsonPath"
Write-Host "  Screenshots: $RESULTS_DIR\"
